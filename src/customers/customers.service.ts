import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto, DebtPaymentDto } from './dto';
import { PaymentStatus } from '../../generated/prisma/client';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(businessId: string, dto: CreateCustomerDto) {
    const customer = await this.prisma.customer.create({
      data: { ...dto, businessId },
    });
    return customer;
  }

  async findAll(businessId: string) {
    const customers = await this.prisma.customer.findMany({
      where: { businessId },
      include: {
        _count: { select: { sales: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return customers;
  }

  async findOne(businessId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, businessId },
      include: {
        sales: {
          include: { product: true },
          orderBy: { date: 'desc' },
        },
        debtPayments: {
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!customer) throw new NotFoundException('Customer not found');

    // Calculate outstanding debt
    const outstandingDebt = customer.sales
      .filter((s) => s.paymentStatus !== PaymentStatus.PAID)
      .reduce((sum, s) => sum + s.balance, 0);

    return { ...customer, outstandingDebt };
  }

  async update(businessId: string, id: string, dto: UpdateCustomerDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, businessId },
    });

    if (!customer) throw new NotFoundException('Customer not found');

    return this.prisma.customer.update({
      where: { id },
      data: dto,
    });
  }

  async remove(businessId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, businessId },
    });

    if (!customer) throw new NotFoundException('Customer not found');

    await this.prisma.customer.delete({ where: { id } });
    return { message: 'Customer deleted successfully' };
  }

  async recordDebtPayment(
    businessId: string,
    customerId: string,
    dto: DebtPaymentDto,
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, businessId },
    });

    if (!customer) throw new NotFoundException('Customer not found');

    const sale = await this.prisma.sale.findFirst({
      where: { id: dto.saleId, businessId },
    });

    if (!sale) throw new NotFoundException('Sale not found');

    if (sale.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('This sale is already fully paid');
    }

    if (dto.amount > sale.balance) {
      throw new BadRequestException(
        `Payment amount exceeds balance. Outstanding: ₦${sale.balance}`,
      );
    }

    const newBalance = sale.balance - dto.amount;
    const newAmountPaid = sale.amountPaid + dto.amount;
    const newStatus =
      newBalance === 0 ? PaymentStatus.PAID : PaymentStatus.PARTIAL;

    await this.prisma.$transaction([
      // Record the payment
      this.prisma.debtPayment.create({
        data: {
          saleId: dto.saleId,
          customerId,
          amount: dto.amount,
          note: dto.note,
        },
      }),
      // Update the sale balance
      this.prisma.sale.update({
        where: { id: dto.saleId },
        data: {
          balance: newBalance,
          amountPaid: newAmountPaid,
          paymentStatus: newStatus,
        },
      }),
      // Update customer total spent
      this.prisma.customer.update({
        where: { id: customerId },
        data: { totalSpent: { increment: dto.amount } },
      }),
    ]);

    return {
      message: 'Payment recorded successfully',
      remainingBalance: newBalance,
      paymentStatus: newStatus,
    };
  }

  async getDebtors(businessId: string) {
    const sales = await this.prisma.sale.findMany({
      where: {
        businessId,
        paymentStatus: { in: [PaymentStatus.CREDIT, PaymentStatus.PARTIAL] },
      },
      include: { customer: true, product: true },
      orderBy: { date: 'desc' },
    });

    return sales;
  }
}
