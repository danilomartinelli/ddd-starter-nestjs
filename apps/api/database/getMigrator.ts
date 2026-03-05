/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

// TODO: Replace with Flyway migration tool (Task 13)
// @slonik/migrator has been removed as part of slonik v48 upgrade

import { createPool } from 'slonik';
import * as dotenv from 'dotenv';
import * as path from 'path';

// use .env or .env.test depending on NODE_ENV variable
const envPath = path.resolve(
  __dirname,
  process.env.NODE_ENV === 'test' ? '../.env.test' : '../.env',
);
dotenv.config({ path: envPath });

export async function getMigrator() {
  const pool = await createPool(
    `postgres://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}`,
  );

  // Migrator functionality removed - will be replaced by Flyway (Task 13)
  const migrator = null as any;

  return { pool, migrator };
}
