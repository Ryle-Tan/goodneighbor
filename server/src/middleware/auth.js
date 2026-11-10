const jwt = require('jsonwebtoken');
const db = require('../db');

// Columns that are safe to send to the client (never password_hash).
const USER_COLUMNS = 'id, name, email, phone, role, is_active, created_at';

// requireAuth: only lets logged-in users through.
// After this runs, req.user has the current user from the database.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');

  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Invalid or missing token' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or missing token' });
  }

  // Load the user fresh from the DB, so role changes and deactivation apply right away.
  const { rows } = await db.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [payload.id]);
  const user = rows[0];

  if (!user) {
    return res.status(401).json({ error: 'Invalid or missing token' });
  }
  if (!user.is_active) {
    return res.status(401).json({ error: 'Account is deactivated' });
  }

  req.user = user;
  next();
}

// requireRole('admin') or requireRole('organizer', 'admin')
// Use AFTER requireAuth.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You are not allowed to do this' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole, USER_COLUMNS };
