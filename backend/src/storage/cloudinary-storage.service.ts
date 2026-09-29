import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { StorageService, UploadUrlResult } from './storage.interface';

const FOLDER = 'finance-tracker';

@Injectable()
export class CloudinaryStorageService implements StorageService {
  private readonly cloudName: string;
  private readonly apiSecret: string;

  constructor(private readonly config: ConfigService) {
    this.cloudName = this.config.get<string>('storage.cloudinary.cloudName') ?? '';
    this.apiSecret = this.config.get<string>('storage.cloudinary.apiSecret') ?? '';
    cloudinary.config({
      cloud_name: this.cloudName,
      api_key: this.config.get<string>('storage.cloudinary.apiKey'),
      api_secret: this.apiSecret,
    });
  }

  async createUploadUrl(key: string): Promise<UploadUrlResult> {
    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = { timestamp, public_id: key, folder: FOLDER };
    const signature = cloudinary.utils.api_sign_request(paramsToSign, this.apiSecret);

    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${this.cloudName}/auto/upload`,
      fileUrl: `https://res.cloudinary.com/${this.cloudName}/image/upload/${FOLDER}/${key}`,
      fields: {
        api_key: this.config.get<string>('storage.cloudinary.apiKey') ?? '',
        timestamp: String(timestamp),
        public_id: key,
        folder: FOLDER,
        signature,
      },
    };
  }

  async deleteFile(fileUrl: string): Promise<void> {
    const publicId = this.extractPublicId(fileUrl);
    await cloudinary.uploader.destroy(publicId);
  }

  private extractPublicId(fileUrl: string): string {
    const match = fileUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
    return match ? match[1] : fileUrl;
  }
}
