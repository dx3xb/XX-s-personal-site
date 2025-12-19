import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function query<T = any>(sql: string, params?: any[]) {
  const res = await pool.query(sql, params);
  return res.rows as T[];
}
