// @vitest-environment node

import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { Client } from "pg";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { migrationTimestamp, readMigrations } from "./migrate.mjs";

const executeFile = promisify(execFile);
const databaseUrl = process.env.DATABASE_URL;
const databaseDescribe = databaseUrl ? describe : describe.skip;

interface CommandFailure {
  stderr: string;
}

function isCommandFailure(value: unknown): value is CommandFailure {
  return (
    typeof value === "object" &&
    value !== null &&
    "stderr" in value &&
    typeof value.stderr === "string"
  );
}

async function runMigrator(url: string): Promise<void> {
  await executeFile(process.execPath, ["scripts/migrate.mjs"], {
    env: { ...process.env, DATABASE_URL: url },
  });
}

describe("standalone migration command", () => {
  it("refuses to run without DATABASE_URL", async () => {
    const result = await executeFile(
      process.execPath,
      ["scripts/migrate.mjs"],
      {
        env: { PATH: process.env.PATH },
      }
    ).catch((error: unknown) => error);

    expect(isCommandFailure(result)).toBe(true);
    if (!isCommandFailure(result)) {
      return;
    }

    expect(result.stderr).toContain("DATABASE_URL is required");
  });
});

describe("migration discovery", () => {
  let fixtureDirectory: string;

  beforeEach(async () => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "chicken-migrations-"));
  });

  afterEach(async () => {
    await rm(fixtureDirectory, { force: true, recursive: true });
  });

  it("rejects an invalid calendar timestamp", () => {
    expect(() => migrationTimestamp("20260230010203_invalid-date")).toThrow(
      "invalid UTC calendar timestamp"
    );
  });

  it("rejects a migration directory without a timestamped identity", async () => {
    const invalidDirectory = join(
      fixtureDirectory,
      "migration-without-timestamp"
    );
    await mkdir(invalidDirectory);

    expect(readMigrations(fixtureDirectory)).toEqual([]);

    await writeFile(join(invalidDirectory, "migration.sql"), "SELECT 1;");

    expect(() => readMigrations(fixtureDirectory)).toThrow(
      "must begin with a UTC timestamp and name"
    );
  });

  it("rejects colliding timestamp identities", async () => {
    const firstDirectory = join(fixtureDirectory, "20260811072733_first");
    const secondDirectory = join(fixtureDirectory, "20260811072733_second");
    await mkdir(firstDirectory);
    await mkdir(secondDirectory);
    await writeFile(join(firstDirectory, "migration.sql"), "SELECT 1;");
    await writeFile(join(secondDirectory, "migration.sql"), "SELECT 2;");

    expect(() => readMigrations(fixtureDirectory)).toThrow(
      "Migration timestamp collision"
    );
  });
});

databaseDescribe("migration history", () => {
  const migrationDatabaseName = `chicken_migration_${process.pid}`;
  const adminDatabaseUrl = new URL(
    databaseUrl ?? "postgresql://localhost/postgres"
  );
  const migrationDatabaseUrl = new URL(
    databaseUrl ?? "postgresql://localhost/postgres"
  );
  let adminClient: Client;
  let databaseClient: Client;

  adminDatabaseUrl.pathname = "/postgres";
  migrationDatabaseUrl.pathname = `/${migrationDatabaseName}`;

  beforeAll(async () => {
    adminClient = new Client({ connectionString: adminDatabaseUrl.toString() });
    await adminClient.connect();
    await adminClient.query(`CREATE DATABASE ${migrationDatabaseName}`);
  });

  beforeEach(async () => {
    databaseClient = new Client({
      connectionString: migrationDatabaseUrl.toString(),
    });
    await databaseClient.connect();
    await databaseClient.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await databaseClient.query('DROP TABLE IF EXISTS "sightings" CASCADE');
  });

  afterEach(async () => {
    await databaseClient.end();
  });

  afterAll(async () => {
    await adminClient.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1",
      [migrationDatabaseName]
    );
    await adminClient.query(`DROP DATABASE ${migrationDatabaseName}`);
    await adminClient.end();
  });

  it("fails when an applied migration hash drifts from the committed file", async () => {
    const [migration] = readMigrations();
    await databaseClient.query("CREATE SCHEMA drizzle");
    await databaseClient.query(`
      CREATE TABLE drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `);
    await databaseClient.query(
      "INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)",
      ["not-the-committed-hash", migration.createdAt]
    );

    const result = await runMigrator(migrationDatabaseUrl.toString()).catch(
      (error: unknown) => error
    );

    expect(isCommandFailure(result)).toBe(true);
    if (!isCommandFailure(result)) {
      return;
    }

    expect(result.stderr).toContain("Migration drift detected");
  });

  it("rejects duplicate applied migration identities before adding the unique index", async () => {
    const [migration] = readMigrations();
    await databaseClient.query("CREATE SCHEMA drizzle");
    await databaseClient.query(`
      CREATE TABLE drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `);
    await databaseClient.query(
      "INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2), ($3, $4)",
      [migration.hash, migration.createdAt, migration.hash, migration.createdAt]
    );

    const result = await runMigrator(migrationDatabaseUrl.toString()).catch(
      (error: unknown) => error
    );

    expect(isCommandFailure(result)).toBe(true);
    if (!isCommandFailure(result)) {
      return;
    }

    expect(result.stderr).toContain("duplicate timestamp identity");
  });

  it("serializes concurrent standalone migration and startup migration attempts", async () => {
    const results = await Promise.allSettled([
      runMigrator(migrationDatabaseUrl.toString()),
      runMigrator(migrationDatabaseUrl.toString()),
    ]);

    expect(results).toEqual([
      { status: "fulfilled", value: undefined },
      { status: "fulfilled", value: undefined },
    ]);

    const result = await databaseClient.query<{ count: string }>(
      "SELECT count(*) FROM drizzle.__drizzle_migrations"
    );

    expect(result.rows[0]?.count).toBe("1");
  });
});
