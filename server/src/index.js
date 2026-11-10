require('dotenv').config({ quiet: true });

const express = require('express');
const cors = require('cors');

const healthRoutes = require('./routes/health');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/health', healthRoutes);

// 404 for any route that doesn't exist
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler: Express 5 sends errors from async routes here automatically.
// The real error is logged in the terminal; the client only gets a safe message.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`GoodNeighbor API running on http://localhost:${PORT}`);
});
