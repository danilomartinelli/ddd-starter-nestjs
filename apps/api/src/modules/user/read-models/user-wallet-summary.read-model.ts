import { z } from 'zod';

export const userWalletSummaryReadSchema = z.object({
  id: z.uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  userId: z.string(),
  email: z.string().nullable(),
  country: z.string().nullable(),
  walletId: z.string().nullable(),
  balance: z.number().int().nullable(),
});

export type UserWalletSummaryReadModel = z.infer<
  typeof userWalletSummaryReadSchema
>;
