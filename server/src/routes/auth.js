const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const db = require('../db');
const { requireAuth, USER_COLUMNS } = require('../middleware/auth');

const router = express.Router();

// ---------- Validation ----------
const registerSchema = z.object({
  name: z.string({ error: 'name is required' }).trim().min(1, 'name is required'),
  email: z.string({ error: 'email is required' }).trim().toLowerCase().pipe(z.email('email is not valid')),
  password: z.string({ error: 'password is required' }).min(8, 'password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string({ error: 'email is required' }).trim().toLowerCase().pipe(z.email('email is not valid')),
  password: z.string({ error: 'password is required' }).min(1, 'password is required'),
});

// Returns the data if valid, or sends a 400 with the first error and returns null.
function validate(schema, body, res) {
  const result = schema.safeParse(body || {});
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return null;
  }
  return result.data;
}

function makeToken(user) {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// ---------- POST /api/auth/register ----------
router.post('/register', async (req, res) => {
  const data = validate(registerSchema, req.body, res);
  if (!data) return;

  const passwordHash = await bcrypt.hash(data.password, 10);

  try {
    const { rows } = await db.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING ${USER_COLUMNS}`,
      [data.name, data.email, passwordHash]
    );
    const user = rows[0];
    res.status(201).json({ token: makeToken(user), user });
  } catch (err) {
    if (err.code === '23505') {
      // 23505 = unique violation (email already used)
      return res.status(409).json({ error: 'Email is already registered' });
    }
    throw err;
  }
});

// ---------- POST /api/auth/login ----------
router.post('/login', async (req, res) => {
  const data = validate(loginSchema, req.body, res);
  if (!data) return;

  const { rows } = await db.query(
    `SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = $1`,
    [data.email]
  );
  const found = rows[0];

  // Same message for wrong email or wrong password, so nobody can check which emails exist.
  if (!found || !(await bcrypt.compare(data.password, found.password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (!found.is_active) {
    return res.status(401).json({ error: 'Account is deactivated' });
  }

  const { password_hash, ...user } = found; // remove the hash before sending
  res.json({ token: makeToken(user), user });
});

// ---------- GET /api/auth/me ----------
router.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

module.exports = router;
