// Drops everything (public + drizzle migration bookkeeping) so migrate + seed start clean.
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query("DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;");
  await pool.end();
  console.log("database reset");
}
main();
