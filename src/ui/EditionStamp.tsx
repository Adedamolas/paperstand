import { editionStamp } from '@/src/lib/time';
import styles from './EditionStamp.module.css';

/** Server-rendered so the stamp is in the HTML before any JS (spec 2.2, 8). */
export function EditionStamp({ date, late }: { date: Date; late?: boolean }) {
  return <p className={styles.stamp}>{editionStamp(date, late)}</p>;
}
