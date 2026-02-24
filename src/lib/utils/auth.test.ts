import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    BETTER_AUTH_URL: undefined,
    VERCEL_URL: undefined,
  },
}));

import { env } from "@/lib/env";

import { getBaseURL, INVITE_CODE_COOKIE_RE } from "./auth";

const mockedEnv = env as { BETTER_AUTH_URL?: string; VERCEL_URL?: string };

describe("getBaseURL", () => {
  beforeEach(() => {
    mockedEnv.BETTER_AUTH_URL = undefined;
    mockedEnv.VERCEL_URL = undefined;
  });

  it("returns BETTER_AUTH_URL when set", () => {
    mockedEnv.BETTER_AUTH_URL = "https://example.com";
    expect(getBaseURL()).toBe("https://example.com");
  });

  it("prefers BETTER_AUTH_URL over VERCEL_URL", () => {
    mockedEnv.BETTER_AUTH_URL = "https://example.com";
    mockedEnv.VERCEL_URL = "my-app.vercel.app";
    expect(getBaseURL()).toBe("https://example.com");
  });

  it("returns https://VERCEL_URL when BETTER_AUTH_URL is not set", () => {
    mockedEnv.VERCEL_URL = "my-app.vercel.app";
    expect(getBaseURL()).toBe("https://my-app.vercel.app");
  });

  it("returns localhost fallback when neither env var is set", () => {
    expect(getBaseURL()).toBe("http://localhost:3000");
  });

  it("returns localhost when BETTER_AUTH_URL is empty string", () => {
    mockedEnv.BETTER_AUTH_URL = "";
    expect(getBaseURL()).toBe("http://localhost:3000");
  });

  it("returns localhost when VERCEL_URL is empty string and BETTER_AUTH_URL is not set", () => {
    mockedEnv.VERCEL_URL = "";
    expect(getBaseURL()).toBe("http://localhost:3000");
  });
});

describe("INVITE_CODE_COOKIE_RE", () => {
  it("extracts invite code from a single cookie", () => {
    const match = INVITE_CODE_COOKIE_RE.exec("invite_code=abc123");
    expect(match?.[1]).toBe("abc123");
  });

  it("extracts invite code when it appears after other cookies", () => {
    const match = INVITE_CODE_COOKIE_RE.exec("session=xyz; invite_code=abc123");
    expect(match?.[1]).toBe("abc123");
  });

  it("extracts invite code when it appears before other cookies", () => {
    const match = INVITE_CODE_COOKIE_RE.exec("invite_code=abc123; session=xyz");
    expect(match?.[1]).toBe("abc123");
  });

  it("extracts invite code from the middle of multiple cookies", () => {
    const match = INVITE_CODE_COOKIE_RE.exec(
      "session=xyz; invite_code=abc123; theme=dark"
    );
    expect(match?.[1]).toBe("abc123");
  });

  it("returns null for missing invite_code cookie", () => {
    const match = INVITE_CODE_COOKIE_RE.exec("session=xyz; theme=dark");
    expect(match).toBeNull();
  });

  it("returns null for empty string", () => {
    const match = INVITE_CODE_COOKIE_RE.exec("");
    expect(match).toBeNull();
  });

  it("does not match partial cookie names", () => {
    const match = INVITE_CODE_COOKIE_RE.exec("my_invite_code=abc123");
    expect(match).toBeNull();
  });

  it("handles URL-encoded values", () => {
    const match = INVITE_CODE_COOKIE_RE.exec("invite_code=abc%20123");
    expect(match?.[1]).toBe("abc%20123");
  });

  it("stops at semicolon boundary", () => {
    const match = INVITE_CODE_COOKIE_RE.exec("invite_code=abc123; next=value");
    expect(match?.[1]).toBe("abc123");
  });
});
