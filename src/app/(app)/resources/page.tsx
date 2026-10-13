import { FindFreeForm } from "@/components/features/FindFreeForm";
import { ResourceCard } from "@/components/features/ResourceCard";
import { ResourceFilters } from "@/components/features/ResourceFilters";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { db } from "@/db";
import { resourceTypes } from "@/db/schema";
import { listResources } from "@/server/availability";
import { listLocations } from "@/server/locations";
import { pageUser } from "@/server/session";
import styles from "./page.module.css";

const PAGE_SIZE = 24;

type Search = { q?: string; type?: string; location?: string; status?: string; now?: string; page?: string };

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<Search> }) {
  await pageUser("resource:view");
  const sp = await searchParams;
  const [types, locations, items] = await Promise.all([
    db.select({ id: resourceTypes.id, name: resourceTypes.name }).from(resourceTypes).orderBy(resourceTypes.name),
    listLocations(),
    listResources({ q: sp.q, typeId: sp.type, locationId: sp.location, status: sp.status, availableNow: sp.now === "1" }),
  ]);
  const page = Math.max(1, Number(sp.page) || 1);
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const shown = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <PageHeader title="Resources" subtitle={`${items.length} found`} />
      <FindFreeForm types={types} locations={locations.map((l) => ({ id: l.id, label: `${"  ".repeat(l.depth)}${l.name} (${l.kind})` }))} />
      <ResourceFilters types={types} locations={locations} values={sp} />
      {shown.length === 0 ? (
        <EmptyState title="No resources match">Try clearing a filter.</EmptyState>
      ) : (
        <div className={styles.grid}>
          {shown.map((r) => (
            <ResourceCard key={r.id} r={r} freeNow={r.freeNow} />
          ))}
        </div>
      )}
      <Pagination path="/resources" params={{ q: sp.q, type: sp.type, location: sp.location, status: sp.status, now: sp.now }} page={page} pages={pages} />
    </>
  );
}
