export type CreateUploadUrlInput = {
  objectKey: string;
  contentType: string;
  expiresInSeconds?: number;
};

export type StoredObjectMetadata = {
  contentLength: number | null;
  contentType: string | null;
  etag: string | null;
};

export interface ObjectStorageProvider {
  createUploadUrl(input: CreateUploadUrlInput): Promise<string>;
  createDownloadUrl(objectKey: string, expiresInSeconds?: number): Promise<string>;
  headObject(objectKey: string): Promise<StoredObjectMetadata | null>;
  deleteObject(objectKey: string): Promise<void>;
}
