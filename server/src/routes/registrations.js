const express = require('express');
const { z } = require('zod');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

const REGISTRATION_SELECT = `
  SELECT
    r.id,
    r.event_id,
    e.title AS event_title,
    e.starts_at AS event_starts_at,
    e.status AS event_status,
    r.user_id,
    u.name AS user_name,
    r.note,
    r.status,
    r.created_at
  FROM registrations r
  JOIN events e ON e.id = r.event_id
  JOIN users u ON u.id = r.user_id
`;

const STATUS_VALUES = ['registered', 'attended', 'absent', 'cancelled'];

const createSchema = z.object({
  note: z.string().optional(),
});

const attendanceSchema = z.object({
  status: z.enum(['attended', 'absent'], {
    error: 'status must be attended or absent',
  }),
});

function validate(schema, body, res) {
  const result = schema.safeParse(body || {});
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return null;
  }
  return result.data;
}

function parseId(value, label, res) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: `${label} must be a positive whole number` });
    return null;
  }
  return id;
}

function parsePagination(query, res) {
  const pageRaw = query.page === undefined ? 1 : Number(query.page);
  const limitRaw = query.limit === undefined ? 20 : Number(query.limit);

  if (!Number.isInteger(pageRaw) || pageRaw < 1) {
    res.status(400).json({ error: 'page must be a whole number of 1 or higher' });
    return null;
  }
  if (!Number.isInteger(limitRaw) || limitRaw < 1 || limitRaw > 50) {
    res.status(400).json({ error: 'limit must be a whole number from 1 to 50' });
    return null;
  }

  return {
    page: pageRaw,
    limit: limitRaw,
    offset: (pageRaw - 1) * limitRaw,
  };
}

function parseStatusFilter(value, res) {
  if (value === undefined || value === '') return null;
  if (!STATUS_VALUES.includes(value)) {
    res.status(400).json({
      error: 'status must be registered, attended, absent, or cancelled',
    });
    return undefined;
  }
  return value;
}

async function getRegistrationById(id, client = db) {
  const { rows } = await client.query(
    `${REGISTRATION_SELECT} WHERE r.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function getEventWithOrg(eventId, client = db) {
  const { rows } = await client.query(
    `SELECT e.*, o.organizer_id
     FROM events e
     JOIN organizations o ON o.id = e.organization_id
     WHERE e.id = $1`,
    [eventId]
  );
  return rows[0] || null;
}

function isEventOwnerOrAdmin(user, event) {
  return user.role === 'admin' || event.organizer_id === user.id;
}

// ---------- POST /api/events/:id/registrations ----------
router.post('/events/:id/registrations', requireAuth, async (req, res) => {
  if (req.user.role !== 'volunteer') {
    return res.status(403).json({ error: 'You are not allowed to do this' });
  }

  const eventId = parseId(req.params.id, 'Event ID', res);
  if (!eventId) return;

  const data = validate(createSchema, req.body, res);
  if (!data) return;

  const note = data.note !== undefined && data.note.trim() !== '' ? data.note.trim() : null;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: eventRows } = await client.query(
      `SELECT id, status, starts_at, slots
       FROM events
       WHERE id = $1
       FOR UPDATE`,
      [eventId]
    );
    const event = eventRows[0];

    if (!event) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Not found' });
    }

    if (event.status !== 'upcoming' || new Date(event.starts_at) <= new Date()) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Event is not open for registration' });
    }

    const { rows: countRows } = await client.query(
      `SELECT COUNT(*)::int AS taken
       FROM registrations
       WHERE event_id = $1 AND status IN ('registered', 'attended')`,
      [eventId]
    );
    if (countRows[0].taken >= event.slots) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Event is full' });
    }

    let inserted;
    try {
      const { rows } = await client.query(
        `INSERT INTO registrations (event_id, user_id, note)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [eventId, req.user.id, note]
      );
      inserted = rows[0];
    } catch (err) {
      if (err.code === '23505') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'You are already registered for this event' });
      }
      throw err;
    }

    const registration = await getRegistrationById(inserted.id, client);
    await client.query('COMMIT');
    res.status(201).json(registration);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

// ---------- GET /api/events/:id/registrations ----------
router.get('/events/:id/registrations', requireAuth, async (req, res) => {
  const eventId = parseId(req.params.id, 'Event ID', res);
  if (!eventId) return;

  const pagination = parsePagination(req.query, res);
  if (!pagination) return;

  const status = parseStatusFilter(req.query.status, res);
  if (status === undefined) return;

  const event = await getEventWithOrg(eventId);
  if (!event) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (!isEventOwnerOrAdmin(req.user, event)) {
    return res.status(403).json({ error: 'You are not allowed to do this' });
  }

  const params = [eventId];
  let where = 'WHERE r.event_id = $1';
  if (status) {
    params.push(status);
    where += ` AND r.status = $${params.length}`;
  }

  const countResult = await db.query(
    `SELECT COUNT(*)::int AS total
     FROM registrations r
     ${where}`,
    params
  );

  params.push(pagination.limit, pagination.offset);
  const { rows } = await db.query(
    `${REGISTRATION_SELECT}
     ${where}
     ORDER BY r.created_at ASC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  res.json({
    data: rows,
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total: countResult.rows[0].total,
    },
  });
});

// ---------- GET /api/users/me/registrations ----------
router.get(
  '/users/me/registrations',
  requireAuth,
  requireRole('volunteer'),
  async (req, res) => {
    const pagination = parsePagination(req.query, res);
    if (!pagination) return;

    const status = parseStatusFilter(req.query.status, res);
    if (status === undefined) return;

    const params = [req.user.id];
    let where = 'WHERE r.user_id = $1';
    if (status) {
      params.push(status);
      where += ` AND r.status = $${params.length}`;
    }

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total
       FROM registrations r
       ${where}`,
      params
    );

    params.push(pagination.limit, pagination.offset);
    const { rows } = await db.query(
      `${REGISTRATION_SELECT}
       ${where}
       ORDER BY e.starts_at ASC, r.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      data: rows,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total: countResult.rows[0].total,
      },
    });
  }
);

// ---------- PATCH /api/registrations/:id ----------
router.patch('/registrations/:id', requireAuth, async (req, res) => {
  const registrationId = parseId(req.params.id, 'Registration ID', res);
  if (!registrationId) return;

  const data = validate(attendanceSchema, req.body, res);
  if (!data) return;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT r.id, r.status AS registration_status,
              e.id AS event_id, e.status AS event_status, e.starts_at,
              o.organizer_id
       FROM registrations r
       JOIN events e ON e.id = r.event_id
       JOIN organizations o ON o.id = e.organization_id
       WHERE r.id = $1
       FOR UPDATE OF r`,
      [registrationId]
    );
    const row = rows[0];

    if (!row) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Not found' });
    }

    // Spec: organizer who owns the event (not admin unless they are the owner)
    if (row.organizer_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You are not allowed to do this' });
    }

    if (row.event_status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Attendance can\'t be marked for a cancelled event' });
    }

    if (new Date(row.starts_at) > new Date()) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Attendance can be marked once the event starts' });
    }

    if (row.registration_status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Cancelled registrations can\'t be updated' });
    }

    await client.query(
      `UPDATE registrations SET status = $1 WHERE id = $2`,
      [data.status, registrationId]
    );

    const registration = await getRegistrationById(registrationId, client);
    await client.query('COMMIT');
    res.json(registration);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

// ---------- DELETE /api/registrations/:id ----------
router.delete('/registrations/:id', requireAuth, async (req, res) => {
  const registrationId = parseId(req.params.id, 'Registration ID', res);
  if (!registrationId) return;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT r.id, r.user_id, r.status, e.starts_at
       FROM registrations r
       JOIN events e ON e.id = r.event_id
       WHERE r.id = $1
       FOR UPDATE OF r`,
      [registrationId]
    );
    const row = rows[0];

    if (!row) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Not found' });
    }

    if (row.user_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You are not allowed to do this' });
    }

    if (row.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Registration is already cancelled' });
    }

    if (row.status === 'attended' || row.status === 'absent') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Attendance was already recorded' });
    }

    if (new Date(row.starts_at) <= new Date()) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Cannot cancel after the event has started' });
    }

    await client.query(
      `UPDATE registrations SET status = 'cancelled' WHERE id = $1`,
      [registrationId]
    );

    await client.query('COMMIT');
    res.json({ message: 'Registration cancelled' });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

module.exports = router;
