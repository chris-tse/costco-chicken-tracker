import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const MIGRATIONS_SCHEMA = "drizzle";
const MIGRATIONS_TABLE = "__drizzle_migrations";
const MIGRATION_FILE_NAME = "migration.sql";
const MIGRATION_STATEMENT_SEPARATOR = "--> statement-breakpoint";
const MIGRATION_DIRECTORY_PATTERN = /^(\d{14})_[a-z0-9][a-z0-9_-]*$/i;
const MIGRATION_DIRECTORY_PREFIX_PATTERN = /^\d/;
const MIGRATION_CREATED_AT_PATTERN = /^\d+$/;
const MIGRATION_ADVISORY_LOCK_KEY = "481849106705489314";
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

export function migrationTimestamp(directoryName) {
  const directoryMatch = MIGRATION_DIRECTORY_PATTERN.exec(directoryName);

  if (!directoryMatch) {
    throw new Error(
      `Migration directory must begin with a UTC timestamp and name: ${directoryName}`
    );
  }

  const datePart = directoryMatch[1];
  const year = Number(datePart.slice(0, 4));
  const month = Number(datePart.slice(4, 6)) - 1;
  const day = Number(datePart.slice(6, 8));
  const hour = Number(datePart.slice(8, 10));
  const minute = Number(datePart.slice(10, 12));
  const second = Number(datePart.slice(12, 14));
  const createdAt = Date.UTC(year, month, day, hour, minute, second);
  const date = new Date(createdAt);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second
  ) {
    throw new Error(
      `Migration directory has an invalid UTC calendar timestamp: ${directoryName}`
    );
  }

  return createdAt;
}

export function readMigrations(directory = migrationFolder) {
  if (!existsSync(directory)) {
    throw new Error("Committed migrations are missing from this image.");
  }

  const migrations = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => {
      const migrationPath = join(directory, entry.name, MIGRATION_FILE_NAME);

      if (!existsSync(migrationPath)) {
        if (MIGRATION_DIRECTORY_PREFIX_PATTERN.test(entry.name)) {
          throw new Error(
            `Migration directory is missing ${MIGRATION_FILE_NAME}: ${entry.name}`
          );
        }

        return false;
      }

      if (!MIGRATION_DIRECTORY_PATTERN.test(entry.name)) {
        throw new Error(
          `Migration directory must begin with a UTC timestamp and name: ${entry.name}`
        );
      }

      return true;
    })
    .map((entry) => ({
      directoryName: entry.name,
      path: join(directory, entry.name, MIGRATION_FILE_NAME),
    }))
    .map((migration) => {
      if (!existsSync(migration.path)) {
        throw new Error(
          `Migration directory is missing ${MIGRATION_FILE_NAME}: ${migration.directoryName}`
        );
      }

      return migration;
    })
    .sort((left, right) =>
      left.directoryName.localeCompare(right.directoryName)
    )
    .map(({ directoryName, path }) => {
      const source = readFileSync(path, "utf8");

      return {
        createdAt: migrationTimestamp(directoryName),
        directoryName,
        hash: createHash("sha256").update(source).digest("hex"),
        statements: source
          .split(MIGRATION_STATEMENT_SEPARATOR)
          .filter((statement) => statement.trim().length > 0),
      };
    });

  const migrationDirectoriesByTimestamp = new Map();

  for (const migration of migrations) {
    const duplicateDirectory = migrationDirectoriesByTimestamp.get(
      migration.createdAt
    );

    if (duplicateDirectory) {
      throw new Error(
        `Migration timestamp collision between ${duplicateDirectory} and ${migration.directoryName}`
      );
    }

    migrationDirectoriesByTimestamp.set(
      migration.createdAt,
      migration.directoryName
    );
  }

  return migrations;
}

function appliedMigrationMap(rows) {
  const hashesByTimestamp = new Map();

  for (const row of rows) {
    if (
      (typeof row.created_at !== "number" &&
        typeof row.created_at !== "string") ||
      !MIGRATION_CREATED_AT_PATTERN.test(String(row.created_at)) ||
      typeof row.hash !== "string" ||
      row.hash.length === 0
    ) {
      throw new Error("Migration history has an invalid identity or hash.");
    }

    const createdAt = Number(row.created_at);

    if (!Number.isSafeInteger(createdAt)) {
      throw new Error("Migration history has an invalid identity or hash.");
    }

    if (hashesByTimestamp.has(createdAt)) {
      throw new Error(
        `Migration history has duplicate timestamp identity: ${createdAt}`
      );
    }

    hashesByTimestamp.set(createdAt, row.hash);
  }

  return hashesByTimestamp;
}

export async function applyMigrations({
  databaseUrl = requiredDatabaseUrl(),
  directory = migrationFolder,
} = {}) {
  const client = new pg.Client({ connectionString: databaseUrl });
  let advisoryLockHeld = false;

  try {
    await client.connect();
    await client.query("SELECT pg_advisory_lock($1::bigint)", [
      MIGRATION_ADVISORY_LOCK_KEY,
    ]);
    advisoryLockHeld = true;

    const migrations = readMigrations(directory);

    await client.query(`CREATE SCHEMA IF NOT EXISTS ${MIGRATIONS_SCHEMA}`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `);
    const appliedResult = await client.query(
      `SELECT hash, created_at FROM ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE}`
    );
    const appliedHashesByTimestamp = appliedMigrationMap(appliedResult.rows);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ${MIGRATIONS_TABLE}_created_at_unique
      ON ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} (created_at)
    `);

    for (const migration of migrations) {
      const appliedHash = appliedHashesByTimestamp.get(migration.createdAt);

      if (appliedHash !== undefined) {
        if (appliedHash !== migration.hash) {
          throw new Error(
            `Migration drift detected for timestamp ${migration.createdAt}. Applied hash does not match the committed migration.`
          );
        }

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
    if (advisoryLockHeld) {
      await client
        .query("SELECT pg_advisory_unlock($1::bigint)", [
          MIGRATION_ADVISORY_LOCK_KEY,
        ])
        .catch(() => undefined);
    }
    await client.end();
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    await applyMigrations();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown migration failure.";
    process.stderr.write(`Migration failed: ${message}\n`);
    process.exitCode = 1;
  }
}
