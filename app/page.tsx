import { Stage } from "@/src/scene/Stage";
import { EditionStamp } from "@/src/ui/EditionStamp";
import styles from "./page.module.css";

// Re-render the stamp every 5 minutes until the manifest drives it (M2/M3).
export const revalidate = 300;

export default function Home() {
  return (
    <main className={styles.main}>
      {/* CSS skeleton of the table, visible before three.js arrives (spec 8, loading order). */}
      <div className={styles.skeleton} aria-hidden="true">
        <div className={styles.canopy} />
        <div className={styles.table} />
      </div>
      <h1 className="visually-hidden">Paperstand: today&apos;s Nigerian front pages</h1>
      <Stage />
      <EditionStamp date={new Date()} />
    </main>
  );
}
