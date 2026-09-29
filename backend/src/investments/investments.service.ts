import { Injectable } from '@nestjs/common';
import { assertOwned } from '../common/utils/ownership.util';
import { PrismaService } from '../prisma/prisma.service';
import { AddValueSnapshotDto } from './dto/add-value-snapshot.dto';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';

@Injectable()
export class InvestmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateInvestmentDto) {
    return this.prisma.investment.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        quantity: dto.quantity,
        purchasePrice: dto.purchasePrice,
        purchaseDate: dto.purchaseDate,
        notes: dto.notes,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.investment.findMany({
      where: { userId },
      orderBy: { purchaseDate: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const investment = await this.prisma.investment.findUnique({ where: { id } });
    assertOwned(investment, userId, 'Investment');
    return investment;
  }

  async update(userId: string, id: string, dto: UpdateInvestmentDto) {
    await this.findOne(userId, id);
    return this.prisma.investment.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.investment.delete({ where: { id } });
    return { deleted: true };
  }

  async addValueSnapshot(userId: string, id: string, dto: AddValueSnapshotDto) {
    await this.findOne(userId, id);
    return this.prisma.investmentValueHistory.create({
      data: { investmentId: id, value: dto.value },
    });
  }

  async getValueHistory(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.investmentValueHistory.findMany({
      where: { investmentId: id },
      orderBy: { recordedAt: 'asc' },
    });
  }

  async getPortfolioSummary(userId: string) {
    const investments = await this.prisma.investment.findMany({
      where: { userId },
      include: { valueHistory: { orderBy: { recordedAt: 'desc' }, take: 1 } },
    });

    const holdings = investments.map((investment) => {
      const costBasis = Number(investment.quantity) * Number(investment.purchasePrice);
      const currentValue = investment.valueHistory[0]
        ? Number(investment.valueHistory[0].value)
        : costBasis;
      const gainLoss = currentValue - costBasis;
      const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

      return {
        id: investment.id,
        name: investment.name,
        type: investment.type,
        quantity: Number(investment.quantity),
        costBasis,
        currentValue,
        gainLoss,
        gainLossPercent,
      };
    });

    const totalCostBasis = holdings.reduce((sum, h) => sum + h.costBasis, 0);
    const totalCurrentValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const totalGainLoss = totalCurrentValue - totalCostBasis;
    const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

    return { holdings, totalCostBasis, totalCurrentValue, totalGainLoss, totalGainLossPercent };
  }
}
