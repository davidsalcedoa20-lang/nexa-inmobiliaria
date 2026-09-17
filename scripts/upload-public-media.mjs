import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";

const required = ["R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_ENDPOINT"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) throw new Error(`Faltan variables R2: ${missing.join(", ")}`);

const client = new S3Client({
  endpoint: process.env.R2_ENDPOINT,
  region: process.env.R2_REGION || "auto",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const media = [
  "local-rodolfo.mp4",
  "lote-san-sebastian.mp4",
  "altos-san-sebastian.mp4",
  "edificio-yarumo.mp4",
];

for (const file of media) {
  const source = path.resolve("media-ready", file);
  const metadata = await stat(source);
  const key = `public/properties/${file}`;
  await client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: createReadStream(source),
    ContentLength: metadata.size,
    ContentType: "video/mp4",
    CacheControl: "public, max-age=31536000, immutable",
  }));
  console.info(`${key}: ${(metadata.size / 1024 / 1024).toFixed(2)} MB`);
}
