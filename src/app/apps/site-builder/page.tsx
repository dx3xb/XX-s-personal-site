import { query } from "@/lib/db";
import SiteBuilderClient from "./SiteBuilderClient";
import styles from "./site-builder.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ConversationRow = {
  id: string;
  project_id: string;
  role: "user" | "builder" | "image_agent";
  content: string;
  created_at: string;
};

type ProjectRow = {
  id: string;
  title: string;
  description: string | null;
  user_prompt: string;
  generated_html: string;
  created_at: string;
};

type ImageRow = {
  id: string;
  project_id: string;
  slot_id: string | null;
  section: string | null;
  usage: string;
  prompt: string;
  negative_prompt: string | null;
  style: string | null;
  aspect_ratio: string | null;
  size: string | null;
  seed: number | null;
  image_url: string | null;
  created_at: string;
};

export default async function SiteBuilderPage() {
  const projects = await query<ProjectRow>(
    `select id, title, description, user_prompt, generated_html, created_at
     from public.projects
     order by created_at desc
     limit 20`
  );

  const activeProjectId = projects[0]?.id ?? null;
  const conversations = activeProjectId
    ? await query<ConversationRow>(
        `select id, project_id, role, content, created_at
         from public.conversations
         where project_id = $1
         order by created_at asc`,
        [activeProjectId]
      )
    : [];
  const images = activeProjectId
    ? await query<ImageRow>(
        `select id, project_id, slot_id, section, usage, prompt, negative_prompt, style, aspect_ratio, size, seed, image_url, created_at
         from public.images
         where project_id = $1
         order by created_at asc`,
        [activeProjectId]
      )
    : [];

  return (
    <main className={styles.page}>
      <SiteBuilderClient
        initialProjects={projects}
        initialConversations={conversations}
        initialImages={images}
        initialActiveProjectId={activeProjectId}
      />
    </main>
  );
}
