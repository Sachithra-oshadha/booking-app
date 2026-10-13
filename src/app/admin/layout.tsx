import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AppShell } from "@/components/layout/AppShell";
import { pageUser } from "@/server/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Coarse gate only. Every admin page and action re-checks its own permission.
  const user = await pageUser("booking:approve");
  return (
    <AppShell user={user} sidebar={<AdminSidebar />}>
      {children}
    </AppShell>
  );
}
