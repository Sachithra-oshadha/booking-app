# Resource & Facility Booking

A web app where an organisation manages shared resources (rooms, vehicles, equipment, tools) across a location hierarchy, and people reserve them **without overlaps**, with approvals, recurring bookings, notifications and clear availability.

**Links (fill in before submitting):** ER diagram: _<dbdiagram.io link>_ · Demo video: _<link>_ · The diagram source is in [`docs/er-diagram.md`](docs/er-diagram.md) and [`docs/schema.dbml`](docs/schema.dbml).

## Tech stack

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router), TypeScript | Required; server actions keep mutations next to the data |
| Database | PostgreSQL 16 | Exclusion constraints stop double-booking at the DB level |
| ORM | Drizzle ORM + drizzle-kit | SQL-like, typed, plain SQL migrations (one is hand-written) |
| Auth | Better Auth (email + password) | Sessions, hashing, Drizzle adapter built in |
| Validation | Zod | One schema per form, shared by field errors and server |
| Time | date-fns + `@date-fns/tz` | Single org timezone: Asia/Colombo |
| Calendar | FullCalendar | Week view with business hours |
| Email | Nodemailer → Mailpit | Local SMTP catcher, no real mail sent |
| UI | Custom components, CSS Modules | No component library; flat, light, minimal |

## Getting started

Prerequisites: Node 20+, Docker.

```bash
docker compose up -d          # Postgres (host port 5433) + Mailpit
npm install
cp .env.example .env
npm run db:reset              # drop -> migrate -> seed
npm run dev                   # http://localhost:3000
```

Postgres is mapped to host port **5433** so it doesn't collide with a locally installed Postgres on 5432. Mailpit UI: <http://localhost:8025>.

### Seeded accounts (password `Password123!`)

| Email | Role |
|---|---|
| admin1@demo.com, admin2@demo.com | admin |
| user1@demo.com … user4@demo.com | user |

Seed data: 2 sites, 10 buildings, 60 resources (15 per type; 3 in maintenance, 1 retired), about 90 bookings in every status (including expired pending and rejected), 3 recurring series (one pending), and unread notifications.

### Checks

```bash
npm test         # unit tests: slot validation + recurrence expansion
npm run race     # 6 simultaneous identical requests -> exactly 1 succeeds
npm run smoke    # integration checks on the DB (clash, buffer, approval, cut-off, snapshot, last admin)
```

`race` and `smoke` need the seeded database and clean up after themselves.

## Features

**Users:** register / sign in; browse and filter resources (type, location incl. children, status, search); **Find free resources** for a time range; **Available now**; per-resource week calendar (your bookings, others shown as "Booked", pending, buffers, non-working hours greyed); single or recurring (daily/weekly) bookings; My bookings (upcoming/past/cancelled), cancel one booking or a whole series; in-app notifications with unread bell; email copies in Mailpit.

**Admins:** approval queue (single bookings and whole series, note required to reject); all bookings with filters and cancel-any; CRUD for resources, resource types and the location tree; global default rules; promote/demote users.

## Key design decisions

- **Double-booking is impossible, enforced by the database.** `bookings` has `EXCLUDE USING gist (resource_id WITH =, tstzrange(starts_at, blocked_until, '[)') WITH &&) WHERE status IN ('pending','approved')`. App code never checks-then-inserts; it inserts and maps Postgres error `23P01` to "This slot was just taken". `npm run race` proves it under concurrency. (Never run `drizzle-kit push`; it doesn't know this constraint.)
- **Buffers use `blocked_until`.** Each booking blocks `[start, end + buffer)`, so the buffer protects it from both sides. It's computed in code (a generated column can't, `timestamptz + interval` isn't immutable).
- **Rule resolution chain.** Per rule: resource override ?? type default ?? global default, in one function (`getEffectiveRules`). Slot validation is a pure function (`validateSlot`) that the booking service, series expansion and "find free" all share, and that unit tests cover.
- **Rules are snapshotted.** Buffer and cancel cut-off are copied onto each booking, so changing a type's rules never alters existing bookings.
- **Permissions in one map.** Roles are text on the user; every check is `can(user, permission)`. Adding a role is one entry in `server/permissions.ts`. Registration can't set `role` (Better Auth field with `input: false`); every server action re-checks session + permission, the proxy is only an optimistic redirect.
- **Last-admin guard** locks the admin rows (`FOR UPDATE`) so two admins can't demote each other concurrently.
- **Recurring series are all-or-nothing.** All occurrences are validated and checked for clashes first; any failure saves nothing and returns the date + reason list. Insert is a single transaction, so a race still rolls everything back. A series is approved/rejected as one unit.
- **Notifications:** in-app rows are inserted inside the booking transaction; emails are sent after commit, best effort, and never break the action.
- **Layering:** pages and actions never touch the DB; thin server actions (Zod → permission → service → revalidate → typed result) call `server/*`.

## Assumptions

- Single organisation timezone: Asia/Colombo (no DST); no overnight bookings.
- One booking = one resource; users book for themselves.
- Pending bookings hold their slot; a pending booking whose start passed shows as **Expired** (evaluated on read, no background job) and can't be approved.
- Admins can't approve their own bookings unless they are the only admin.
- Slot alignment counts from the resource's opening time. "Available now" ignores alignment.
- Daily recurrence skips non-working days; weekly keeps the weekday. Max 52 occurrences.
- Putting a resource into maintenance/retired blocks new bookings but doesn't cancel existing ones; admins see the count.

## Known limitations / future improvements

- Reminders and auto-expiry need a scheduler; email uses best-effort sending rather than a transactional outbox.
- Multi-resource bookings, booking on behalf of others, monthly/custom recurrence, drag-to-book.
- Scoped roles (e.g. location manager), audit log, utilisation reports, multiple timezones.
- Per-user booking limits (pending bookings hold slots, so one user could hoard).
- Resource list filters in memory (fine for hundreds of resources; move to SQL beyond that). The calendar loads all bookings from a week ago onwards for one resource.
- Test coverage is unit + DB integration scripts, not browser tests.

## Project structure

```
src/
  app/          routes: (auth) login/register, (app) resources/bookings/notifications, admin/*
  components/   ui/ primitives, layout/, features/ (CSS Modules next to each component)
  actions/      thin server actions
  server/       services: rules, bookings, series, approvals, availability, locations, catalogue, notifications
  lib/          time (Colombo <-> UTC), slot (pure validation + recurrence), errors, validation (Zod), auth, email
  db/           schema.ts, index.ts, seed.ts
  drizzle/      migrations (0001 is the hand-written exclusion constraint)
  proxy.ts      optimistic auth redirect
scripts/        reset.ts, race.ts, smoke.ts
docs/           ER diagram + DBML
```
