// backend/src/routes/assets.js
// Screenshot and asset upload/retrieval

const express = require('express');
const multer = require('multer');
const path = require('path');
const { getDb, UPLOADS_DIR } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `asset-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

// POST /api/assets/upload - upload a screenshot (base64 or file)
router.post('/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const db = getDb();
  const result = db.run(`
    INSERT INTO assets (tutorial_id, step_id, filename, original_name, mime_type, size)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    req.body.tutorial_id || null,
    req.body.step_id || null,
    req.file.filename,
    req.file.originalname,
    req.file.mimetype,
    req.file.size
  ]);

  res.status(201).json({
    asset: {
      id: result.lastInsertRowid,
      url: `/uploads/${req.file.filename}`,
      filename: req.file.filename,
    },
  });
});

// POST /api/assets/upload-base64 - upload screenshot as base64 string (used by extension)
router.post('/upload-base64', requireAuth, (req, res) => {
  const { dataUrl, tutorial_id, step_id } = req.body;

  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Valid base64 image dataUrl required' });
  }

  // Parse base64 data
  const matches = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!matches) {
    return res.status(400).json({ error: 'Invalid dataUrl format' });
  }

  const mimeType = matches[1];
  const extension = mimeType.split('/')[1].replace('jpeg', 'jpg');
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');

  const filename = `screenshot-${Date.now()}-${Math.round(Math.random() * 1e9)}.${extension}`;
  const filePath = path.join(UPLOADS_DIR, filename);

  require('fs').writeFileSync(filePath, buffer);

  const db = getDb();
  const result = db.run(`
    INSERT INTO assets (tutorial_id, step_id, filename, original_name, mime_type, size)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [tutorial_id || null, step_id || null, filename, filename, mimeType, buffer.length]);

  res.status(201).json({
    asset: {
      id: result.lastInsertRowid,
      url: `/uploads/${filename}`,
      filename,
    },
  });
});

module.exports = router;
