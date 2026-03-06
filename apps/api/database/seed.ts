import { createPool, sql } from 'slonik';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

const envPath = path.resolve(
  __dirname,
  process.env.NODE_ENV === 'test' ? '../.env.test' : '../.env',
);
dotenv.config({ path: envPath });

const connectionUri = `postgres://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}`;

const directoryPath = path.join(__dirname, 'seeds');

async function runAll(): Promise<void> {
  const pool = await createPool(connectionUri);

  const files = fs.readdirSync(directoryPath);
  for (const file of files) {
    console.log(`executing seed: ${file} ...`);
    const data = fs.readFileSync(path.resolve(directoryPath, file), {
      encoding: 'utf8',
    });
    const rawSql = Object.assign([data], { raw: [data] }) as TemplateStringsArray;
    await pool.query(sql.unsafe(rawSql));
    console.log(`${file} seed executed`);
  }

  await pool.end();
  console.log('done');
  process.exit(0);
}

runAll();
