import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';
import { CategoryBreakdownQueryDto } from './dto/category-breakdown-query.dto';
import { TrendQueryDto } from './dto/trend-query.dto';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  getDashboardSummary(@CurrentUser() user: CurrentUserPayload) {
    return this.analyticsService.getDashboardSummary(user.userId);
  }

  @Get('category-breakdown')
  getCategoryBreakdown(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: CategoryBreakdownQueryDto,
  ) {
    return this.analyticsService.getCategoryBreakdown(user.userId, query);
  }

  @Get('income-expense-trend')
  getIncomeExpenseTrend(@CurrentUser() user: CurrentUserPayload, @Query() query: TrendQueryDto) {
    return this.analyticsService.getIncomeExpenseTrend(user.userId, query);
  }

  @Get('net-worth-trend')
  getNetWorthTrend(@CurrentUser() user: CurrentUserPayload, @Query() query: TrendQueryDto) {
    return this.analyticsService.getNetWorthTrend(user.userId, query);
  }
}
