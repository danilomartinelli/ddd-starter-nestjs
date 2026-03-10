ALTER TABLE "users" ADD COLUMN "deletedAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "wallets" ADD COLUMN "deletedAt" TIMESTAMP WITH TIME ZONE;

CREATE TABLE "audit_logs" (
  "id" character varying NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "userId" character varying,
  "action" character varying NOT NULL,
  "entityType" character varying NOT NULL,
  "entityId" character varying NOT NULL,
  "changes" jsonb,
  "metadata" jsonb,
  CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
);
CREATE INDEX "IDX_audit_logs_entity" ON "audit_logs" ("entityType", "entityId");
CREATE INDEX "IDX_audit_logs_userId" ON "audit_logs" ("userId");
