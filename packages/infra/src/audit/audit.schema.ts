import { z } from "zod";

export const auditLogSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  userId: z.string().nullable(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  changes: z.unknown().nullable(),
  metadata: z.unknown().nullable(),
});

export type AuditLogModel = z.infer<typeof auditLogSchema>;
