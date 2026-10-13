"use server";

import { revalidatePath } from "next/cache";
import { toResult } from "@/lib/errors";
import * as n from "@/server/notifications";
import { requireUser } from "@/server/session";

export async function markNotificationRead(id: string) {
  return toResult(async () => {
    await n.markRead((await requireUser()).id, id);
    revalidatePath("/", "layout");
  });
}

export async function markAllRead() {
  return toResult(async () => {
    await n.markAllRead((await requireUser()).id);
    revalidatePath("/", "layout");
  });
}
