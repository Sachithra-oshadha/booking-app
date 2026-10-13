CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE bookings
  ADD CONSTRAINT bookings_time_valid
    CHECK (ends_at > starts_at AND blocked_until >= ends_at);--> statement-breakpoint
ALTER TABLE bookings
  ADD CONSTRAINT bookings_no_overlap EXCLUDE USING gist (
    resource_id WITH =,
    tstzrange(starts_at, blocked_until, '[)') WITH &&
  ) WHERE (status IN ('pending', 'approved'));--> statement-breakpoint
INSERT INTO global_settings
  (id, working_days, work_start, work_end, min_slot_minutes, max_duration_minutes, buffer_minutes, cancel_cutoff_minutes, requires_approval)
VALUES (1, '{1,2,3,4,5}', '08:00', '18:00', 30, 480, 0, 60, false)
ON CONFLICT (id) DO NOTHING;
