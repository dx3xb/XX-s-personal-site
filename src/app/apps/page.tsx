import { query } from "@/lib/db";
import AppsClient from "./AppsClient";
import styles from "./apps.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AppRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
};

export default async function AppsPage() {
  const apps = await query<AppRow>(
    `select id, slug, title, description, is_favorite, created_at, updated_at
     from public.apps
     order by is_favorite desc, created_at desc`
  );

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <section className={styles.hero}>
          <div className={styles.heroPanel}>
            <p className={styles.kicker}>Playground</p>
            <h1 className={styles.heroTitle}>Apps Playground</h1>
            <p className={styles.heroSubtitle}>
              一个收纳我所有小应用和实验的游乐场
            </p>
          </div>
        </section>

        <AppsClient initialApps={apps} />
      </div>
    </main>
  );
}
