import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true, autoSignIn: true },
  user: {
    additionalFields: {
      // input: false => nobody can register themselves as admin
      role: { type: "string", required: false, defaultValue: "user", input: false },
    },
  },
  plugins: [nextCookies()], // must be last
});
