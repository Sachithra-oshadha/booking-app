import { AuthForm } from "@/components/features/AuthForm";

export default function LoginPage() {
  return (
    <>
      <AuthForm mode="login" />
      <p className="muted small">Demo: admin1@demo.com or user1@demo.com, password Password123!</p>
    </>
  );
}
