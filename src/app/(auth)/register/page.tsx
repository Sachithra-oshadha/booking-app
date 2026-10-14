import { AuthForm } from "@/components/features/AuthForm";

export const metadata = { title: "Create account" };

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
