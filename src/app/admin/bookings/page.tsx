import Link from "next/link";
import { BookingTable } from "@/components/features/BookingTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { fromLocal } from "@/lib/time";
import { addDays } from "@/lib/time";
import { loadResources } from "@/server/availability";
import { ADMIN_PAGE_SIZE, adminBookings, seriesInfo } from "@/server/bookings";
import { pageUser } from "@/server/session";
import styles from "./page.module.css";

type Search = { status?: string; resource?: string; user?: string; from?: string; to?: string; page?: string };
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f-]{36}$/i;

export const metadata = { title: "All bookings" };

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const actor = await pageUser("booking:view:all");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total } = await adminBookings({
    status: sp.status || undefined,
    resourceId: sp.resource && UUID.test(sp.resource) ? sp.resource : undefined,
    user: sp.user || undefined,
    from: sp.from && DATE.test(sp.from) ? fromLocal(sp.from, "00:00") : undefined,
    to: sp.to && DATE.test(sp.to) ? fromLocal(addDays(sp.to, 1), "00:00") : undefined,
    page,
  });
  const [resources, series] = await Promise.all([
    loadResources(),
    seriesInfo([...new Set(rows.map((r) => r.seriesId).filter((x): x is string => !!x))]),
  ]);

  return (
    <>
      <PageHeader title="All bookings" subtitle={`${total} found`} />
      <form method="get" className={styles.filters}>
        <Select name="status" defaultValue={sp.status ?? ""} aria-label="Status">
          <option value="">Any status</option>
          {["pending", "approved", "rejected", "cancelled", "expired"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
        <Select name="resource" defaultValue={sp.resource ?? ""} aria-label="Resource">
          <option value="">Any resource</option>
          {resources.map((r) => (
            <option key={r.id} value={r.id}>{r.assetCode} · {r.name}</option>
          ))}
        </Select>
        <Input name="user" placeholder="User name or email" defaultValue={sp.user} aria-label="User" />
        <Input type="date" name="from" defaultValue={sp.from} aria-label="From date" />
        <Input type="date" name="to" defaultValue={sp.to} aria-label="To date" />
        <Button type="submit">Filter</Button>
        {(sp.status || sp.resource || sp.user || sp.from || sp.to) && <Link href="/admin/bookings">Clear filters</Link>}
      </form>
      <BookingTable rows={rows} actor={actor} series={series} showUser />
      <Pagination path="/admin/bookings" params={{ status: sp.status, resource: sp.resource, user: sp.user, from: sp.from, to: sp.to }} page={page} pages={Math.ceil(total / ADMIN_PAGE_SIZE)} />
    </>
  );
}
