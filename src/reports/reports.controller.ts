import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('dashboard')
  getDashboard(@GetUser() user: JwtPayload) {
    return this.reportsService.getDashboard(user.businessId);
  }

  @Get('weekly')
  getWeeklyReport(@GetUser() user: JwtPayload) {
    return this.reportsService.getWeeklyReport(user.businessId);
  }

  @Get('monthly')
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
