import { AppShell } from "@/components/layout/AppShell";
import { pageUser } from "@/server/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await pageUser();
  return <AppShell user={user}>{children}</AppShell>;
}
