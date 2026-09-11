import type { AdminRole } from "@nexa/contracts";

export type AuthIdentity = {
  userId: string;
  email: string;
};

export type AuthorizedAdmin = AuthIdentity & {
  displayName: string | null;
  role: AdminRole;
};

export interface TokenVerifier {
  verify(token: string): Promise<AuthIdentity>;
}

export interface AdminProfileRepository {
  findActiveByUserId(userId: string): Promise<{
    id: string;
    email: string;
    displayName: string | null;
    role: AdminRole;
    isActive: boolean;
  } | null>;
}
