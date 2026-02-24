import { defineRelations } from "drizzle-orm";
import {
  boolean,
  index,
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
  emailVerified: boolean("email_verified").default(false).notNull(),
  name: text(),
  image: text(),
  defaultStoreId: integer("default_store_id").references(() => stores.id),
  commuteMinutes: integer("commute_minutes").default(15),
  trustScore: numeric("trust_score").default("1.0"),
  role: text("role").default("user").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
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
// sessions (Better Auth)
// ---------------------------------------------------------------------------

export const sessions = pgTable(
  "sessions",
  {
    id: text().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text().notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)]
);

// ---------------------------------------------------------------------------
// accounts (Better Auth)
// ---------------------------------------------------------------------------

export const accounts = pgTable(
  "accounts",
  {
    id: text().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text(),
    password: text(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("accounts_user_id_idx").on(table.userId)]
);

// ---------------------------------------------------------------------------
// verifications (Better Auth)
// ---------------------------------------------------------------------------

export const verifications = pgTable(
  "verifications",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)]
);

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
  {
    users,
    stores,
    inviteCodes,
    sessions,
    accounts,
    verifications,
    chickenSightings,
  },
  (r) => ({
    users: {
      defaultStore: r.one.stores({
        from: r.users.defaultStoreId,
        to: r.stores.id,
      }),
      sessions: r.many.sessions(),
      accounts: r.many.accounts(),
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
    sessions: {
      user: r.one.users({
        from: r.sessions.userId,
        to: r.users.id,
      }),
    },
    accounts: {
      user: r.one.users({
        from: r.accounts.userId,
        to: r.users.id,
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

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Verification = typeof verifications.$inferSelect;
export type NewVerification = typeof verifications.$inferInsert;

export type ChickenSighting = typeof chickenSightings.$inferSelect;
export type NewChickenSighting = typeof chickenSightings.$inferInsert;
