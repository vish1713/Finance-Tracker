import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { assertOwned } from '../common/utils/ownership.util';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ContributeGoalDto } from './dto/contribute-goal.dto';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

@Injectable()
export class GoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateGoalDto) {
    if (dto.linkedAccountId) {
      const account = await this.prisma.account.findUnique({ where: { id: dto.linkedAccountId } });
      assertOwned(account, userId, 'Account');
    }
    return this.prisma.goal.create({
      data: {
        userId,
        name: dto.name,
        targetAmount: dto.targetAmount,
        targetDate: dto.targetDate,
        linkedAccountId: dto.linkedAccountId,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.goal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async findOne(userId: string, id: string) {
    const goal = await this.prisma.goal.findUnique({ where: { id } });
    assertOwned(goal, userId, 'Goal');
    return goal;
  }

  async update(userId: string, id: string, dto: UpdateGoalDto) {
    await this.findOne(userId, id);
    return this.prisma.goal.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.goal.delete({ where: { id } });
    return { deleted: true };
  }

  async contribute(userId: string, id: string, dto: ContributeGoalDto) {
    const goal = await this.findOne(userId, id);
    const currentAmount = Number(goal.currentAmount) + dto.amount;
    const isAchieved = currentAmount >= Number(goal.targetAmount);

    const updated = await this.prisma.goal.update({
      where: { id },
      data: { currentAmount, isAchieved },
    });

    if (isAchieved && !goal.isAchieved) {
      await this.notificationsService.notify(
        userId,
        NotificationType.GOAL_MILESTONE,
        `Goal achieved: ${goal.name}`,
        `You've reached your target of ${goal.targetAmount} for "${goal.name}".`,
        { metadata: { goalId: goal.id } },
      );
    }

    return updated;
  }
}
