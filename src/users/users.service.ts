import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InviteUserDto, AcceptInviteDto, UpdateRoleDto } from './dto';
import { Role } from '../../generated/prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async inviteUser(businessId: string, dto: InviteUserDto) {
    // Check if user already exists in this business
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email, businessId },
    });

    if (existing) {
      throw new BadRequestException('User already exists in this business');
    }

    // Check free tier limit — max 1 user on free plan
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: { _count: { select: { users: true } } },
    });

    if (!business) throw new NotFoundException('Business not found');

    if (business.plan === 'FREE' && business._count.users >= 1) {
      throw new ForbiddenException(
        'Free plan is limited to 1 user. Upgrade to invite team members.',
      );
    }

    // Generate a secure random invite token
    const inviteToken = crypto.randomBytes(32).toString('hex');

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        role: dto.role,
        businessId,
        inviteToken,
        inviteAccepted: false,
      },
    });

    // In production you would send an email here with the invite link
    // e.g. https://vendly.app/accept-invite?token=${inviteToken}
    // For now we return the token directly so we can test it

    return {
      message: `Invite sent to ${dto.email}`,
      inviteToken, // remove this in production
      userId: user.id,
    };
  }

  async acceptInvite(dto: AcceptInviteDto) {
    // Find user by invite token
    const user = await this.prisma.user.findUnique({
      where: { inviteToken: dto.token },
    });

    if (!user) {
      throw new NotFoundException('Invalid or expired invite token');
    }

    if (user.inviteAccepted) {
      throw new BadRequestException('Invite already accepted');
    }

    // Hash password with argon2
    const argon = await import('argon2');
    const hashedPassword: string = await argon.hash(dto.password);

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        name: dto.name,
        password: hashedPassword,
        inviteToken: null,
        inviteAccepted: true,
      },
    });

    return {
      message: 'Invite accepted. You can now log in.',
      email: updated.email,
    };
  }

  async getUsers(businessId: string) {
    const users = await this.prisma.user.findMany({
      where: { businessId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        inviteAccepted: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return users;
  }

  async updateRole(businessId: string, userId: string, dto: UpdateRoleDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, businessId },
    });

    if (!user) throw new NotFoundException('User not found');

    // Prevent changing your own role
    if (user.role === Role.ADMIN && dto.role !== Role.ADMIN) {
      const adminCount = await this.prisma.user.count({
        where: { businessId, role: Role.ADMIN },
      });

      if (adminCount <= 1) {
        throw new BadRequestException(
          'Cannot remove the only admin from the business',
        );
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role: dto.role },
      select: { id: true, email: true, role: true },
    });

    return updated;
  }

  async removeUser(
    businessId: string,
    userId: string,
    requestingUserId: string,
  ) {
    if (userId === requestingUserId) {
      throw new BadRequestException('You cannot remove yourself');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, businessId },
    });

    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.delete({ where: { id: userId } });

    return { message: 'User removed successfully' };
  }
}
