import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Reuse the pool across hot reloads in dev.
const g = globalThis as unknown as { __pool?: Pool };
export const pool = (g.__pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 10 }));

export const db = drizzle(pool, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
