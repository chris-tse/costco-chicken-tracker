import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const executeFile = promisify(execFile);

describe("standalone migration command", () => {
  it("refuses to run without DATABASE_URL", async () => {
    const result = await executeFile(
      process.execPath,
      ["scripts/migrate.mjs"],
      {
        env: { PATH: process.env.PATH },
      }
    ).catch((error: { stderr: string }) => error);

    expect(result.stderr).toContain("DATABASE_URL is required");
  });
});
