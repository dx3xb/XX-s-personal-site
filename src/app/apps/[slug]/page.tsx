
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// src/app/apps/[slug]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { query } from "@/lib/db";

type AppRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: any;
  created_at: string;
  updated_at: string;
};

export const dynamic = "force-dynamic"; // 先简单粗暴：每次请求都查库

export default async function AppDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params.slug;

  const { rows } = await query<AppRow>(
    `select id, slug, title, description, content, created_at, updated_at
     from public.apps
     where slug = $1
     limit 1`,
    [slug]
  );

  const app = rows[0];
  if (!app) return notFound();

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/apps" style={{ opacity: 0.8 }}>
          ← Back to Apps
        </Link>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 700 }}>{app.title}</h1>
      <p style={{ opacity: 0.8, marginTop: 8 }}>{app.description}</p>

      <div style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
          Raw content (JSON)
        </h2>
        <pre
          style={{
            background: "rgba(255,255,255,0.06)",
            padding: 16,
            borderRadius: 12,
            overflow: "auto",
          }}
        >
          {JSON.stringify(app.content, null, 2)}
        </pre>
      </div>
    </main>
  );
}
