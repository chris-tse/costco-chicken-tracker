import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { stores } from "@/lib/db/schema";

export const COSTCO_LOCATIONS_URL =
  "https://raw.githubusercontent.com/stiles/locations/main/costco/data/processed/costco_locations.json";

export type StoreSyncErrorCode =
  | "DUPLICATE_EXTERNAL_ID"
  | "FETCH_FAILED"
  | "INVALID_SOURCE"
  | "VALIDATION_FAILED";

export class StoreSyncError extends Error {
  readonly code: StoreSyncErrorCode;
  readonly details?: unknown;

  constructor(code: StoreSyncErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "StoreSyncError";
    this.code = code;
    this.details = details;
  }
}

export interface NormalizedStoreRecord {
  active: true;
  address: string;
  city: string;
  external_id: string;
  lat: string;
  lng: string;
  name: string;
  state: string;
  zip: string;
}

interface ExistingStoreSnapshot {
  active: boolean | null;
  address: string;
  city: string;
  external_id: string | null;
  id: number;
  lat: string;
  lng: string;
  name: string;
  state: string;
  zip: string;
}

interface StoreUpdateOperation {
  id: number;
  values: Partial<NormalizedStoreRecord> &
    Pick<NormalizedStoreRecord, "active">;
}

export interface StoreSyncDiff {
  deactivations: number[];
  inserts: NormalizedStoreRecord[];
  reactivations: StoreUpdateOperation[];
  unchanged: number;
  updates: StoreUpdateOperation[];
}

export interface StoreSyncSummary {
  deactivated: number;
  inserted: number;
  reactivated: number;
  unchanged: number;
  updated: number;
}

export interface SyncStoresOptions {
  db: NodePgDatabase;
  fetchFn?: typeof fetch;
  sourceUrl?: string;
}

interface SourceRecord {
  city: unknown;
  latitude: unknown;
  longitude: unknown;
  name: unknown;
  state: unknown;
  store_id: unknown;
  street: unknown;
  zip: unknown;
}

const REQUIRED_STRING_FIELDS = [
  "name",
  "street",
  "city",
  "state",
  "zip",
] as const satisfies ReadonlyArray<keyof SourceRecord>;

const LATITUDE_RANGE = {
  max: 90,
  min: -90,
} as const;

const LONGITUDE_RANGE = {
  max: 180,
  min: -180,
} as const;

export async function syncStores({
  db,
  fetchFn = fetch,
  sourceUrl = COSTCO_LOCATIONS_URL,
}: SyncStoresOptions): Promise<StoreSyncSummary> {
  const sourceStores = await fetchSourceStores({ fetchFn, sourceUrl });
  const existingStores = await db
    .select({
      active: stores.active,
      address: stores.address,
      city: stores.city,
      external_id: stores.external_id,
      id: stores.id,
      lat: stores.lat,
      lng: stores.lng,
      name: stores.name,
      state: stores.state,
      zip: stores.zip,
    })
    .from(stores);
  const diff = diffStores(sourceStores, existingStores);

  await db.transaction(async (tx) => {
    if (diff.inserts.length > 0) {
      await tx.insert(stores).values(diff.inserts);
    }

    for (const update of diff.updates) {
      await tx
        .update(stores)
        .set(update.values)
        .where(eq(stores.id, update.id));
    }

    for (const reactivation of diff.reactivations) {
      await tx
        .update(stores)
        .set(reactivation.values)
        .where(eq(stores.id, reactivation.id));
    }

    for (const storeId of diff.deactivations) {
      await tx
        .update(stores)
        .set({ active: false })
        .where(eq(stores.id, storeId));
    }
  });

  return {
    deactivated: diff.deactivations.length,
    inserted: diff.inserts.length,
    reactivated: diff.reactivations.length,
    unchanged: diff.unchanged,
    updated: diff.updates.length,
  };
}

export async function fetchSourceStores({
  fetchFn,
  sourceUrl,
}: Pick<SyncStoresOptions, "fetchFn" | "sourceUrl">): Promise<
  NormalizedStoreRecord[]
> {
  const resolvedFetch = fetchFn ?? fetch;
  const resolvedSourceUrl = sourceUrl ?? COSTCO_LOCATIONS_URL;

  let response: Response;

  try {
    response = await resolvedFetch(resolvedSourceUrl);
  } catch (error) {
    throw new StoreSyncError(
      "FETCH_FAILED",
      "Failed to fetch Costco store data",
      {
        cause: error,
        sourceUrl: resolvedSourceUrl,
      }
    );
  }

  if (!response.ok) {
    throw new StoreSyncError(
      "FETCH_FAILED",
      `Failed to fetch Costco store data: ${response.status} ${response.statusText}`,
      {
        sourceUrl: resolvedSourceUrl,
        status: response.status,
        statusText: response.statusText,
      }
    );
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch (error) {
    throw new StoreSyncError(
      "INVALID_SOURCE",
      "Costco store data was not valid JSON",
      {
        cause: error,
        sourceUrl: resolvedSourceUrl,
      }
    );
  }

  return normalizeSourceStores(payload);
}

function normalizeSourceStores(payload: unknown): NormalizedStoreRecord[] {
  if (!Array.isArray(payload)) {
    throw new StoreSyncError(
      "INVALID_SOURCE",
      "Costco store data must be a JSON array",
      { payloadType: typeof payload }
    );
  }

  const externalIds = new Set<string>();
  const normalizedStores: NormalizedStoreRecord[] = [];

  for (const [index, record] of payload.entries()) {
    const normalizedRecord = normalizeSourceStore(record, index);

    if (externalIds.has(normalizedRecord.external_id)) {
      throw new StoreSyncError(
        "DUPLICATE_EXTERNAL_ID",
        `Duplicate external_id "${normalizedRecord.external_id}" in Costco source data`,
        { externalId: normalizedRecord.external_id, index }
      );
    }

    externalIds.add(normalizedRecord.external_id);
    normalizedStores.push(normalizedRecord);
  }

  return normalizedStores;
}

function normalizeSourceStore(
  record: unknown,
  index: number
): NormalizedStoreRecord {
  if (!isRecord(record)) {
    throw new StoreSyncError(
      "VALIDATION_FAILED",
      `Source row ${index} must be an object`,
      { index }
    );
  }

  for (const fieldName of REQUIRED_STRING_FIELDS) {
    if (!hasNonEmptyString(record[fieldName])) {
      throw new StoreSyncError(
        "VALIDATION_FAILED",
        `Source row ${index} is missing a valid ${fieldName} value`,
        { field: fieldName, index, value: record[fieldName] }
      );
    }
  }

  return {
    active: true,
    address: normalizeRequiredString(record.street, "street", index),
    city: normalizeRequiredString(record.city, "city", index),
    external_id: normalizeExternalId(record.store_id, index),
    lat: normalizeCoordinate(
      record.latitude,
      "latitude",
      LATITUDE_RANGE,
      index
    ),
    lng: normalizeCoordinate(
      record.longitude,
      "longitude",
      LONGITUDE_RANGE,
      index
    ),
    name: normalizeRequiredString(record.name, "name", index),
    state: normalizeRequiredString(record.state, "state", index).toUpperCase(),
    zip: normalizeRequiredString(record.zip, "zip", index),
  };
}

function diffStores(
  sourceStores: readonly NormalizedStoreRecord[],
  existingStores: readonly ExistingStoreSnapshot[]
): StoreSyncDiff {
  const existingStoreMap = new Map<string, ExistingStoreSnapshot>();

  for (const store of existingStores) {
    if (typeof store.external_id === "string" && store.external_id.length > 0) {
      existingStoreMap.set(store.external_id, store);
    }
  }

  const seenExternalIds = new Set<string>();
  const inserts: NormalizedStoreRecord[] = [];
  const updates: StoreUpdateOperation[] = [];
  const reactivations: StoreUpdateOperation[] = [];
  let unchanged = 0;

  for (const sourceStore of sourceStores) {
    seenExternalIds.add(sourceStore.external_id);

    const existingStore = existingStoreMap.get(sourceStore.external_id);

    if (!existingStore) {
      inserts.push(sourceStore);
      continue;
    }

    const existingIsActive = existingStore.active !== false;
    const hasFieldChanges = hasStoreFieldChanges(existingStore, sourceStore);

    if (!existingIsActive) {
      reactivations.push({
        id: existingStore.id,
        values: {
          ...sourceStore,
          active: true,
        },
      });
      continue;
    }

    if (!hasFieldChanges) {
      unchanged += 1;
      continue;
    }

    updates.push({
      id: existingStore.id,
      values: {
        ...sourceStore,
        active: true,
      },
    });
  }

  const deactivations: number[] = [];

  for (const existingStore of existingStoreMap.values()) {
    const existingIsActive = existingStore.active !== false;
    const externalId = existingStore.external_id;

    if (
      existingIsActive &&
      typeof externalId === "string" &&
      !seenExternalIds.has(externalId)
    ) {
      deactivations.push(existingStore.id);
    }
  }

  return {
    deactivations,
    inserts,
    reactivations,
    unchanged,
    updates,
  };
}

function hasStoreFieldChanges(
  existingStore: ExistingStoreSnapshot,
  sourceStore: NormalizedStoreRecord
): boolean {
  return (
    existingStore.name !== sourceStore.name ||
    existingStore.address !== sourceStore.address ||
    existingStore.city !== sourceStore.city ||
    existingStore.state !== sourceStore.state ||
    existingStore.zip !== sourceStore.zip ||
    normalizeDatabaseCoordinate(existingStore.lat) !== sourceStore.lat ||
    normalizeDatabaseCoordinate(existingStore.lng) !== sourceStore.lng
  );
}

function normalizeExternalId(value: unknown, index: number): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (trimmedValue.length > 0) {
      return trimmedValue;
    }
  }

  throw new StoreSyncError(
    "VALIDATION_FAILED",
    `Source row ${index} is missing a valid store_id value`,
    { field: "store_id", index, value }
  );
}

function normalizeRequiredString(
  value: unknown,
  fieldName: keyof SourceRecord,
  index: number
): string {
  if (typeof value !== "string") {
    throw new StoreSyncError(
      "VALIDATION_FAILED",
      `Source row ${index} is missing a valid ${fieldName} value`,
      { field: fieldName, index, value }
    );
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    throw new StoreSyncError(
      "VALIDATION_FAILED",
      `Source row ${index} is missing a valid ${fieldName} value`,
      { field: fieldName, index, value }
    );
  }

  return trimmedValue;
}

function normalizeCoordinate(
  value: unknown,
  fieldName: "latitude" | "longitude",
  range: { max: number; min: number },
  index: number
): string {
  const numericValue = parseCoordinate(value);

  if (
    numericValue === null ||
    numericValue < range.min ||
    numericValue > range.max
  ) {
    throw new StoreSyncError(
      "VALIDATION_FAILED",
      `Source row ${index} has an invalid ${fieldName} value`,
      { field: fieldName, index, value }
    );
  }

  return String(numericValue);
}

function normalizeDatabaseCoordinate(value: string): string {
  const numericValue = parseCoordinate(value);

  if (numericValue === null) {
    throw new StoreSyncError(
      "VALIDATION_FAILED",
      "Existing store row has an invalid coordinate value",
      { value }
    );
  }

  return String(numericValue);
}

function parseCoordinate(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (trimmedValue.length === 0) {
      return null;
    }

    const numericValue = Number(trimmedValue);

    return Number.isFinite(numericValue) ? numericValue : null;
  }

  return null;
}

function hasNonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
