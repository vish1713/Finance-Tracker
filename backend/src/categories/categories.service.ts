import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoryType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateCategoryDto) {
    if (dto.parentId) {
      await this.assertParentUsable(userId, dto.parentId, dto.type);
    }
    return this.prisma.category.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        icon: dto.icon,
        color: dto.color,
        parentId: dto.parentId,
      },
    });
  }

  /** Every user sees the shared system defaults (userId null) plus their own custom categories. */
  async findAll(userId: string, type?: CategoryType) {
    return this.prisma.category.findMany({
      where: {
        type,
        OR: [{ userId: null }, { userId }],
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(userId: string, id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category || (category.userId !== null && category.userId !== userId)) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    const category = await this.findEditableOrThrow(userId, id);
    if (dto.parentId) {
      await this.assertParentUsable(userId, dto.parentId, dto.type ?? category.type);
    }
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    await this.findEditableOrThrow(userId, id);
    await this.prisma.category.delete({ where: { id } });
    return { deleted: true };
  }

  private async findEditableOrThrow(userId: string, id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    if (category.userId === null) {
      throw new ForbiddenException('System default categories cannot be modified');
    }
    if (category.userId !== userId) {
      throw new ForbiddenException('You do not have access to this category');
    }
    return category;
  }

  private async assertParentUsable(userId: string, parentId: string, type: CategoryType) {
    const parent = await this.findOne(userId, parentId);
    if (parent.type !== type) {
      throw new BadRequestException('A subcategory must have the same type as its parent category');
    }
  }
}
