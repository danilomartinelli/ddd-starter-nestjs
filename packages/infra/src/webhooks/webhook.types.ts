export interface WebhookOptions {
  maxRetries?: number; // default 3
  retryDelayMs?: number; // default 5000
  timeoutMs?: number; // default 10000
}

export const WEBHOOK_OPTIONS = Symbol("WEBHOOK_OPTIONS");
