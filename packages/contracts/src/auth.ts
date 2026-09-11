import { z } from "zod";

export const adminRoleValues = ["admin", "editor"] as const;
export const AdminRoleSchema = z.enum(adminRoleValues);
export type AdminRole = z.infer<typeof AdminRoleSchema>;

export const AdminProfileSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  displayName: z.string().nullable(),
  role: AdminRoleSchema,
  isActive: z.boolean(),
});

export type AdminProfile = z.infer<typeof AdminProfileSchema>;
