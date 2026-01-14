import { NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const distRoot = path.join(process.cwd(), "apps", "webbuilder", "dist");

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

const resolveFilePath = (segments?: string[]) => {
  const relativePath = segments && segments.length > 0 ? segments.join("/") : "index.html";
  const normalized = path.resolve(distRoot, relativePath);
  if (!normalized.startsWith(distRoot)) {
    return null;
  }
  return normalized;
};

export async function GET(
  _request: Request,
  { params }: { params: { path?: string[] } }
) {
  const filePath = resolveFilePath(params.path);
  if (!filePath) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = contentTypes[ext] || "application/octet-stream";
    return new NextResponse(data, {
      headers: {
        "content-type": contentType,
      },
    });
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return new NextResponse("Not Found", { status: 404 });
    }
    return new NextResponse("Failed to load asset", { status: 500 });
  }
}
