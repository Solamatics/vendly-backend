import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async create(businessId: string, dto: CreateExpenseDto) {
    const expenseDate = new Date(dto.date);
    const year = expenseDate.getFullYear();
    const month = expenseDate.getMonth() + 1;

    const expense = await this.prisma.expense.create({
      data: { ...dto, businessId, date: expenseDate },
    });

    // Update monthly summary
    await this.prisma.monthlySummary.upsert({
      where: { year_month_businessId: { year, month, businessId } },
      create: {
        year,
        month,
        businessId,
        totalRevenue: 0,
        totalExpense: dto.amount,
        netProfit: -dto.amount,
        grossProfit: 0,
        totalSales: 0,
      },
      update: {
        totalExpense: { increment: dto.amount },
        netProfit: { decrement: dto.amount },
      },
    });

    return expense;
  }

  async findAll(
    businessId: string,
    filters: { category?: string; month?: string },
  ) {
    const where: Record<string, unknown> = { businessId };

    if (filters.category) where.category = filters.category;
    if (filters.month) {
      const [y, m] = filters.month.split('-').map(Number);
      where.date = {
        gte: new Date(y, m - 1, 1),
        lt: new Date(y, m, 1),
      };
    }

    return this.prisma.expense.findMany({
      where,
      include: { supplier: true },
      orderBy: { date: 'desc' },
    });
  }

  async remove(businessId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, businessId },
    });

    if (!expense) throw new NotFoundException('Expense not found');

    const expenseDate = new Date(expense.date);
    const year = expenseDate.getFullYear();
    const month = expenseDate.getMonth() + 1;

    await this.prisma.expense.delete({ where: { id } });

    await this.prisma.monthlySummary.update({
      where: { year_month_businessId: { year, month, businessId } },
      data: {
        totalExpense: { decrement: expense.amount },
        netProfit: { increment: expense.amount },
      },
    });

    return { message: 'Expense deleted successfully' };
  }
}
