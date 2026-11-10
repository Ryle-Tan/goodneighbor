const { Pool } = require('pg');

// One shared pool of connections for the whole app.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Log errors from idle connections (e.g. Postgres restarted) instead of crashing.
pool.on('error', (err) => {
  console.error('Unexpected database error:', err.message);
});

// Use parameters ($1, $2, ...) for any user input to avoid SQL injection:
//   query('SELECT * FROM users WHERE id = $1', [id])
const query = (text, params) => pool.query(text, params);

module.exports = { query, pool };
