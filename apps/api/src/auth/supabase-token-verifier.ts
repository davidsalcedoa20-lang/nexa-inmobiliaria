import { createRemoteJWKSet, jwtVerify } from "jose";
import type { AuthIdentity, TokenVerifier } from "./types.js";

export class SupabaseTokenVerifier implements TokenVerifier {
  readonly #issuer: string;
  readonly #keySet: ReturnType<typeof createRemoteJWKSet>;

  constructor(supabaseUrl: string) {
    const normalizedUrl = supabaseUrl.replace(/\/$/, "");
    this.#issuer = `${normalizedUrl}/auth/v1`;
    this.#keySet = createRemoteJWKSet(new URL(`${this.#issuer}/.well-known/jwks.json`));
  }

  async verify(token: string): Promise<AuthIdentity> {
    const { payload } = await jwtVerify(token, this.#keySet, {
      issuer: this.#issuer,
      audience: "authenticated",
    });

    if (!payload.sub || typeof payload.email !== "string") {
      throw new Error("El token no contiene una identidad de usuario válida");
    }

    return {
      userId: payload.sub,
      email: payload.email,
    };
  }
}
