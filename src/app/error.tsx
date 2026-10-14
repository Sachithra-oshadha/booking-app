"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import styles from "./(auth)/auth.module.css";

export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className={styles.wrap} role="alert">
      <h1>Something went wrong</h1>
      <p className="muted">The page couldn&apos;t be loaded. Your data is safe.</p>
      <div className="row">
        <Button onClick={() => retry()}>Try again</Button>
        <Link href="/resources">Back to resources</Link>
      </div>
    </div>
  );
}
