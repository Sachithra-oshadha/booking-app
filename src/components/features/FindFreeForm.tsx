"use client";

import Link from "next/link";
import { useState } from "react";
import { findFreeResources } from "@/actions/availability";
import { ActionForm, SubmitButton } from "@/components/ui/ActionForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input, Select } from "@/components/ui/Input";
import type { Result } from "@/lib/errors";
import styles from "./FindFreeForm.module.css";

type Found = { date: string; startTime: string; endTime: string; items: { id: string; name: string; assetCode: string; typeName: string; locationPath: string; requiresApproval: boolean }[] };

export function FindFreeForm({
  types,
  locations,
}: {
  types: { id: string; name: string }[];
  locations: { id: string; label: string }[];
}) {
  const [found, setFound] = useState<Found | null>(null);
  return (
    <Card title="Find free resources">
      <ActionForm
        action={findFreeResources}
        successMessage={(d) => `${d.items.length} resource(s) free`}
        onResult={(r: Result<Found>) => setFound(r.ok ? r.data : null)}
        className={styles.form}
      >
        <FormField label="From" name="start">
          <Input type="datetime-local" name="start" step={900} required />
        </FormField>
        <FormField label="To" name="end">
          <Input type="datetime-local" name="end" step={900} required />
        </FormField>
        <FormField label="Type" name="typeId">
          <Select name="typeId" defaultValue="">
            <option value="">Any type</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Location (includes everything inside)" name="locationId">
          <Select name="locationId" defaultValue="">
            <option value="">Any location</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </Select>
        </FormField>
        <div className={styles.submit}>
          <SubmitButton>Search</SubmitButton>
        </div>
      </ActionForm>
      {found && (
        <ul className={styles.results}>
          {found.items.length === 0 && <li className="muted">Nothing is free for that time range.</li>}
          {found.items.map((r) => (
            <li key={r.id}>
              <div className="grow">
                <strong>{r.name}</strong> <span className="muted small">{r.assetCode} · {r.typeName} · {r.locationPath}</span>
              </div>
              {r.requiresApproval && <Badge status="pending">Needs approval</Badge>}
              <Link href={`/resources/${r.id}?date=${found.date}&start=${found.startTime}&end=${found.endTime}`}>Book →</Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
