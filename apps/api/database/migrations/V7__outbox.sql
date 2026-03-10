CREATE TABLE "outbox" (
  "id" character varying NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "eventName" character varying NOT NULL,
  "payload" jsonb NOT NULL,
  "publishedAt" TIMESTAMP WITH TIME ZONE,
  CONSTRAINT "PK_outbox" PRIMARY KEY ("id")
);
CREATE INDEX "IDX_outbox_unpublished" ON "outbox" ("createdAt") WHERE "publishedAt" IS NULL;
