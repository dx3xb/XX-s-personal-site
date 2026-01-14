import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const redirectToApps = async (request: NextRequest, segments?: string[]) => {
  const path = segments && segments.length > 0 ? `/${segments.join("/")}` : "";
  const targetUrl = new URL(`/apps/webbuilder${path}`, request.url);
  targetUrl.search = new URL(request.url).search;
  return NextResponse.redirect(targetUrl, 307);
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  return redirectToApps(request, path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  return redirectToApps(request, path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  return redirectToApps(request, path);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  return redirectToApps(request, path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  return redirectToApps(request, path);
}
