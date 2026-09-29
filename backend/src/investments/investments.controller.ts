import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { AddValueSnapshotDto } from './dto/add-value-snapshot.dto';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { InvestmentsService } from './investments.service';

@ApiTags('investments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('investments')
export class InvestmentsController {
  constructor(private readonly investmentsService: InvestmentsService) {}

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateInvestmentDto) {
    return this.investmentsService.create(user.userId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.investmentsService.findAll(user.userId);
  }

  @Get('portfolio-summary')
  getPortfolioSummary(@CurrentUser() user: CurrentUserPayload) {
    return this.investmentsService.getPortfolioSummary(user.userId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.investmentsService.findOne(user.userId, id);
  }

  @Get(':id/value-history')
  getValueHistory(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.investmentsService.getValueHistory(user.userId, id);
  }

  @Post(':id/value-history')
  addValueSnapshot(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: AddValueSnapshotDto,
  ) {
    return this.investmentsService.addValueSnapshot(user.userId, id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateInvestmentDto,
  ) {
    return this.investmentsService.update(user.userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.investmentsService.remove(user.userId, id);
  }
}
