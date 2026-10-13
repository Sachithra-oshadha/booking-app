"use server";

import { revalidatePath } from "next/cache";
import { toResult } from "@/lib/errors";
import { decisionInput, formObject, parse } from "@/lib/validation";
import * as approvals from "@/server/approvals";
import { requirePermission } from "@/server/session";

const decide = (kind: "booking" | "series", decision: approvals.Decision) => async (fd: FormData) =>
  toResult(async () => {
    const actor = await requirePermission("booking:approve");
    const { id, note } = parse(decisionInput, formObject(fd));
    const r = kind === "booking" ? await approvals.decideBooking(actor, id, decision, note) : await approvals.decideSeries(actor, id, decision, note);
    revalidatePath("/", "layout");
    return r ?? null;
  });

export async function approveBooking(fd: FormData) { return decide("booking", "approved")(fd); }
export async function rejectBooking(fd: FormData) { return decide("booking", "rejected")(fd); }
export async function approveSeries(fd: FormData) { return decide("series", "approved")(fd); }
export async function rejectSeries(fd: FormData) { return decide("series", "rejected")(fd); }
