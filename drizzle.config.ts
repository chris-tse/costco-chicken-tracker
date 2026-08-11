import { resolve } from "node:path";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: [".env.local", ".env"] });

process.env.JITI_ALIAS ??= JSON.stringify({
  "@": resolve(process.cwd(), "src"),
});

export default defineConfig({
  out: "./drizzle",
  schema: "./src/lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    // biome-ignore lint/style/noNonNullAssertion: drizzle
    url: process.env.DATABASE_URL!,
  },
});
