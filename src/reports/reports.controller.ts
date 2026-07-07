import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Role } from '../../generated/prisma/client';
import type { JwtPayload } from '../auth/types/jwt-payload.type';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('dashboard')
  @Roles(Role.ADMIN, Role.MANAGER)
  getDashboard(@GetUser() user: JwtPayload) {
    return this.reportsService.getDashboard(user.businessId);
  }

  @Get('weekly')
  @Roles(Role.ADMIN, Role.MANAGER)
  getWeeklyReport(@GetUser() user: JwtPayload) {
    return this.reportsService.getWeeklyReport(user.businessId);
  }

  @Get('monthly')
  @Roles(Role.ADMIN, Role.MANAGER)
  getMonthlyReport(
    @GetUser() user: JwtPayload,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const now = new Date();
    return this.reportsService.getMonthlyReport(
      user.businessId,
      year ? Number(year) : now.getFullYear(),
      month ? Number(month) : now.getMonth() + 1,
    );
  }
}
