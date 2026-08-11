import "@tanstack/react-start/server-only";

import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

export async function isDatabaseReachable(): Promise<boolean> {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}
