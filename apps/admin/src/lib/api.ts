import type { Session } from "@supabase/supabase-js";

export type CurrentAdmin = {
  id: string;
  email: string;
  displayName: string | null;
  role: "admin" | "editor";
};

const apiUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:3000").replace(/\/$/, "");

export async function getCurrentAdmin(session: Session): Promise<CurrentAdmin> {
  const response = await fetch(`${apiUrl}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "No fue posible validar el acceso administrativo");
  }

  const body = (await response.json()) as { data: CurrentAdmin };
  return body.data;
}
