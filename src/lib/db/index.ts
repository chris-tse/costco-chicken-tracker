import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";

import { schema } from "@/lib/db/schema";
import { env } from "@/lib/env";

export const db = drizzle(env.DATABASE_URL, { schema });
