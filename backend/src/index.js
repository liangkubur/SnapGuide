// backend/src/index.js
// Main Express server entry point

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./config/database');

const authRoutes     = require('./routes/auth');
const tutorialRoutes = require('./routes/tutorials');
const stepRoutes     = require('./routes/steps');
const assetRoutes    = require('./routes/assets');
const exportRoutes   = require('./routes/export');

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── Initialize Database ────────────────────────────────────────────────────
initDatabase();

// ─── CORS ───────────────────────────────────────────────────────────────────
// Allow the Next.js frontend AND Chrome extension origins
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4000';

app.use(cors({
  origin(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    // Allow frontend URL
    if (origin === FRONTEND_URL) return callback(null, true);
    // Allow any Chrome extension
    if (/^chrome-extension:\/\//.test(origin)) return callback(null, true);
    // Allow localhost variants during development
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ─── Body Parsers ────────────────────────────────────────────────────────────
// 50 MB limit for base64 screenshot uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ─── Static File Serving (uploaded screenshots) ─────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/tutorials', tutorialRoutes);
app.use('/api/steps',     stepRoutes);
app.use('/api/assets',    assetRoutes);
app.use('/api/export',    exportRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'SnapGuide API is running', timestamp: new Date().toISOString() });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 SnapGuide API running on http://localhost:${PORT}`);
  console.log(`   Frontend expected at: ${FRONTEND_URL}`);
});
