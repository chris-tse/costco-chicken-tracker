import { toJSONAsync } from "seroval";
import { describe, expect, it } from "vitest";

import { isDonenessUpdateRequest } from "./acceptance-request-matcher.mjs";

const DONENESS_UPDATE_URL =
  "http://127.0.0.1:3000/_serverFn/update-doneness-function-id";

async function serializeRequestData(
  data: Record<string, unknown>
): Promise<string> {
  return JSON.stringify(await toJSONAsync({ data }));
}

describe("isDonenessUpdateRequest", () => {
  it("identifies the exact server-function endpoint and Seroval-encoded fixture input", async () => {
    const request = {
      body: await serializeRequestData({ doneness: "light", id: 4 }),
      method: "POST",
      url: DONENESS_UPDATE_URL,
    };

    expect(
      isDonenessUpdateRequest(request, {
        doneness: "light",
        id: 4,
        url: DONENESS_UPDATE_URL,
      })
    ).toBe(true);
  });

  it("does not match another server function or a different fixture input", async () => {
    const request = {
      body: await serializeRequestData({ doneness: "medium", id: 3 }),
      method: "POST",
      url: DONENESS_UPDATE_URL,
    };

    expect(
      isDonenessUpdateRequest(request, {
        doneness: "light",
        id: 4,
        url: DONENESS_UPDATE_URL,
      })
    ).toBe(false);
    expect(
      isDonenessUpdateRequest(
        {
          ...request,
          url: "http://127.0.0.1:3000/_serverFn/another-function-id",
        },
        { doneness: "medium", id: 3, url: DONENESS_UPDATE_URL }
      )
    ).toBe(false);
  });

  it("does not match malformed request data", () => {
    expect(
      isDonenessUpdateRequest(
        { body: "not JSON", method: "POST", url: DONENESS_UPDATE_URL },
        { doneness: "light", id: 4, url: DONENESS_UPDATE_URL }
      )
    ).toBe(false);
  });
});
