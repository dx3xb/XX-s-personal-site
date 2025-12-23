import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import crypto from "crypto";

export const runtime = "nodejs";

type ProjectRow = {
  generated_html: string | null;
  preview_password_hash: string | null;
  preview_password_salt: string | null;
};

type TokenRow = {
  project_id: string;
  revoked_at: string | null;
  expires_at: string | null;
};

type ImageRow = {
  slot_id: string | null;
  image_url: string | null;
};

function hashPassword(password: string, salt: string) {
  return crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
}

function injectImages(html: string, images: ImageRow[]) {
  if (!html || images.length === 0) return html;
  const slotMatches =
    html.match(/data-sb-image\s*=\s*["']([^"']+)["']/gi) ?? [];
  const slots = new Set(
    slotMatches
      .map((entry) => entry.split("=").pop() ?? "")
      .map((value) => value.replace(/["']/g, "").trim())
      .filter(Boolean)
  );
  const map = images.reduce<Record<string, string>>((acc, image) => {
    if (image.slot_id && image.image_url) {
      acc[image.slot_id] = image.image_url;
    }
    return acc;
  }, {});
  const filteredMap = Object.keys(map).reduce<Record<string, string>>(
    (acc, key) => {
      if (slots.has(key)) {
        acc[key] = map[key];
      }
      return acc;
    },
    {}
  );
  if (slots.size === 0 || Object.keys(filteredMap).length === 0) {
    const galleryItems = images
      .filter((img) => img.image_url)
      .map(
        (img) =>
          `<figure style="margin:0;display:grid;gap:8px;"><img src="${img.image_url}" alt="${img.slot_id ?? "image"}" style="width:100%;border-radius:12px;border:1px solid rgba(148,163,184,0.2);" /><figcaption style="font-size:12px;color:#cbd5f5;">${img.slot_id ?? "image"}</figcaption></figure>`
      )
      .join("");
    const gallery = `\n<section style=\"padding:24px;background:#0b0f1f;color:#e2e8f0;\"><h2 style=\"margin:0 0 16px;font-size:18px;\">Generated Images</h2><div style=\"display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;\">${galleryItems}</div></section>\n`;
    if (html.includes("</body>")) {
      return html.replace("</body>", `${gallery}</body>`);
    }
    return `${html}${gallery}`;
  }
  const script = `\n<script>(function(){const map=${JSON.stringify(
    filteredMap
  )};Object.keys(map).forEach(function(id){const url=map[id];document.querySelectorAll('[data-sb-image="'+id+'"]').forEach(function(el){if(el.tagName.toLowerCase()==='img'){el.setAttribute('src',url);}else{el.style.backgroundImage='url('+url+')';el.style.backgroundSize=el.style.backgroundSize||'cover';el.style.backgroundPosition=el.style.backgroundPosition||'center';}});});})();</script>\n`;
  if (html.includes("</body>")) {
    return html.replace("</body>", `${script}</body>`);
  }
  return `${html}${script}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const projectIdRaw = String(body?.project_id ?? "").trim();
    const token = String(body?.token ?? "").trim();
    const password = String(body?.password ?? "");
    let projectId = projectIdRaw;

    if (!projectId && !token) {
      return NextResponse.json(
        { ok: false, error: "Missing project_id or token" },
        { status: 400 }
      );
    }

    if (token) {
      const tokenRows = await query<TokenRow>(
        `select project_id, revoked_at, expires_at
         from public.preview_tokens
         where token = $1`,
        [token]
      );
      const tokenRow = tokenRows[0];
      if (!tokenRow) {
        return NextResponse.json(
          { ok: false, error: "Invalid token" },
          { status: 401 }
        );
      }
      if (tokenRow.revoked_at) {
        return NextResponse.json(
          { ok: false, error: "Token revoked" },
          { status: 401 }
        );
      }
      if (tokenRow.expires_at) {
        const expiresAt = new Date(tokenRow.expires_at).getTime();
        if (!Number.isNaN(expiresAt) && Date.now() > expiresAt) {
          return NextResponse.json(
            { ok: false, error: "Token expired" },
            { status: 401 }
          );
        }
      }
      projectId = tokenRow.project_id;
    }

    const rows = await query<ProjectRow>(
      `select generated_html, preview_password_hash, preview_password_salt
       from public.projects where id = $1`,
      [projectId]
    );

    const project = rows[0];
    if (!project) {
      return NextResponse.json(
        { ok: false, error: "Project not found" },
        { status: 404 }
      );
    }

    if (!token && project.preview_password_hash && project.preview_password_salt) {
      if (!password) {
        return NextResponse.json(
          { ok: false, error: "Password required", requiresPassword: true },
          { status: 401 }
        );
      }
      const hashed = hashPassword(password, project.preview_password_salt);
      const ok = crypto.timingSafeEqual(
        Buffer.from(hashed, "hex"),
        Buffer.from(project.preview_password_hash, "hex")
      );
      if (!ok) {
        return NextResponse.json(
          { ok: false, error: "密码错误", requiresPassword: true },
          { status: 401 }
        );
      }
    }

    const images = await query<ImageRow>(
      `select slot_id, image_url from public.images where project_id = $1`,
      [projectId]
    );

    const baseHtml =
      project.generated_html ??
      "<html><body style='font-family:Arial;padding:24px;'>没有可预览的内容。</body></html>";
    const html = injectImages(baseHtml, images);

    return NextResponse.json({ ok: true, html });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to load preview" },
      { status: 500 }
    );
  }
}
