import PreviewClient from "@/app/apps/site-builder/preview/[conversationId]/PreviewClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function TokenPreviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PreviewClient token={token} />;
}
