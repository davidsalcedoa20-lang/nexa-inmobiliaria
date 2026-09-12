import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const required = [
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_ENDPOINT",
];

const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(`Faltan variables R2: ${missing.join(", ")}`);
}

const client = new S3Client({
  endpoint: process.env.R2_ENDPOINT,
  region: process.env.R2_REGION || "auto",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const bucket = process.env.R2_BUCKET_NAME;
const key = `verification/codex-${randomUUID()}.txt`;

try {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: "nexa-r2-connectivity-check",
      ContentType: "text/plain",
    }),
  );
  const stored = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  if (stored.ContentLength !== 26) {
    throw new Error("El objeto temporal no coincide con el contenido esperado");
  }
  console.log("R2 conectado: escritura y lectura verificadas.");
} finally {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => undefined);
}

console.log("Objeto temporal eliminado; el bucket quedó limpio.");
