export interface UploadUrlResult {
  uploadUrl: string;
  fileUrl: string;
  /** Extra form fields the client must include in the upload request (used by the Cloudinary signed-upload flow). */
  fields?: Record<string, string>;
}

export interface StorageService {
  createUploadUrl(key: string, contentType: string): Promise<UploadUrlResult>;
  deleteFile(fileUrl: string): Promise<void>;
}

export const STORAGE_SERVICE = 'STORAGE_SERVICE';
