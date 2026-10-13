"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authClient } from "@/lib/auth-client";
import styles from "./AuthForm.module.css";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const register = mode === "register";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const password = String(f.get("password"));
    setError(null);
    if (register && password !== f.get("confirm")) return setError("Passwords don't match.");
    setBusy(true);
    const res = register
      ? await authClient.signUp.email({ name: String(f.get("name")), email, password })
      : await authClient.signIn.email({ email, password });
    setBusy(false);
    if (res.error) return setError(res.error.message ?? "Something went wrong.");
    router.push("/resources");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className={styles.form}>
      <h1>{register ? "Create account" : "Sign in"}</h1>
      {register && (
        <label>
          Name
          <Input name="name" required autoComplete="name" />
        </label>
      )}
      <label>
        Email
        <Input name="email" type="email" required autoComplete="email" />
      </label>
      <label>
        Password
        <Input name="password" type="password" required minLength={8} autoComplete={register ? "new-password" : "current-password"} />
      </label>
      {register && (
        <label>
          Confirm password
          <Input name="confirm" type="password" required minLength={8} autoComplete="new-password" />
        </label>
      )}
      {error && <p className={styles.error} role="alert">{error}</p>}
      <Button type="submit" disabled={busy}>
        {busy ? "Please wait…" : register ? "Register" : "Sign in"}
      </Button>
      <p className="muted small">
        {register ? (
          <>Already have an account? <Link href="/login">Sign in</Link></>
        ) : (
          <>New here? <Link href="/register">Create an account</Link></>
        )}
      </p>
    </form>
  );
}
