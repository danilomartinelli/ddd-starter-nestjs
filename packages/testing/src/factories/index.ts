import { randomUUID } from "crypto";

/**
 * Generate default base entity props for test doubles.
 */
export function createBaseEntityProps(overrides?: {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  const now = new Date();
  return {
    id: overrides?.id ?? randomUUID(),
    createdAt: overrides?.createdAt ?? now,
    updatedAt: overrides?.updatedAt ?? now,
  };
}
