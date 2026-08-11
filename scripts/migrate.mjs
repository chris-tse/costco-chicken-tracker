import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const MIGRATIONS_SCHEMA = "drizzle";
const MIGRATIONS_TABLE = "__drizzle_migrations";
const MIGRATION_FILE_NAME = "migration.sql";
const MIGRATION_DATE_LENGTH = 14;
const MIGRATION_STATEMENT_SEPARATOR = "--> statement-breakpoint";
const MIGRATION_TIMESTAMP_PATTERN = /^\d{14}$/;
const migrationFolder = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "drizzle"
);

function requiredDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run migrations.");
  }

  return databaseUrl;
}

function migrationTimestamp(directoryName) {
  const datePart = directoryName.slice(0, MIGRATION_DATE_LENGTH);

  if (!MIGRATION_TIMESTAMP_PATTERN.test(datePart)) {
    throw new Error(
      `Migration directory has no UTC timestamp: ${directoryName}`
    );
  }

  return Date.UTC(
    Number(datePart.slice(0, 4)),
    Number(datePart.slice(4, 6)) - 1,
    Number(datePart.slice(6, 8)),
    Number(datePart.slice(8, 10)),
    Number(datePart.slice(10, 12)),
    Number(datePart.slice(12, 14))
  );
}

function readMigrations() {
  if (!existsSync(migrationFolder)) {
    throw new Error("Committed migrations are missing from this image.");
  }

  return readdirSync(migrationFolder)
    .map((directoryName) => ({
      directoryName,
      path: join(migrationFolder, directoryName, MIGRATION_FILE_NAME),
    }))
    .filter((migration) => existsSync(migration.path))
    .sort((left, right) =>
      left.directoryName.localeCompare(right.directoryName)
    )
    .map(({ directoryName, path }) => {
      const source = readFileSync(path, "utf8");

      return {
        createdAt: migrationTimestamp(directoryName),
        hash: createHash("sha256").update(source).digest("hex"),
        statements: source
          .split(MIGRATION_STATEMENT_SEPARATOR)
          .filter((statement) => statement.trim().length > 0),
      };
    });
}

async function applyMigrations() {
  const client = new pg.Client({ connectionString: requiredDatabaseUrl() });

  try {
    await client.connect();
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${MIGRATIONS_SCHEMA}`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `);

    const appliedResult = await client.query(
      `SELECT created_at FROM ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE}`
    );
    const appliedCreatedAt = new Set(
      appliedResult.rows.map((migration) => Number(migration.created_at))
    );

    for (const migration of readMigrations()) {
      if (appliedCreatedAt.has(migration.createdAt)) {
        continue;
      }

      await client.query("BEGIN");
      try {
        for (const statement of migration.statements) {
          await client.query(statement);
        }
        await client.query(
          `INSERT INTO ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} (hash, created_at) VALUES ($1, $2)`,
          [migration.hash, migration.createdAt]
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

try {
  await applyMigrations();
} catch (error) {
  const message =
    error instanceof Error ? error.message : "Unknown migration failure.";
  process.stderr.write(`Migration failed: ${message}\n`);
  process.exitCode = 1;
}
