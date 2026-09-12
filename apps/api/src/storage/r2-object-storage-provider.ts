import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
  CreateUploadUrlInput,
  ObjectStorageProvider,
  StoredObjectMetadata,
} from "./types.js";

export type R2ObjectStorageOptions = {
  endpoint: string;
  region: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export class R2ObjectStorageProvider implements ObjectStorageProvider {
  private readonly client: S3Client;
  private readonly bucketName: string;

  constructor(options: R2ObjectStorageOptions) {
    this.bucketName = options.bucketName;
    this.client = new S3Client({
      endpoint: options.endpoint,
      region: options.region,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
    });
  }

  createUploadUrl(input: CreateUploadUrlInput) {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: input.objectKey,
        ContentType: input.contentType,
      }),
      { expiresIn: input.expiresInSeconds ?? 900 },
    );
  }

  createDownloadUrl(objectKey: string, expiresInSeconds = 900) {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucketName, Key: objectKey }),
      { expiresIn: expiresInSeconds },
    );
  }

  async headObject(objectKey: string): Promise<StoredObjectMetadata | null> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucketName, Key: objectKey }),
      );
      return {
        contentLength: result.ContentLength ?? null,
        contentType: result.ContentType ?? null,
        etag: result.ETag?.replaceAll('"', "") ?? null,
      };
    } catch (error) {
      if (error instanceof NotFound || (isAwsError(error) && error.$metadata.httpStatusCode === 404)) {
        return null;
      }
      throw error;
    }
  }

  async deleteObject(objectKey: string) {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucketName, Key: objectKey }),
    );
  }
}

function isAwsError(error: unknown): error is { $metadata: { httpStatusCode?: number } } {
  return typeof error === "object" && error !== null && "$metadata" in error;
}
