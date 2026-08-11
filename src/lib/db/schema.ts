import { desc, sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { DONENESS_VALUES } from "../sightings";

export const sightings = pgTable(
  "sightings",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    labelDate: date("label_date", { mode: "string" }).notNull(),
    labelMinute: smallint("label_minute").notNull(),
    doneness: text({ enum: DONENESS_VALUES }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check(
      "sightings_label_minute_check",
      sql`${table.labelMinute} between 0 and 1439`
    ),
    check(
      "sightings_doneness_check",
      sql`${table.doneness} in ('light', 'medium', 'dark')`
    ),
    index("sightings_recent_idx").on(desc(table.createdAt), desc(table.id)),
  ]
);

export const schema = { sightings };

export type Sighting = typeof sightings.$inferSelect;
