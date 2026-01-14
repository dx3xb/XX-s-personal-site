import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TARGET_ORIGIN = "https://webbuilder-pink.vercel.app";
const LOCAL_PREFIX = "/apps/webbuilder";

const rewriteHtml = (body: string) => {
  let output = body.replaceAll(TARGET_ORIGIN, LOCAL_PREFIX);
  output = output.replace(/(href|src)=([\"'])\//g, `$1=$2${LOCAL_PREFIX}/`);
  return output;
};

const rewriteCss = (body: string) => {
  return body.replace(/url\(\s*\//g, `url(${LOCAL_PREFIX}/`);
};

const buildTargetUrl = (requestUrl: URL, segments?: string[]) => {
  const path = segments && segments.length > 0 ? `/${segments.join("/")}` : "/";
  const targetUrl = new URL(path, TARGET_ORIGIN);
  targetUrl.search = requestUrl.search;
  return targetUrl;
};

const proxyRequest = async (request: Request, segments?: string[]) => {
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

  if (shouldRewriteHtml || shouldRewriteCss) {
    const text = await upstreamResponse.text();
    const rewritten = shouldRewriteHtml ? rewriteHtml(text) : rewriteCss(text);
    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.delete("content-length");
    responseHeaders.delete("content-encoding");
    return new NextResponse(rewritten, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  }

  const data = await upstreamResponse.arrayBuffer();
  const responseHeaders = new Headers(upstreamResponse.headers);
  responseHeaders.delete("content-encoding");
  return new NextResponse(data, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
};

export async function GET(
  request: Request,
  { params }: { params: { path?: string[] } }
) {
  return proxyRequest(request, params.path);
}

export async function POST(
  request: Request,
  { params }: { params: { path?: string[] } }
) {
  return proxyRequest(request, params.path);
}

export async function PUT(
  request: Request,
  { params }: { params: { path?: string[] } }
) {
  return proxyRequest(request, params.path);
}

export async function PATCH(
  request: Request,
  { params }: { params: { path?: string[] } }
) {
  return proxyRequest(request, params.path);
}

export async function DELETE(
  request: Request,
  { params }: { params: { path?: string[] } }
) {
  return proxyRequest(request, params.path);
}
