import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  accounts,
  chickenSightings,
  inviteCodes,
  sessions,
  stores,
  users,
  verifications,
} from "@/lib/db/schema";
import { env } from "@/lib/env";

const INVITE_CODE_COOKIE_RE = /(?:^|;\s*)invite_code=([^;]+)/;

function getBaseURL(): string {
  if (env.BETTER_AUTH_URL) {
    return env.BETTER_AUTH_URL;
  }
  if (env.VERCEL_URL) {
    return `https://${env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
    schema: {
      users,
      sessions,
      accounts,
      verifications,
      stores,
      inviteCodes,
      chickenSightings,
    },
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: getBaseURL(),
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  user: {
    additionalFields: {
      default_store_id: {
        type: "number",
        input: false,
      },
      commute_minutes: {
        type: "number",
        input: false,
      },
      trust_score: {
        type: "string",
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user, ctx) => {
          const cookieHeader = ctx?.headers?.get("cookie") ?? "";
          const match = INVITE_CODE_COOKIE_RE.exec(cookieHeader);
          const code = match?.[1];

          if (!code) {
            throw new Error("Invite code is required to sign up");
          }

          const [inviteCode] = await db
            .select()
            .from(inviteCodes)
            .where(
              and(
                eq(inviteCodes.code, code),
                isNull(inviteCodes.used_by),
                isNull(inviteCodes.revoked_at)
              )
            )
            .limit(1);

          if (!inviteCode) {
            throw new Error("Invalid or already used invite code");
          }

          return { data: user };
        },
        after: async (user, ctx) => {
          const cookieHeader = ctx?.headers?.get("cookie") ?? "";
          const match = INVITE_CODE_COOKIE_RE.exec(cookieHeader);
          const code = match?.[1];

          if (code) {
            await db
              .update(inviteCodes)
              .set({
                used_by: user.id,
                used_at: new Date(),
              })
              .where(eq(inviteCodes.code, code));
          }
        },
      },
    },
  },
  plugins: [tanstackStartCookies()],
});
