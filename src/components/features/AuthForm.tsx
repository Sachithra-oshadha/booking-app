"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Corners } from "@/components/ui/Corners";
import { Input } from "@/components/ui/Input";
import { authClient } from "@/lib/auth-client";
import styles from "./AuthForm.module.css";
import { ArrowRight } from "lucide-react";

const DEMO_PASSWORD = "Password123!";
const DEMO_ACCOUNTS = [
  { email: "admin1@demo.com", role: "Admin" },
  { email: "user1@demo.com", role: "User" },
];

function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <span className={styles.pw}>
      <Input {...props} type={show ? "text" : "password"} />

      <button
        type="button"
        className={styles.toggle}
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </span>
  );
}

export function AuthForm({ mode, showDemo = false }: { mode: "login" | "register"; showDemo?: boolean }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const register = mode === "register";

  function fillDemo(email: string) {
    const form = formRef.current;
    if (!form) return;
    (form.elements.namedItem("email") as HTMLInputElement).value = email;
    (form.elements.namedItem("password") as HTMLInputElement).value = DEMO_PASSWORD;
    setError(null);
    form.querySelector<HTMLButtonElement>('button[type="submit"]')?.focus();
  }

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
    <div className={styles.wrap}>
      <form ref={formRef} onSubmit={submit} className={styles.form}>
        <div className={styles.head}>
          <h1 className={styles.title}>{register ? "Create account" : "Sign in"}</h1>
          <p className={styles.alt}>
            {register ? (
              <>Already have an account? <Link href="/login">Sign in</Link></>
            ) : (
              <>New here? <Link href="/register">Create an account</Link></>
            )}
          </p>
        </div>
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
          <PasswordInput name="password" required minLength={8} autoComplete={register ? "new-password" : "current-password"} />
          {register && <span className={styles.hint}>At least 8 characters</span>}
        </label>
        {register && (
          <label>
            Confirm password
            <PasswordInput name="confirm" required minLength={8} autoComplete="new-password" />
          </label>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy} className={styles.submit}>
          {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
        </Button>
      </form>

      {showDemo && !register && (
        <section className={styles.demo} aria-labelledby="demo-title">
          <Corners />
          <div className={styles.demoHead}>
            <h2 id="demo-title" className={styles.demoTitle}>Demo accounts</h2>
            <span className={styles.demoPw}>Password {DEMO_PASSWORD}</span>
          </div>
          {DEMO_ACCOUNTS.map((a) => (
            <button key={a.email} type="button" className={styles.demoRow} onClick={() => fillDemo(a.email)}>
              <span className={styles.demoWho}>
                <span className={styles.demoEmail}>{a.email}</span>
                <span className={styles.demoRole}>{a.role}</span>
              </span>
              <span className={styles.demoUse} aria-hidden="true">Use <ArrowRight size={13} style={{ verticalAlign: "text-bottom" }} /></span>
              <span className="sr-only">Fill the form with this account</span>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
