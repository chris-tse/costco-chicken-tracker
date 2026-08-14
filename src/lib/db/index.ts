import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";

import { schema } from "@/lib/db/schema";
import { env } from "@/lib/env";

export const DATABASE_OPERATION_TIMEOUT_MS = 4000;

export const db = drizzle({
  connection: {
    connectionString: env.DATABASE_URL,
    connectionTimeoutMillis: DATABASE_OPERATION_TIMEOUT_MS,
    query_timeout: DATABASE_OPERATION_TIMEOUT_MS,
    statement_timeout: DATABASE_OPERATION_TIMEOUT_MS,
  },
  schema,
});
