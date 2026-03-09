CREATE TABLE "user_wallet_summary" (
  "id" character varying NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "userId" character varying NOT NULL,
  "email" character varying,
  "country" character varying,
  "walletId" character varying,
  "balance" integer DEFAULT 0,
  CONSTRAINT "PK_user_wallet_summary" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_user_wallet_summary_userId" UNIQUE ("userId")
);
