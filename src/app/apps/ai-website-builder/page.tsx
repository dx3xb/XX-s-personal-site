import styles from "./page.module.css";

const FALLBACK_ORIGIN =
  "https://ai-website-builder-rho-self.vercel.app/apps/ai-website-builder";

export default function AiWebsiteBuilderPage() {
  const origin =
    process.env.NEXT_PUBLIC_AI_WEBSITE_BUILDER_ORIGIN || FALLBACK_ORIGIN;

  return (
    <div className={styles.shell}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>AI Website Builder</div>
          <div className={styles.subtitle}>Embedded app</div>
        </div>
        <a className={styles.link} href={origin} target="_blank" rel="noreferrer">
          Open in new tab
        </a>
      </div>
      <iframe
        className={styles.frame}
        src={origin}
        title="AI Website Builder"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}
