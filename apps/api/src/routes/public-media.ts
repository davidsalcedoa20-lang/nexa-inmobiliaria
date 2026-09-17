import type { FastifyInstance } from "fastify";
import type { ObjectStorageProvider } from "../storage/types.js";

const PUBLIC_MEDIA = new Set([
  "public/properties/local-rodolfo.mp4",
  "public/properties/lote-san-sebastian.mp4",
  "public/properties/altos-san-sebastian.mp4",
  "public/properties/edificio-yarumo.mp4",
]);

export async function registerPublicMediaRoutes(
  app: FastifyInstance,
  objectStorage: ObjectStorageProvider,
) {
  app.get<{ Params: { file: string } }>(
    "/api/v1/public/media/:file",
    async (request, reply) => {
      const objectKey = `public/properties/${request.params.file}`;
      if (!PUBLIC_MEDIA.has(objectKey)) {
        return reply.code(404).send({ code: "MEDIA_NOT_FOUND", message: "El recurso no existe" });
      }

      const object = await objectStorage.headObject(objectKey);
      if (!object) {
        return reply.code(404).send({ code: "MEDIA_NOT_FOUND", message: "El recurso no existe" });
      }

      const url = await objectStorage.createDownloadUrl(objectKey, 3600);
      return reply.code(302).header("Location", url).send();
    },
  );
}
