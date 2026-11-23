/**
 * Seeds local test data so LIM can exercise registrations endpoints.
 * Run: node db/seed_lim_test.js
 * Logins (password for both: password123):
 *   volunteer: gail@gmail.com (existing) or volunteer@test.com
 *   organizer: organizer@test.com
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { pool } = require('../src/db');

async function upsertUser({ name, email, role, password }) {
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE
       SET name = EXCLUDED.name,
           role = EXCLUDED.role,
           password_hash = EXCLUDED.password_hash,
           is_active = TRUE
     RETURNING id, email, role`,
    [name, email, hash, role]
  );
  return rows[0];
}

async function main() {
  const volunteer = await upsertUser({
    name: 'Test Volunteer',
    email: 'volunteer@test.com',
    role: 'volunteer',
    password: 'password123',
  });

  const organizer = await upsertUser({
    name: 'Org Owner',
    email: 'organizer@test.com',
    role: 'organizer',
    password: 'password123',
  });

  const { rows: orgRows } = await pool.query(
    `INSERT INTO organizations (organizer_id, name, org_type, description, contact_email)
     VALUES ($1, $2, 'ngo', 'Test org for LIM registrations', $3)
     ON CONFLICT (organizer_id) DO UPDATE
       SET name = EXCLUDED.name,
           contact_email = EXCLUDED.contact_email,
           deleted_at = NULL
     RETURNING id, name`,
    [organizer.id, 'GoodNeighbor Test Org', organizer.email]
  );
  const org = orgRows[0];

  // Clear prior seed events for this org so re-runs stay predictable
  await pool.query(
    `DELETE FROM registrations
     WHERE event_id IN (SELECT id FROM events WHERE organization_id = $1)`,
    [org.id]
  );
  await pool.query(`DELETE FROM events WHERE organization_id = $1`, [org.id]);

  const { rows: events } = await pool.query(
    `INSERT INTO events
       (organization_id, title, description, category, starts_at, ends_at, slots, address, lat, lng, status)
     VALUES
       ($1, 'Cagayan de Oro River Cleanup', 'Bring gloves', 'cleanup',
        NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days' + INTERVAL '3 hours',
        20, 'Macasandig, Cagayan de Oro', 8.4542, 124.6319, 'upcoming'),
       ($1, 'Gaston Park Community Day', 'Community day', 'other',
        NOW() + INTERVAL '14 days', NOW() + INTERVAL '14 days' + INTERVAL '4 hours',
        2, 'Divisoria, Cagayan de Oro', 8.4822, 124.6472, 'upcoming'),
       ($1, 'Past Coastal Cleanup (for attendance)', 'Already started', 'cleanup',
        NOW() - INTERVAL '2 hours', NOW() + INTERVAL '1 hour',
        10, 'Bugo, Cagayan de Oro', 8.5080, 124.7500, 'upcoming')
     RETURNING id, title, starts_at, slots, status`,
    [org.id]
  );

  console.log('Seeded users:', { volunteer, organizer });
  console.log('Seeded org:', org);
  console.log('Seeded events:', events);
  console.log('\nPasswords: password123');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
