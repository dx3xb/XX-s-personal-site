// src/app/apps/[slug]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AppRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: any;
  created_at: string;
  updated_at: string;
};

export default async function AppDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const apps = await query<AppRow>(
    `select id, slug, title, description, content, created_at, updated_at
     from public.apps
     where slug = $1
     limit 1`,
    [slug]
  );

  const app = apps[0];
  if (!app) notFound();

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <p style={{ marginBottom: 16 }}>
        <Link href="/apps">← Back to Apps</Link>
      </p>

      <h1 style={{ fontSize: 28, fontWeight: 800 }}>{app.title}</h1>
      <p style={{ opacity: 0.8, marginTop: 8 }}>{app.description}</p>

      <hr style={{ margin: "20px 0" }} />

      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
        content (JSON)
      </h3>
      <pre
        style={{
          padding: 12,
          borderRadius: 8,
          background: "rgba(0,0,0,0.06)",
          overflow: "auto",
        }}
      >
        {JSON.stringify(app.content, null, 2)}
      </pre>
    </main>
  );
}
