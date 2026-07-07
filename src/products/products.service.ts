import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto';

const FREE_PRODUCT_LIMIT = 4;

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(businessId: string, dto: CreateProductDto) {
    // Check free tier product limit
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: { _count: { select: { products: true } } },
    });

    if (!business) throw new NotFoundException('Business not found');

    if (
      business.plan === 'FREE' &&
      business._count.products >= FREE_PRODUCT_LIMIT
    ) {
      throw new ForbiddenException(
        `Free plan is limited to ${FREE_PRODUCT_LIMIT} products. Upgrade to add more.`,
      );
    }

    // Check duplicate name within business
    const existing = await this.prisma.product.findUnique({
      where: { name_businessId: { name: dto.name, businessId } },
    });

    if (existing) {
      throw new BadRequestException(
        `A product named "${dto.name}" already exists`,
      );
    }

    const product = await this.prisma.product.create({
      data: {
        ...dto,
        businessId,
      },
    });

    return product;
  }

  async findAll(businessId: string) {
    const products = await this.prisma.product.findMany({
      where: { businessId },
      orderBy: { createdAt: 'asc' },
    });

    return products;
  }

  async findOne(businessId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, businessId },
      include: {
        stockMovements: {
          orderBy: { date: 'desc' },
          take: 20,
        },
      },
    });

    if (!product) throw new NotFoundException('Product not found');

    return product;
  }

  async update(businessId: string, id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findFirst({
      where: { id, businessId },
    });

    if (!product) throw new NotFoundException('Product not found');

    // Check duplicate name if name is being changed
    if (dto.name && dto.name !== product.name) {
      const existing = await this.prisma.product.findUnique({
        where: { name_businessId: { name: dto.name, businessId } },
      });

      if (existing) {
        throw new BadRequestException(
          `A product named "${dto.name}" already exists`,
        );
      }
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: dto,
    });

    return updated;
  }

  async remove(businessId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, businessId },
    });

    if (!product) throw new NotFoundException('Product not found');

    await this.prisma.product.delete({ where: { id } });

    return { message: 'Product deleted successfully' };
  }

  async updateStock(
    businessId: string,
    id: string,
    action: 'add' | 'set',
    quantity: number,
    note?: string,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id, businessId },
    });

    if (!product) throw new NotFoundException('Product not found');

    const newStock =
      action === 'add' ? product.currentStock + quantity : quantity;

    const stockDelta = newStock - product.currentStock;

    const [updated] = await this.prisma.$transaction([
      this.prisma.product.update({
        where: { id },
        data: { currentStock: newStock },
      }),
      this.prisma.stockMovement.create({
        data: {
          productId: id,
          businessId,
          type: 'RESTOCK',
          quantity: stockDelta,
          note: note ?? 'Stock updated',
        },
      }),
    ]);

    return updated;
  }
}
