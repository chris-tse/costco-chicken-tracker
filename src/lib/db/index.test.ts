// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("database client", () => {
  it("rejects unavailable or stalled operations before the browser deadline", async () => {
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://fixture:fixture@127.0.0.1:5432/chicken_tracking"
    );

    const { DATABASE_OPERATION_TIMEOUT_MS, db } = await import("./index");

    expect(DATABASE_OPERATION_TIMEOUT_MS).toBe(4000);
    expect(db.$client.options.connectionTimeoutMillis).toBe(
      DATABASE_OPERATION_TIMEOUT_MS
    );
    expect(db.$client.options.query_timeout).toBe(
      DATABASE_OPERATION_TIMEOUT_MS
    );
    expect(db.$client.options.statement_timeout).toBe(
      DATABASE_OPERATION_TIMEOUT_MS
    );
  });
});
