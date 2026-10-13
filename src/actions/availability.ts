"use server";

import { toResult } from "@/lib/errors";
import { fromLocal } from "@/lib/time";
import { findFreeInput, formObject, parse } from "@/lib/validation";
import { AppError } from "@/lib/errors";
import { findFree } from "@/server/availability";
import { requirePermission } from "@/server/session";

export async function findFreeResources(fd: FormData) {
  return toResult(async () => {
    await requirePermission("resource:view");
    const v = parse(findFreeInput, formObject(fd));
    const [sd, st] = v.start.split("T");
    const [ed, et] = v.end.split("T");
    const start = fromLocal(sd, st);
    const end = fromLocal(ed, et);
    if (end <= start) throw new AppError("VALIDATION", "End must be after start.", { fieldErrors: { end: "Must be after start" } });
    const rows = await findFree({ start, end, typeId: v.typeId, locationId: v.locationId });
    return { date: sd, startTime: st, endTime: et, items: rows.map((r) => ({ id: r.id, name: r.name, assetCode: r.assetCode, typeName: r.typeName, locationPath: r.locationPath, requiresApproval: r.rules.requiresApproval })) };
  });
}
