import { z } from "zod";

export const AllowListSchema = z.object({
  tenantId: z.string().optional(),
  superAdmins: z.array(z.string().email()).default([]),
  admins: z.array(z.string().email()).default([]),
});

export type AllowList = z.infer<typeof AllowListSchema>;

export function normalizeAllowList(input: AllowList): AllowList {
  const lower = (s: string) => s.trim().toLowerCase();
  const uniq = (arr: string[]) => Array.from(new Set(arr.map(lower))).filter(Boolean);

  return {
    tenantId: input.tenantId,
    superAdmins: uniq(input.superAdmins),
    admins: uniq(input.admins),
  };
}

export function roleForEmail(allow: AllowList, email: string | null | undefined): "superadmin" | "admin" | "none" {
  if (!email) return "none";
  const e = email.toLowerCase();
  if (allow.superAdmins.includes(e)) return "superadmin";
  if (allow.admins.includes(e)) return "admin";
  return "none";
}


