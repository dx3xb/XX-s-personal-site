import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.label}>Welcome</p>
        <h1 className={styles.title}>XX’s Lab</h1>
        <p className={styles.subtitle}>
          Personal playground for small web apps
        </p>
        <Link className={styles.button} href="/apps">
          Explore apps
        </Link>
      </div>
    </main>
  );
}
