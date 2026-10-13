// Prints the number of users so the container knows whether to seed.
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('select count(*)::int n from "user"').then((r) => console.log(r.rows[0].n)).finally(() => pool.end());
