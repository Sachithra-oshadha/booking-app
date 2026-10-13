"use server";

import { revalidatePath } from "next/cache";
import { toResult } from "@/lib/errors";
import { fromLocal } from "@/lib/time";
import { bookingInput, formObject, parse, seriesInput } from "@/lib/validation";
import * as bookings from "@/server/bookings";
import * as series from "@/server/series";
import { can } from "@/server/permissions";
import { requirePermission, requireUser } from "@/server/session";

const refresh = () => revalidatePath("/", "layout");

export async function createBooking(fd: FormData) {
  return toResult(async () => {
    const actor = await requirePermission("booking:create");
    const v = parse(bookingInput, formObject(fd));
    const b = await bookings.createBooking(actor, {
      resourceId: v.resourceId,
      startsAt: fromLocal(v.date, v.startTime),
      endsAt: fromLocal(v.date, v.endTime),
      purpose: v.purpose,
    });
    refresh();
    return { status: b.status };
  });
}

export async function createSeries(fd: FormData) {
  return toResult(async () => {
    const actor = await requirePermission("booking:create");
    const s = await series.createSeries(actor, parse(seriesInput, formObject(fd)));
    refresh();
    return { count: s.count };
  });
}

export async function cancelBooking(id: string) {
  return toResult(async () => {
    const actor = await requireUser();
    if (!can(actor, "booking:cancel:own") && !can(actor, "booking:cancel:any")) await requirePermission("booking:cancel:own");
    await bookings.cancelBooking(actor, id);
    refresh();
  });
}

export async function cancelSeries(id: string) {
  return toResult(async () => {
    const actor = await requireUser();
    if (!can(actor, "booking:cancel:own") && !can(actor, "booking:cancel:any")) await requirePermission("booking:cancel:own");
    const r = await series.cancelSeries(actor, id);
    refresh();
    return { message: `${r.cancelled} cancelled${r.tooLate ? `, ${r.tooLate} too close to the start to cancel` : ""}` };
  });
}
