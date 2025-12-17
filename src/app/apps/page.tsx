import Link from "next/link";
import styles from "./page.module.css";

const apps = [
  {
    title: "Pixel Sketch",
    description: "A tiny canvas for doodling ideas with a pixel brush.",
    link: "https://example.com/pixel-sketch",
  },
  {
    title: "Focus Timer",
    description: "Minimal pomodoro timer with keyboard shortcuts.",
    link: "https://example.com/focus-timer",
  },
  {
    title: "Palette Picker",
    description: "Generate and save color palettes for your next project.",
    link: "https://example.com/palette-picker",
  },
  {
    title: "Markdown Preview",
    description: "Live markdown previewer with export to HTML.",
    link: "https://example.com/markdown-preview",
  },
];

export default function AppsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Mini Apps</h1>
        <p className={styles.subtitle}>
          A rotating shelf of experiments built for fun and learning.
        </p>
      </header>
      <section className={styles.grid}>
        {apps.map((app) => (
          <article key={app.title} className={styles.card}>
            <h2 className={styles.cardTitle}>{app.title}</h2>
            <p className={styles.cardDescription}>{app.description}</p>
            <Link className={styles.cardLink} href={app.link}>
              Open app
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
