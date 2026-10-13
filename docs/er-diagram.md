# ER diagram

Source of truth: `src/db/schema.ts` and `src/drizzle/0001_booking_constraints.sql`.
`schema.dbml` in this folder can be pasted into [dbdiagram.io](https://dbdiagram.io/d) for a shareable link.

```mermaid
erDiagram
    user ||--o{ session : has
    user ||--o{ account : has
    user ||--o{ bookings : books
    user ||--o{ booking_series : owns
    user ||--o{ notifications : receives
    locations ||--o{ locations : "parent of"
    locations ||--o{ resources : contains
    resource_types ||--o{ resources : classifies
    resources ||--o{ bookings : "is booked in"
    resources ||--o{ booking_series : "is booked in"
    booking_series ||--o{ bookings : expands_to
    bookings ||--o{ notifications : "about"

    user { text id PK
           text email UK
           text role }
    global_settings { int id PK "always 1"
                      int_array working_days
                      int buffer_minutes }
    locations { uuid id PK
                text kind "site|building|floor|area"
                uuid parent_id FK }
    resource_types { uuid id PK
                     text slug UK
                     text rule_columns "nullable, inherit" }
    resources { uuid id PK
                text asset_code UK
                uuid type_id FK
                uuid location_id FK
                text status "active|maintenance|retired"
                text rule_columns "nullable overrides" }
    booking_series { uuid id PK
                     text pattern "daily|weekly"
                     date start_date }
    bookings { uuid id PK
               uuid resource_id FK
               text user_id FK
               uuid series_id FK
               timestamptz starts_at
               timestamptz ends_at
               timestamptz blocked_until "ends_at + buffer"
               text status
               int buffer_minutes "snapshot"
               int cancel_cutoff_minutes "snapshot" }
    notifications { uuid id PK
                    text user_id FK
                    timestamptz read_at }
```

`bookings` carries `EXCLUDE USING gist (resource_id WITH =, tstzrange(starts_at, blocked_until, '[)') WITH &&) WHERE status IN ('pending','approved')`.
`global_settings` is a single row, read through `getEffectiveRules` (resource, then type, then global).
