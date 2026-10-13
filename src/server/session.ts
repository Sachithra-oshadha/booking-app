import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { can, type Actor, type Permission } from "./permissions";

export async function getUser(): Promise<Actor | null> {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) return null;
  const u = s.user as typeof s.user & { role?: string };
  return { id: u.id, name: u.name, email: u.email, role: u.role ?? "user" };
}

/** For server actions / services: throws AppError (turned into a typed result). */
export async function requireUser(): Promise<Actor> {
  const u = await getUser();
  if (!u) throw new AppError("UNAUTHENTICATED", "Please sign in again.");
  return u;
}

export async function requirePermission(permission: Permission): Promise<Actor> {
  const u = await requireUser();
  if (!can(u, permission)) throw new AppError("FORBIDDEN", "You don't have permission to do that.");
  return u;
}

/** For pages: redirects to /login, or 404s when the permission is missing. */
export async function pageUser(permission?: Permission): Promise<Actor> {
  const u = await getUser();
  if (!u) redirect("/login");
  if (permission && !can(u, permission)) notFound();
  return u;
}
