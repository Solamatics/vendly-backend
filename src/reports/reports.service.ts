import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getMonthlyReport(businessId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    // Get or compute summary
    let summary = await this.prisma.monthlySummary.findUnique({
      where: { year_month_businessId: { year, month, businessId } },
    });

    if (!summary) {
      const [sales, expenses] = await Promise.all([
        this.prisma.sale.aggregate({
          where: { businessId, date: { gte: start, lt: end } },
          _sum: { total: true, costPrice: true },
          _count: true,
        }),
        this.prisma.expense.aggregate({
          where: { businessId, date: { gte: start, lt: end } },
          _sum: { amount: true },
        }),
      ]);

      const totalRevenue = sales._sum.total ?? 0;
      const totalExpense = expenses._sum.amount ?? 0;
      const grossProfit = totalRevenue - (sales._sum.costPrice ?? 0);

      summary = {
        id: 'computed',
        year,
        month,
        businessId,
        totalRevenue,
        totalExpense,
        netProfit: totalRevenue - totalExpense,
        grossProfit,
        totalSales: sales._count,
        updatedAt: new Date(),
      };
    }

    // Sales breakdown by product
    const salesByProduct = await this.prisma.sale.groupBy({
      by: ['productId'],
      where: { businessId, date: { gte: start, lt: end } },
      _sum: { total: true, quantity: true },
    });

    const productIds = salesByProduct.map((s) => s.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const salesByProductFormatted = salesByProduct.map((s) => ({
      productName:
        products.find((p) => p.id === s.productId)?.name ?? 'Unknown',
      total: s._sum.total ?? 0,
      quantity: s._sum.quantity ?? 0,
    }));

    // Expenses breakdown by category
    const expensesByCategory = await this.prisma.expense.groupBy({
      by: ['category'],
      where: { businessId, date: { gte: start, lt: end } },
      _sum: { amount: true },
    });

    // Outstanding debts
    const outstandingDebts = await this.prisma.sale.aggregate({
      where: {
        businessId,
        paymentStatus: { in: ['CREDIT', 'PARTIAL'] },
      },
      _sum: { balance: true },
      _count: true,
    });

    // Last 6 months trend
    const months: { year: number; month: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }

    const last6Months = await Promise.all(
      months.map(async ({ year: y, month: m }) => {
        const existing = await this.prisma.monthlySummary.findUnique({
          where: { year_month_businessId: { year: y, month: m, businessId } },
        });

        if (existing) return existing;

        const s = new Date(y, m - 1, 1);
        const e = new Date(y, m, 1);

        const [sl, ex] = await Promise.all([
          this.prisma.sale.aggregate({
            where: { businessId, date: { gte: s, lt: e } },
            _sum: { total: true },
            _count: true,
          }),
          this.prisma.expense.aggregate({
            where: { businessId, date: { gte: s, lt: e } },
            _sum: { amount: true },
          }),
        ]);

        const rev = sl._sum.total ?? 0;
        const exp = ex._sum.amount ?? 0;

        return {
          id: `computed-${y}-${m}`,
          year: y,
          month: m,
          businessId,
          totalRevenue: rev,
          totalExpense: exp,
          netProfit: rev - exp,
          grossProfit: 0,
          totalSales: sl._count,
          updatedAt: new Date(),
        };
      }),
    );

    return {
      summary,
      salesByProduct: salesByProductFormatted,
      expensesByCategory: expensesByCategory.map((e) => ({
        category: e.category,
        total: e._sum.amount ?? 0,
      })),
      outstandingDebts: {
        total: outstandingDebts._sum.balance ?? 0,
        count: outstandingDebts._count,
      },
      last6Months,
    };
  }

  async getWeeklyReport(businessId: string) {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfWeek.getDate() - 7);

    const endOfLastWeek = new Date(startOfWeek);

    const [thisWeek, lastWeek] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { businessId, date: { gte: startOfWeek, lt: now } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.sale.aggregate({
        where: {
          businessId,
          date: { gte: startOfLastWeek, lt: endOfLastWeek },
        },
        _sum: { total: true },
        _count: true,
      }),
    ]);

    const thisWeekExpenses = await this.prisma.expense.aggregate({
      where: { businessId, date: { gte: startOfWeek, lt: now } },
      _sum: { amount: true },
    });

    const topProduct = await this.prisma.sale.groupBy({
      by: ['productId'],
      where: { businessId, date: { gte: startOfWeek, lt: now } },
      _sum: { total: true, quantity: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 1,
    });

    let topProductName = 'N/A';
    if (topProduct.length > 0) {
      const product = await this.prisma.product.findUnique({
        where: { id: topProduct[0].productId },
      });
      topProductName = product?.name ?? 'N/A';
    }

    const thisWeekRevenue = thisWeek._sum.total ?? 0;
    const lastWeekRevenue = lastWeek._sum.total ?? 0;
    const revenueChange =
      lastWeekRevenue > 0
        ? Math.round(
            ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100,
          )
        : null;

    return {
      thisWeek: {
        revenue: thisWeekRevenue,
        sales: thisWeek._count,
        expenses: thisWeekExpenses._sum.amount ?? 0,
        netProfit: thisWeekRevenue - (thisWeekExpenses._sum.amount ?? 0),
      },
      lastWeek: {
        revenue: lastWeekRevenue,
        sales: lastWeek._count,
      },
      revenueChange,
      topProduct: topProductName,
    };
  }

  async getDashboard(businessId: string) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const prevDate = new Date(year, month - 2, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth() + 1;

    const [current, previous, products, recentSales] = await Promise.all([
      this.prisma.monthlySummary.findUnique({
        where: { year_month_businessId: { year, month, businessId } },
      }),
      this.prisma.monthlySummary.findUnique({
        where: {
          year_month_businessId: {
            year: prevYear,
            month: prevMonth,
            businessId,
          },
        },
      }),
      this.prisma.product.findMany({
        where: { businessId },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.sale.findMany({
        where: { businessId },
        take: 5,
        orderBy: { date: 'desc' },
        include: { product: true, customer: true },
      }),
    ]);

    const lowStock = products.filter((p) => p.currentStock <= p.lowStockAlert);

    const outstandingDebts = await this.prisma.sale.aggregate({
      where: {
        businessId,
        paymentStatus: { in: ['CREDIT', 'PARTIAL'] },
      },
      _sum: { balance: true },
      _count: true,
    });

    return {
      currentMonth: current ?? {
        totalRevenue: 0,
        totalExpense: 0,
        netProfit: 0,
        grossProfit: 0,
        totalSales: 0,
      },
      previousMonth: previous ?? null,
      recentSales,
      lowStock,
      outstandingDebts: {
        total: outstandingDebts._sum.balance ?? 0,
        count: outstandingDebts._count,
      },
    };
  }
}
