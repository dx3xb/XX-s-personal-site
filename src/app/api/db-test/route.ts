export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Pool } from "pg";

export async function GET() {
  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      return NextResponse.json(
        { ok: false, error: "Missing DATABASE_URL" },
        { status: 500 }
      );
    }

    const pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });

    const result = await pool.query(
      "select id, slug, title from public.apps limit 5"
    );

    await pool.end();

    return NextResponse.json({ ok: true, rows: result.rows });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
