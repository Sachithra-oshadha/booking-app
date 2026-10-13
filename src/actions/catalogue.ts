"use server";

import { revalidatePath } from "next/cache";
import { toResult } from "@/lib/errors";
import { formObject, locationInput, parse, parseRules, resourceInput, typeInput } from "@/lib/validation";
import * as cat from "@/server/catalogue";
import * as loc from "@/server/locations";
import { requirePermission } from "@/server/session";

const refresh = () => revalidatePath("/", "layout");

// ---- settings
export async function updateGlobalSettings(fd: FormData) {
  return toResult(async () => {
    await requirePermission("settings:manage");
    await cat.updateGlobalSettings(parseRules(formObject(fd), false));
    refresh();
  });
}

// ---- resource types
export async function saveResourceType(fd: FormData) {
  return toResult(async () => {
    await requirePermission("resource-type:manage");
    const o = formObject(fd);
    const input = parse(typeInput, o);
    const rules = parseRules(o, true);
    if (typeof o.id === "string") await cat.updateType(o.id, input, rules);
    else await cat.createType(input, rules);
    refresh();
  });
}
export async function deleteResourceType(id: string) {
  return toResult(async () => {
    await requirePermission("resource-type:manage");
    await cat.deleteType(id);
    refresh();
  });
}

// ---- resources
export async function saveResource(fd: FormData) {
  return toResult(async () => {
    await requirePermission("resource:manage");
    const o = formObject(fd);
    const input = parse(resourceInput, o);
    const rules = parseRules(o, true);
    let upcoming = 0;
    if (typeof o.id === "string") upcoming = await cat.updateResource(o.id, input, rules);
    else await cat.createResource(input, rules);
    refresh();
    return { message: upcoming > 0 ? `Saved. ${upcoming} upcoming booking(s) were not cancelled, so review them.` : "Resource saved" };
  });
}
export async function retireResource(id: string) {
  return toResult(async () => {
    await requirePermission("resource:manage");
    const upcoming = await cat.retireResource(id);
    refresh();
    return { message: upcoming > 0 ? `Retired. ${upcoming} upcoming booking(s) still exist, so review them.` : "Retired" };
  });
}

// ---- locations
export async function saveLocation(fd: FormData) {
  return toResult(async () => {
    await requirePermission("location:manage");
    const o = formObject(fd);
    if (typeof o.id === "string") await loc.updateLocation(o.id, { name: parse(locationInput.pick({ name: true }), o).name });
    else await loc.createLocation(parse(locationInput, o));
    refresh();
  });
}
export async function deleteLocation(id: string) {
  return toResult(async () => {
    await requirePermission("location:manage");
    await loc.deleteLocation(id);
    refresh();
  });
}

// ---- users
export async function setUserRole(userId: string, role: string) {
  return toResult(async () => {
    const actor = await requirePermission("user:manage-roles");
    await cat.setUserRole(actor, userId, role);
    refresh();
  });
}
