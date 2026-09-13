import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import postgres from "postgres";

const [, , propertyId, roomId, destination] = process.argv;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!uuid.test(propertyId ?? "") || !uuid.test(roomId ?? "") || !destination) {
  throw new Error("Uso: node download-capture-room.mjs <property-id> <room-id> <destination>");
}

const output = resolve(destination);
await mkdir(output, { recursive: true });
const database = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const storage = new S3Client({
  endpoint: process.env.R2_ENDPOINT,
  region: process.env.R2_REGION || "auto",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

try {
  const photos = await database`
    select cp.id, cp.object_key, cp.content_type
    from public.capture_photos cp
    join public.capture_rooms cr on cr.id = cp.capture_room_id
    join public.capture_sessions cs on cs.id = cr.capture_session_id
    where cs.property_id = ${propertyId}
      and cr.id = ${roomId}
      and cp.status = 'uploaded'
    order by cp.created_at, cp.id
  `;
  if (!photos.length) throw new Error("No hay fotografías confirmadas en esta habitación");

  for (let index = 0; index < photos.length; index += 1) {
    const photo = photos[index];
    const extension = photo.content_type === "image/png" ? ".png" : photo.content_type === "image/webp" ? ".webp" : ".jpg";
    const name = `${String(index + 1).padStart(3, "0")}-${basename(photo.id)}${extension}`;
    const object = await storage.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: photo.object_key }));
    if (!object.Body) throw new Error(`La fotografía ${index + 1} no tiene contenido`);
    await pipeline(object.Body, createWriteStream(resolve(output, name)));
  }
  console.log(`${photos.length} fotografías descargadas en ${output}`);
} finally {
  await database.end();
  storage.destroy();
}
