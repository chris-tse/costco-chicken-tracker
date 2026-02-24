import { env } from "@/lib/env";

export const INVITE_CODE_COOKIE_RE = /(?:^|;\s*)invite_code=([^;]+)/;

export function getBaseURL(): string {
  if (env.BETTER_AUTH_URL) {
    return env.BETTER_AUTH_URL;
  }
  if (env.VERCEL_URL) {
    return `https://${env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}
