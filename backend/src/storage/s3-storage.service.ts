import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService, UploadUrlResult } from './storage.interface';

@Injectable()
export class S3StorageService implements StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('storage.aws.bucket') ?? '';
    this.region = this.config.get<string>('storage.aws.region') ?? 'us-east-1';
    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.config.get<string>('storage.aws.accessKeyId') ?? '',
        secretAccessKey: this.config.get<string>('storage.aws.secretAccessKey') ?? '',
      },
    });
  }

  async createUploadUrl(key: string, contentType: string): Promise<UploadUrlResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: 300 });
    const fileUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    return { uploadUrl, fileUrl };
  }

  async deleteFile(fileUrl: string): Promise<void> {
    const key = this.extractKey(fileUrl);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  private extractKey(fileUrl: string): string {
    const url = new URL(fileUrl);
    return decodeURIComponent(url.pathname.replace(/^\//, ''));
  }
}
