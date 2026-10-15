import { AuthForm } from "@/components/features/AuthForm";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return <AuthForm mode="login" showDemo />;
}
