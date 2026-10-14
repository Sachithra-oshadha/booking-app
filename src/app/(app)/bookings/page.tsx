import { BookingTable } from "@/components/features/BookingTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { myBookings, seriesInfo } from "@/server/bookings";
import { pageUser } from "@/server/session";

const TABS = [
  { key: "upcoming", label: "Upcoming", href: "/bookings?tab=upcoming" },
  { key: "past", label: "Past", href: "/bookings?tab=past" },
  { key: "cancelled", label: "Cancelled & rejected", href: "/bookings?tab=cancelled" },
];

export const metadata = { title: "My bookings" };

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await pageUser("booking:view:own");
  const { tab: t } = await searchParams;
  const tab = (TABS.find((x) => x.key === t)?.key ?? "upcoming") as "upcoming" | "past" | "cancelled";
  const rows = await myBookings(user.id, tab);
  const series = await seriesInfo([...new Set(rows.map((r) => r.seriesId).filter((x): x is string => !!x))]);
  return (
    <>
      <PageHeader title="My bookings" actions={<LinkButton href="/resources">Book a resource</LinkButton>} />
      <Tabs tabs={TABS} active={tab} />
      <BookingTable rows={rows} actor={user} series={series} />
    </>
  );
}
