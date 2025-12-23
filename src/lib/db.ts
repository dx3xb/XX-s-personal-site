import { Pool, type QueryResultRow } from "pg";

const globalForPg = globalThis as typeof globalThis & {
  _pgPool?: Pool;
};

const pool =
  globalForPg._pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  });

globalForPg._pgPool = pool;

export async function query<T extends QueryResultRow>(
  text: string,
  params: any[] = []
) {
  const res = await pool.query<T>(text, params);
  return res.rows;
}
