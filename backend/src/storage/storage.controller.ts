import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { STORAGE_SERVICE, StorageService } from './storage.interface';

@ApiTags('storage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('storage')
export class StorageController {
  constructor(@Inject(STORAGE_SERVICE) private readonly storage: StorageService) {}

  @Post('upload-url')
  createUploadUrl(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateUploadUrlDto) {
    const extension = dto.fileName.includes('.') ? dto.fileName.split('.').pop() : undefined;
    const key = `${user.userId}/${randomUUID()}${extension ? `.${extension}` : ''}`;
    return this.storage.createUploadUrl(key, dto.contentType);
  }
}
