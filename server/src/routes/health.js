const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/health -> checks that the server is up and the database answers
router.get('/', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    console.error('Health check failed:', err.message);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

module.exports = router;
