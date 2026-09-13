import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createReadStream } from "node:fs";
import { stat, writeFile } from "node:fs/promises";

export interface ObjectStorageProvider {
  download(objectKey: string, destination: string): Promise<void>;
  upload(objectKey: string, source: string, contentType: string): Promise<number>;
  close(): void;
}

export class R2ObjectStorageProvider implements ObjectStorageProvider {
  private readonly client: S3Client;

  constructor(
    private readonly bucketName: string,
    options: { endpoint: string; region: string; accessKeyId: string; secretAccessKey: string },
  ) {
    this.client = new S3Client({
      endpoint: options.endpoint,
      region: options.region,
      credentials: { accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey },
    });
  }

  async download(objectKey: string, destination: string) {
    const object = await this.client.send(new GetObjectCommand({ Bucket: this.bucketName, Key: objectKey }));
    if (!object.Body) throw new Error(`R2 no devolvió contenido para ${objectKey}`);
    await writeFile(destination, await object.Body.transformToByteArray());
  }

  async upload(objectKey: string, source: string, contentType: string) {
    const metadata = await stat(source);
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
      Body: createReadStream(source),
      ContentLength: metadata.size,
      ContentType: contentType,
    }));
    return metadata.size;
  }

  close() {
    this.client.destroy();
  }
}
