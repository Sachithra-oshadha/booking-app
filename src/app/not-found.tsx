import Link from "next/link";
import styles from "./(auth)/auth.module.css";

export default function NotFound() {
  return (
    <div className={styles.wrap}>
      <h1>Page not found</h1>
      <p className="muted">That page doesn&apos;t exist or you can&apos;t access it.</p>
      <Link href="/resources">Back to resources</Link>
    </div>
  );
}
