import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

// ---------- Better Auth tables (ids are text) ----------
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Enums ----------
export const locationKind = pgEnum("location_kind", ["site", "building", "floor", "area"]);
export const resourceStatus = pgEnum("resource_status", ["active", "maintenance", "retired"]);
export const bookingStatus = pgEnum("booking_status", ["pending", "approved", "rejected", "cancelled"]);
export const seriesPattern = pgEnum("series_pattern", ["daily", "weekly"]);

// ---------- Rule columns (shared shape) ----------
// global_settings: NOT NULL. resource_types / resources: nullable (null = inherit).
const rulesRequired = () => ({
  workingDays: integer("working_days").array().notNull(),
  workStart: time("work_start").notNull(),
  workEnd: time("work_end").notNull(),
  minSlotMinutes: integer("min_slot_minutes").notNull(),
  maxDurationMinutes: integer("max_duration_minutes").notNull(),
  bufferMinutes: integer("buffer_minutes").notNull(),
  cancelCutoffMinutes: integer("cancel_cutoff_minutes").notNull(),
  requiresApproval: boolean("requires_approval").notNull(),
});

const rulesOptional = () => ({
  workingDays: integer("working_days").array(),
  workStart: time("work_start"),
  workEnd: time("work_end"),
  minSlotMinutes: integer("min_slot_minutes"),
  maxDurationMinutes: integer("max_duration_minutes"),
  bufferMinutes: integer("buffer_minutes"),
  cancelCutoffMinutes: integer("cancel_cutoff_minutes"),
  requiresApproval: boolean("requires_approval"),
});

export const globalSettings = pgTable(
  "global_settings",
  {
    id: integer("id").primaryKey().default(1),
    ...rulesRequired(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("global_settings_single_row", sql`${t.id} = 1`)],
);

export const locations = pgTable("locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  kind: locationKind("kind").notNull(),
  parentId: uuid("parent_id").references((): AnyPgColumn => locations.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const resourceTypes = pgTable("resource_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ...rulesOptional(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const resources = pgTable(
  "resources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assetCode: text("asset_code").notNull().unique(),
    name: text("name").notNull(),
    typeId: uuid("type_id").notNull().references(() => resourceTypes.id),
    locationId: uuid("location_id").notNull().references(() => locations.id),
    description: text("description"),
    capacity: integer("capacity"),
    make: text("make"),
    model: text("model"),
    serialNumber: text("serial_number"),
    status: resourceStatus("status").notNull().default("active"),
    ...rulesOptional(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("resources_type_idx").on(t.typeId), index("resources_location_idx").on(t.locationId)],
);

export const bookingSeries = pgTable("booking_series", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id),
  resourceId: uuid("resource_id").notNull().references(() => resources.id),
  pattern: seriesPattern("pattern").notNull(),
  startDate: date("start_date", { mode: "string" }).notNull(),
  untilDate: date("until_date", { mode: "string" }),
  occurrenceCount: integer("occurrence_count"),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  purpose: text("purpose"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resourceId: uuid("resource_id").notNull().references(() => resources.id),
    userId: text("user_id").notNull().references(() => user.id),
    seriesId: uuid("series_id").references(() => bookingSeries.id),
    purpose: text("purpose"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    blockedUntil: timestamp("blocked_until", { withTimezone: true }).notNull(),
    status: bookingStatus("status").notNull(),
    bufferMinutes: integer("buffer_minutes").notNull(),
    cancelCutoffMinutes: integer("cancel_cutoff_minutes").notNull(),
    decidedBy: text("decided_by").references(() => user.id),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decisionNote: text("decision_note"),
    cancelledBy: text("cancelled_by").references(() => user.id),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("bookings_resource_start_idx").on(t.resourceId, t.startsAt),
    index("bookings_user_start_idx").on(t.userId, t.startsAt),
    index("bookings_status_idx").on(t.status),
    index("bookings_series_idx").on(t.seriesId),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    bookingId: uuid("booking_id").references(() => bookings.id),
    seriesId: uuid("series_id").references(() => bookingSeries.id),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_read_idx").on(t.userId, t.readAt)],
);
