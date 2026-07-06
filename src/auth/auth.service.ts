import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto';
import { Role } from '../../generated/prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already in use');
    }

    // Hash the password
    const hashedPassword: string = await argon.hash(dto.password);

    // Create the business and admin user in one transaction
    const business = await this.prisma.business.create({
      data: {
        name: dto.businessName,
        email: dto.email,
        phone: dto.phone,
        users: {
          create: {
            email: dto.email,
            password: hashedPassword,
            role: Role.ADMIN,
            inviteAccepted: true,
          },
        },
      },
      include: {
        users: true,
      },
    });

    const user = business.users[0];

    // Generate tokens
    const tokens = await this.generateTokens(user.id, business.id, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        businessId: business.id,
        businessName: business.name,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { business: true },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const passwordMatch = await argon.verify(user.password, dto.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(
      user.id,
      user.businessId,
      user.role,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        businessId: user.businessId,
        businessName: user.business.name,
      },
      ...tokens,
    };
  }

  private async generateTokens(
    userId: string,
    businessId: string,
    role: string,
  ) {
    const payload = { sub: userId, businessId, role };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }
}
