import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CloudinaryStorageService } from './cloudinary-storage.service';
import { S3StorageService } from './s3-storage.service';
import { StorageController } from './storage.controller';
import { STORAGE_SERVICE } from './storage.interface';

@Module({
  imports: [ConfigModule],
  controllers: [StorageController],
  providers: [
    S3StorageService,
    CloudinaryStorageService,
    {
      provide: STORAGE_SERVICE,
      inject: [ConfigService, S3StorageService, CloudinaryStorageService],
      useFactory: (
        config: ConfigService,
        s3: S3StorageService,
        cloudinaryService: CloudinaryStorageService,
      ) => (config.get<string>('storage.provider') === 'cloudinary' ? cloudinaryService : s3),
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
