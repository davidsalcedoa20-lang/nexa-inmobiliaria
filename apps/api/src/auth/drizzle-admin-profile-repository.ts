import type { AdminRole } from "@nexa/contracts";
import { adminProfiles, type Database } from "@nexa/database";
import { eq } from "drizzle-orm";
import type { AdminProfileRepository } from "./types.js";

export class DrizzleAdminProfileRepository implements AdminProfileRepository {
  constructor(private readonly database: Database) {}

  async findActiveByUserId(userId: string) {
    const [profile] = await this.database
      .select({
        id: adminProfiles.id,
        email: adminProfiles.email,
        displayName: adminProfiles.displayName,
        role: adminProfiles.role,
        isActive: adminProfiles.isActive,
      })
      .from(adminProfiles)
      .where(eq(adminProfiles.id, userId))
      .limit(1);

    if (!profile) return null;

    return {
      ...profile,
      role: profile.role as AdminRole,
    };
  }
}
