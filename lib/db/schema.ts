import { defineRelations } from "drizzle-orm";
import {
  boolean,
  integer,
  numeric,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// stores
// ---------------------------------------------------------------------------

export const stores = pgTable("stores", {
  id: serial().primaryKey(),
  external_id: text().unique(),
  name: text().notNull(),
  address: text().notNull(),
  city: text().notNull(),
  state: text().notNull(),
  zip: text().notNull(),
  lat: numeric().notNull(),
  lng: numeric().notNull(),
  active: boolean().default(true),
  created_at: timestamp({ withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: text().primaryKey(),
  email: text().unique().notNull(),
  name: text(),
  image: text(),
  default_store_id: integer().references(() => stores.id),
  commute_minutes: integer().default(15),
  trust_score: numeric().default("1.0"),
  created_at: timestamp({ withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// invite_codes
// ---------------------------------------------------------------------------

export const inviteCodes = pgTable("invite_codes", {
  id: serial().primaryKey(),
  code: text().unique().notNull(),
  created_by: text().references(() => users.id),
  used_by: text().references(() => users.id),
  used_at: timestamp({ withTimezone: true }),
  revoked_at: timestamp({ withTimezone: true }),
  created_at: timestamp({ withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// chicken_sightings
// ---------------------------------------------------------------------------

export const chickenSightings = pgTable("chicken_sightings", {
  id: serial().primaryKey(),
  user_id: text()
    .notNull()
    .references(() => users.id),
  store_id: integer()
    .notNull()
    .references(() => stores.id),
  label_time: timestamp({ withTimezone: true }).notNull(),
  observed_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  user_lat: numeric(),
  user_lng: numeric(),
  flagged: boolean().default(false),
  flag_reason: text(),
  admin_reviewed: boolean().default(false),
  admin_approved: boolean(),
  algorithm_suggestion: boolean(),
  doneness: smallint(),
  notes: text(),
  created_at: timestamp({ withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// relations
// ---------------------------------------------------------------------------
export const relations = defineRelations(
  { users, stores, inviteCodes, chickenSightings },
  (r) => ({
    users: {
      defaultStore: r.one.stores({
        from: r.users.default_store_id,
        to: r.stores.id,
      }),
    },
    stores: {
      users: r.many.users(),
    },
    inviteCodes: {
      usedBy: r.one.users({
        from: r.inviteCodes.used_by,
        to: r.users.id,
        alias: "usedBy",
      }),
      createdBy: r.one.users({
        from: r.inviteCodes.created_by,
        to: r.users.id,
        alias: "createdBy",
      }),
    },
    chickenSightings: {
      users: r.one.users({
        from: r.chickenSightings.user_id,
        to: r.users.id,
      }),
      stores: r.one.stores({
        from: r.chickenSightings.store_id,
        to: r.stores.id,
      }),
    },
  })
);

// ---------------------------------------------------------------------------
// inferred types
// ---------------------------------------------------------------------------

export type Store = typeof stores.$inferSelect;
export type NewStore = typeof stores.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type InviteCode = typeof inviteCodes.$inferSelect;
export type NewInviteCode = typeof inviteCodes.$inferInsert;

export type ChickenSighting = typeof chickenSightings.$inferSelect;
export type NewChickenSighting = typeof chickenSightings.$inferInsert;
