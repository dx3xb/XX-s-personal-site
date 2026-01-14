import Link from "next/link";
import styles from "./page.module.css";

export default function BettafishPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.kicker}>Reserved Route</p>
        <h1 className={styles.title}>BettaFish</h1>
        <p className={styles.subtitle}>
          This path is reserved for the BettaFish project. Add the project link
          when it is ready.
        </p>
        <Link className={styles.link} href="/apps">
          Explore apps
        </Link>
      </section>
    </main>
  );
}
