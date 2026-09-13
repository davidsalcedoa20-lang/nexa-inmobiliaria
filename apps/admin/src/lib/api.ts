import type { Session } from "@supabase/supabase-js";
import type {
  CapturePhoto,
  CaptureRoom,
  CaptureRoomType,
  CaptureSession,
  CaptureUploadTicket,
  CreatePropertyInput,
  Property,
  PropertyList,
  PropertyListQuery,
  ThreeDStatusResponse,
  UpdatePropertyInput,
} from "@nexa/contracts";
import { supabase } from "./supabase";

export type CurrentAdmin = {
  id: string;
  email: string;
  displayName: string | null;
  role: "admin" | "editor";
};

const apiUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:3000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { message?: string; code?: string }
      | null;
    throw new ApiError(body?.message ?? "No fue posible completar la operación", response.status, body?.code);
  }

  return (response.status === 204 ? undefined : await response.json()) as T;
}

async function currentAccessToken() {
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  if (!data.session) throw new ApiError("Tu sesión terminó. Vuelve a ingresar.", 401, "AUTH_REQUIRED");
  return data.session.access_token;
}

export async function getCurrentAdmin(session: Session): Promise<CurrentAdmin> {
  const body = await request<{ data: CurrentAdmin }>("/api/v1/auth/me", session.access_token);
  return body.data;
}

export async function listProperties(query: Partial<PropertyListQuery> = {}) {
  const parameters = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") parameters.set(key, String(value));
  }
  const suffix = parameters.size > 0 ? `?${parameters}` : "";
  return request<PropertyList>(`/api/v1/properties${suffix}`, await currentAccessToken());
}

export async function getProperty(id: string) {
  const response = await request<{ data: Property }>(
    `/api/v1/properties/${id}`,
    await currentAccessToken(),
  );
  return response.data;
}

export async function createProperty(input: CreatePropertyInput) {
  const response = await request<{ data: Property }>("/api/v1/properties", await currentAccessToken(), {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function updateProperty(id: string, input: UpdatePropertyInput) {
  const response = await request<{ data: Property }>(
    `/api/v1/properties/${id}`,
    await currentAccessToken(),
    { method: "PATCH", body: JSON.stringify(input) },
  );
  return response.data;
}

export async function changePublication(
  property: Property,
  action: "publish" | "unpublish",
) {
  const response = await request<{ data: Property }>(
    `/api/v1/properties/${property.id}/${action}`,
    await currentAccessToken(),
    { method: "POST", body: JSON.stringify({ version: property.version }) },
  );
  return response.data;
}

export async function deleteProperty(property: Property) {
  await request<void>(`/api/v1/properties/${property.id}`, await currentAccessToken(), {
    method: "DELETE",
    body: JSON.stringify({ version: property.version }),
  });
}

export async function getCapture(propertyId: string) {
  const response = await request<{ data: CaptureSession | null }>(
    `/api/v1/properties/${propertyId}/capture`,
    await currentAccessToken(),
  );
  return response.data;
}

export async function startCaptureSession(propertyId: string) {
  const response = await request<{ data: CaptureSession }>(
    `/api/v1/properties/${propertyId}/capture/sessions`,
    await currentAccessToken(),
    { method: "POST", body: JSON.stringify({}) },
  );
  return response.data;
}

export async function createCaptureRoom(
  propertyId: string,
  input: { type: CaptureRoomType; name: string; sortOrder?: number },
) {
  const response = await request<{ data: CaptureRoom }>(
    `/api/v1/properties/${propertyId}/capture/rooms`,
    await currentAccessToken(),
    { method: "POST", body: JSON.stringify(input) },
  );
  return response.data;
}

export async function deleteCaptureRoom(propertyId: string, roomId: string) {
  await request<void>(
    `/api/v1/properties/${propertyId}/capture/rooms/${roomId}`,
    await currentAccessToken(),
    { method: "DELETE" },
  );
}

export async function uploadCapturePhoto(propertyId: string, roomId: string, file: File) {
  const accessToken = await currentAccessToken();
  const dimensions = await readImageDimensions(file);
  const contentType = capturePhotoContentType(file);
  if (!contentType) {
    throw new ApiError("El formato de la fotografía no es compatible", 400, "UNSUPPORTED_PHOTO_TYPE");
  }
  const ticketResponse = await request<{ data: CaptureUploadTicket }>(
    `/api/v1/properties/${propertyId}/capture/rooms/${roomId}/photos/upload-url`,
    await currentAccessToken(),
    {
      method: "POST",
      body: JSON.stringify({
        originalFileName: file.name || `captura-${Date.now()}.jpg`,
        contentType,
        byteSize: file.size,
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
        capturedAt: file.lastModified ? new Date(file.lastModified).toISOString() : null,
      }),
    },
  );

  await retryCaptureRequest(async () => {
  const upload = await fetch(ticketResponse.data.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
    signal: AbortSignal.timeout(120_000),
  });
  if (!upload.ok) {
    throw new ApiError("No fue posible subir la fotografía a R2", upload.status, "STORAGE_UPLOAD_FAILED");
  }
  });

  const complete = await retryCaptureRequest(() => request<{ data: CapturePhoto }>(
    `/api/v1/properties/${propertyId}/capture/photos/${ticketResponse.data.photo.id}/complete`,
    accessToken,
    { method: "POST", body: JSON.stringify({}) },
  ));
  return complete.data;
}

async function retryCaptureRequest<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const transient = error instanceof TypeError ||
        (error instanceof DOMException && error.name === "TimeoutError") ||
        (error instanceof ApiError && (error.status >= 500 || error.status === 429));
      if (!transient || attempt >= 2) throw error;
      await new Promise((resolve) => window.setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}

export function capturePhotoContentType(file: Pick<File, "name" | "type">) {
  const declared = file.type.toLowerCase();
  if (declared === "image/jpg") return "image/jpeg";
  if (["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(declared)) {
    return declared;
  }
  const extension = file.name.toLowerCase().split(".").pop();
  return ({ jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heif" } as Record<string, string>)[extension ?? ""] ?? null;
}

export async function deleteCapturePhoto(propertyId: string, photoId: string) {
  await request<void>(
    `/api/v1/properties/${propertyId}/capture/photos/${photoId}`,
    await currentAccessToken(),
    { method: "DELETE" },
  );
}

export async function getThreeDStatus(propertyId: string) {
  const response = await request<{ data: ThreeDStatusResponse }>(
    `/api/v1/properties/${propertyId}/3d-status`,
    await currentAccessToken(),
  );
  return response.data;
}

export async function prepareThreeDGeneration(propertyId: string) {
  const response = await request<{ data: ThreeDStatusResponse }>(
    `/api/v1/properties/${propertyId}/generate-3d`,
    await currentAccessToken(),
    { method: "POST", body: JSON.stringify({}) },
  );
  return response.data;
}

export async function publishThreeDExperience(propertyId: string) {
  const response = await request<{ data: ThreeDStatusResponse }>(
    `/api/v1/properties/${propertyId}/3d/publish`,
    await currentAccessToken(),
    { method: "POST", body: JSON.stringify({}) },
  );
  return response.data;
}

function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
    image.src = objectUrl;
  });
}
