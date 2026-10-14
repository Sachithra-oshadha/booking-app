import { AuthForm } from "@/components/features/AuthForm";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <AuthForm mode="login" />
      <p className="muted small">Demo: admin1@demo.com or user1@demo.com, password Password123!</p>
    </>
  );
}
