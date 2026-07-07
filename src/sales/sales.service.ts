import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto';
import { PaymentStatus } from '../../generated/prisma/client';

const FREE_SALES_LIMIT = 10;

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async create(businessId: string, userId: string, dto: CreateSaleDto) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: { _count: { select: { sales: true } } },
    });

    if (!business) throw new NotFoundException('Business not found');

    // Free tier limit — 10 lifetime sales
    if (business.plan === 'FREE' && business._count.sales >= FREE_SALES_LIMIT) {
      throw new ForbiddenException(
        `You have reached the ${FREE_SALES_LIMIT} sales limit on the free plan. Upgrade to continue recording sales.`,
      );
    }

    // Validate product belongs to this business
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, businessId },
    });

    if (!product) throw new NotFoundException('Product not found');

    // Check sufficient stock
    if (product.currentStock < dto.quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${product.currentStock}, Requested: ${dto.quantity}`,
      );
    }

    const total = dto.quantity * dto.unitPrice;
    const amountPaid = dto.amountPaid ?? total;
    const balance = total - amountPaid;

    // Determine payment status
    let paymentStatus: PaymentStatus = PaymentStatus.PAID;
    if (balance > 0 && amountPaid === 0) {
      paymentStatus = PaymentStatus.CREDIT;
    } else if (balance > 0 && amountPaid > 0) {
      paymentStatus = PaymentStatus.PARTIAL;
    }

    const saleDate = new Date(dto.date);
    const year = saleDate.getFullYear();
    const month = saleDate.getMonth() + 1;
    const grossProfit = (dto.unitPrice - product.costPrice) * dto.quantity;

    // Run everything in a transaction
    const [sale] = await this.prisma.$transaction([
      // Create the sale
      this.prisma.sale.create({
        data: {
          productId: dto.productId,
          customerId: dto.customerId,
          userId,
          businessId,
          branchId: dto.branchId,
          quantity: dto.quantity,
          unitPrice: dto.unitPrice,
          costPrice: product.costPrice,
          total,
          amountPaid,
          balance,
          paymentStatus,
          note: dto.note,
          date: saleDate,
        },
        include: {
          product: true,
          customer: true,
        },
      }),
      // Deduct stock
      this.prisma.product.update({
        where: { id: dto.productId },
        data: { currentStock: { decrement: dto.quantity } },
      }),
      // Log stock movement
      this.prisma.stockMovement.create({
        data: {
          productId: dto.productId,
          businessId,
          type: 'SALE',
          quantity: -dto.quantity,
          note: `Sale recorded`,
          date: saleDate,
        },
      }),
    ]);

    // Update customer total spent if customer provided
    if (dto.customerId && paymentStatus === PaymentStatus.PAID) {
      await this.prisma.customer.update({
        where: { id: dto.customerId },
        data: { totalSpent: { increment: total } },
      });
    }

    // Upsert monthly summary
    await this.prisma.monthlySummary.upsert({
      where: { year_month_businessId: { year, month, businessId } },
      create: {
        year,
        month,
        businessId,
        totalRevenue: total,
        totalExpense: 0,
        netProfit: total,
        grossProfit,
        totalSales: 1,
      },
      update: {
        totalRevenue: { increment: total },
        netProfit: { increment: total },
        grossProfit: { increment: grossProfit },
        totalSales: { increment: 1 },
      },
    });

    return sale;
  }

  async findAll(
    businessId: string,
    filters: { productId?: string; month?: string; paymentStatus?: string },
  ) {
    const where: Record<string, unknown> = { businessId };

    if (filters.productId) where.productId = filters.productId;
    if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;
    if (filters.month) {
      const [y, m] = filters.month.split('-').map(Number);
      where.date = {
        gte: new Date(y, m - 1, 1),
        lt: new Date(y, m, 1),
      };
    }

    const sales = await this.prisma.sale.findMany({
      where,
      include: { product: true, customer: true },
      orderBy: { date: 'desc' },
    });

    return sales;
  }

  async findOne(businessId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, businessId },
      include: { product: true, customer: true, debtPayments: true },
    });

    if (!sale) throw new NotFoundException('Sale not found');
    return sale;
  }

  async delete(businessId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, businessId },
    });

    if (!sale) throw new NotFoundException('Sale not found');

    const saleDate = new Date(sale.date);
    const year = saleDate.getFullYear();
    const month = saleDate.getMonth() + 1;
    const grossProfit = (sale.unitPrice - sale.costPrice) * sale.quantity;

    await this.prisma.$transaction([
      this.prisma.sale.delete({ where: { id } }),
      // Restore stock
      this.prisma.product.update({
        where: { id: sale.productId },
        data: { currentStock: { increment: sale.quantity } },
      }),
      // Log stock movement
      this.prisma.stockMovement.create({
        data: {
          productId: sale.productId,
          businessId,
          type: 'ADJUSTMENT',
          quantity: sale.quantity,
          note: 'Sale deleted — stock restored',
        },
      }),
    ]);

    // Reverse monthly summary
    await this.prisma.monthlySummary.update({
      where: { year_month_businessId: { year, month, businessId } },
      data: {
        totalRevenue: { decrement: sale.total },
        netProfit: { decrement: sale.total },
        grossProfit: { decrement: grossProfit },
        totalSales: { decrement: 1 },
      },
    });

    return { message: 'Sale deleted and stock restored' };
  }
}
