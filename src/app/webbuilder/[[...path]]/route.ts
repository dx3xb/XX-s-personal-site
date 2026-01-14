import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TARGET_ORIGIN = "https://webbuilder-pink.vercel.app";
const LOCAL_PREFIX = "/webbuilder";

const rewriteHtml = (body: string) => {
  let output = body.replaceAll(TARGET_ORIGIN, LOCAL_PREFIX);
  output = output.replace(/(href|src)=([\"'])\//g, `$1=$2${LOCAL_PREFIX}/`);
  return output;
};

const rewriteCss = (body: string) => {
  return body.replace(/url\(\s*\/(?!\/)/g, `url(${LOCAL_PREFIX}/`);
};

const buildTargetUrl = (requestUrl: URL, segments?: string[]) => {
  const path = segments && segments.length > 0 ? `/${segments.join("/")}` : "/";
  const targetUrl = new URL(path, TARGET_ORIGIN);
  targetUrl.search = requestUrl.search;
  return targetUrl;
};

const rewriteLocation = (value: string | null) => {
  if (!value) return value;
  if (value.startsWith(TARGET_ORIGIN)) {
    return `${LOCAL_PREFIX}${value.slice(TARGET_ORIGIN.length)}`;
  }
  if (value.startsWith("/")) {
    return `${LOCAL_PREFIX}${value}`;
  }
  return value;
};

const proxyRequest = async (request: NextRequest, segments?: string[]) => {
  const requestUrl = new URL(request.url);
  const targetUrl = buildTargetUrl(requestUrl, segments);
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.set("accept-encoding", "identity");

  const method = request.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);

  const upstreamResponse = await fetch(targetUrl, {
    method,
    headers,
    body: hasBody ? request.body : undefined,
    redirect: "manual",
  });

  const contentType = upstreamResponse.headers.get("content-type") || "";
  const shouldRewriteHtml = contentType.includes("text/html");
  const shouldRewriteCss = contentType.includes("text/css");

  const responseHeaders = new Headers(upstreamResponse.headers);
  responseHeaders.delete("content-length");
  responseHeaders.delete("content-encoding");
  const location = rewriteLocation(upstreamResponse.headers.get("location"));
  if (location) {
    responseHeaders.set("location", location);
  }

  if (shouldRewriteHtml || shouldRewriteCss) {
    const text = await upstreamResponse.text();
    const rewritten = shouldRewriteHtml ? rewriteHtml(text) : rewriteCss(text);
    return new NextResponse(rewritten, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  }

  const data = await upstreamResponse.arrayBuffer();
  return new NextResponse(data, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}
