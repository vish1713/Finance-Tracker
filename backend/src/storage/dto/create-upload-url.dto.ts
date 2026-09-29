import { IsIn, IsNotEmpty, IsString } from 'class-validator';

const ALLOWED_CONTENT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

export class CreateUploadUrlDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsIn(ALLOWED_CONTENT_TYPES)
  contentType: string;
}
