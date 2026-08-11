import { fromJSON } from "seroval";

function isRecord(value) {
  return typeof value === "object" && value !== null;
}

function deserializeRequestData(body) {
  try {
    const payload = fromJSON(JSON.parse(body));

    if (!(isRecord(payload) && isRecord(payload.data))) {
      return undefined;
    }

    return payload.data;
  } catch {
    return undefined;
  }
}

export function isDonenessUpdateRequest(request, expected) {
  if (request.method !== "POST" || request.url !== expected.url) {
    return false;
  }

  const data = deserializeRequestData(request.body);

  return data?.id === expected.id && data.doneness === expected.doneness;
}
