import postgres from "postgres";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";

// Read-only reconciliation. Never print keys, URLs or credentials.
const db = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const storage = new S3Client({
  endpoint: process.env.R2_ENDPOINT,
  region: process.env.R2_REGION || "auto",
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});
const summary = { checked: 0, matched: 0, missing: 0, mismatched: 0, pending: 0, errors: 0 };
try {
  const photos = await db`select object_key, byte_size, content_type, status from public.capture_photos`;
  for (const photo of photos) {
    if (photo.status !== "uploaded") { summary.pending++; continue; }
    summary.checked++;
    try {
      const actual = await storage.send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: photo.object_key }));
      if (actual.ContentLength === photo.byte_size && actual.ContentType === photo.content_type) summary.matched++;
      else summary.mismatched++;
    } catch (error) {
      if (error?.$metadata?.httpStatusCode === 404) summary.missing++;
      else summary.errors++;
    }
  }
  console.log(JSON.stringify(summary));
  if (summary.missing || summary.mismatched || summary.errors) process.exitCode = 1;
} catch {
  console.error("No se pudo completar la auditoría de almacenamiento. Revisa la conexión local.");
  process.exitCode = 1;
} finally {
  await db.end();
  storage.destroy();
}
