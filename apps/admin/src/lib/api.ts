import type { Session } from "@supabase/supabase-js";
import type {
  CreatePropertyInput,
  Property,
  PropertyList,
  PropertyListQuery,
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
