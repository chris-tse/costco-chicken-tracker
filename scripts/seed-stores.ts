import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";

import { syncStores } from "@/lib/pipeline/store-sync";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || databaseUrl.trim().length === 0) {
  console.error("db:seed requires DATABASE_URL");
  process.exit(1);
}

seedStores(databaseUrl).catch((error) => {
  console.error("db:seed failed");
  console.error(error);
  process.exit(1);
});

async function seedStores(connectionString: string): Promise<void> {
  const db = drizzle(connectionString);
  const summary = await syncStores({ db });

  console.log(formatSummary("db:seed", summary));
}

function formatSummary(
  commandName: string,
  summary: {
    deactivated: number;
    inserted: number;
    reactivated: number;
    unchanged: number;
    updated: number;
  }
): string {
  return `${commandName} completed: ${summary.inserted} inserted, ${summary.updated} updated, ${summary.reactivated} reactivated, ${summary.deactivated} deactivated, ${summary.unchanged} unchanged`;
}
