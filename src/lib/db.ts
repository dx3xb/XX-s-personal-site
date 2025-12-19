import { Pool } from "pg";

export async function query<T>(text: string, params: any[] = []) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const res = await pool.query<T>(text, params);
  await pool.end();
  return res.rows;
}
