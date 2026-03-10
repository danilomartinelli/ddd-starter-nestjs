import { z } from "zod";

export const webhookSubscriptionSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  url: z.string(),
  secret: z.string(),
  events: z.array(z.string()),
  active: z.boolean(),
  failureCount: z.number().int(),
  lastFailureAt: z.coerce.date().nullable(),
});

export type WebhookSubscriptionModel = z.infer<
  typeof webhookSubscriptionSchema
>;

export const webhookDeliverySchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  subscriptionId: z.string(),
  eventName: z.string(),
  payload: z.unknown(),
  status: z.string(),
  responseStatus: z.number().int().nullable(),
  responseBody: z.string().nullable(),
  attempts: z.number().int(),
  nextRetryAt: z.coerce.date().nullable(),
});

export type WebhookDeliveryModel = z.infer<typeof webhookDeliverySchema>;
