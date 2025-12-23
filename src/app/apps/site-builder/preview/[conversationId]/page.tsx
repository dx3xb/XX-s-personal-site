import PreviewClient from "./PreviewClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SiteBuilderPreviewPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId: projectId } = await params;
  return <PreviewClient projectId={projectId} />;
}
