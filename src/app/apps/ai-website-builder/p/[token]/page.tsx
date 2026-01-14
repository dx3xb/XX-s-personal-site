import styles from "../../page.module.css";

const FALLBACK_ORIGIN =
  "https://ai-website-builder-rho-self.vercel.app";

export default function AiWebsiteBuilderPublishedPage({
  params,
}: {
  params: { token: string };
}) {
  const origin =
    process.env.NEXT_PUBLIC_AI_WEBSITE_BUILDER_ORIGIN || FALLBACK_ORIGIN;
  const publishOrigin =
    process.env.NEXT_PUBLIC_AI_WEBSITE_BUILDER_PUBLISH_ORIGIN ||
    origin.replace(/\/apps\/ai-website-builder\/?$/, "");
  const token = params?.token;
  const src = token ? `${publishOrigin}/p/${token}` : publishOrigin;

  return (
    <div className={styles.shell}>
      <iframe
        className={styles.frame}
        src={src}
        title="AI Website Builder Published"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
