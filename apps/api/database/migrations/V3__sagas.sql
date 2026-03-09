CREATE TABLE "sagas" (
  "id" character varying NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "type" character varying NOT NULL,
  "state" character varying NOT NULL,
  "payload" jsonb NOT NULL DEFAULT '{}',
  "aggregateId" character varying NOT NULL,
  CONSTRAINT "PK_sagas" PRIMARY KEY ("id")
);

CREATE INDEX "IDX_sagas_type_aggregateId" ON "sagas" ("type", "aggregateId");
CREATE INDEX "IDX_sagas_state" ON "sagas" ("state");
