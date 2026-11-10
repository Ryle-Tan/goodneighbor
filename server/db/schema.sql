-- USERS
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone         TEXT,
  role          TEXT NOT NULL DEFAULT 'volunteer'
                CHECK (role IN ('volunteer', 'organizer', 'admin')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ORGANIZER APPLICATIONS
CREATE TABLE organizer_applications (
  id            SERIAL PRIMARY KEY,
  user_id       INT NOT NULL REFERENCES users(id),
  org_name      TEXT NOT NULL,
  org_type      TEXT NOT NULL
                CHECK (org_type IN ('ngo', 'lgu', 'barangay', 'school_org', 'other')),
  description   TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  proof_url     TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
  review_note   TEXT,
  reviewed_by   INT REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at   TIMESTAMPTZ
);

-- only one pending application per user (gives the 409)
CREATE UNIQUE INDEX one_pending_application_per_user
  ON organizer_applications(user_id) WHERE status = 'pending';

-- ORGANIZATIONS (created automatically when an application is approved)
CREATE TABLE organizations (
  id            SERIAL PRIMARY KEY,
  organizer_id  INT NOT NULL UNIQUE REFERENCES users(id),
  name          TEXT NOT NULL,
  org_type      TEXT NOT NULL
                CHECK (org_type IN ('ngo', 'lgu', 'barangay', 'school_org', 'other')),
  description   TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  is_verified   BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- EVENTS
CREATE TABLE events (
  id              SERIAL PRIMARY KEY,
  organization_id INT NOT NULL REFERENCES organizations(id),
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL
                  CHECK (category IN ('cleanup', 'tree_planting', 'feeding_program',
                                      'relief_operations', 'education', 'other')),
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ,
  slots           INT NOT NULL CHECK (slots >= 1),
  address         TEXT NOT NULL,
  lat             NUMERIC(9,6) NOT NULL,
  lng             NUMERIC(9,6) NOT NULL,
  safety_notes    TEXT,
  status          TEXT NOT NULL DEFAULT 'upcoming'
                  CHECK (status IN ('upcoming', 'cancelled', 'completed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_starts_at ON events(starts_at);
CREATE INDEX idx_events_status ON events(status);

-- REGISTRATIONS
-- no ON DELETE CASCADE on purpose: an event with registrations can't be deleted
CREATE TABLE registrations (
  id         SERIAL PRIMARY KEY,
  event_id   INT NOT NULL REFERENCES events(id),
  user_id    INT NOT NULL REFERENCES users(id),
  note       TEXT,
  status     TEXT NOT NULL DEFAULT 'registered'
             CHECK (status IN ('registered', 'attended', 'absent', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- one active registration per user per event
CREATE UNIQUE INDEX one_active_registration
  ON registrations(event_id, user_id) WHERE status <> 'cancelled';

CREATE INDEX idx_registrations_user ON registrations(user_id);
