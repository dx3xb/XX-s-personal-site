export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import Link from "next/link";
import { query } from "@/lib/db";

type AppRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
};

export default async function AppsPage() {
  const apps = await query<AppRow>(`
    select id, slug, title, description
    from public.apps
    order by created_at desc
  `);

  return (
    <main style={{ padding: 24 }}>
      <h1>🧩 Apps</h1>

      {apps.length === 0 && <p>No apps yet.</p>}

      <ul style={{ marginTop: 24 }}>
        {apps.map((app) => (
          <li key={app.id} style={{ marginBottom: 16 }}>
            <h3>{app.title}</h3>
            <p>{app.description}</p>
            <Link href={`/apps/${app.slug}`}>
              → 打开这个 App
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
