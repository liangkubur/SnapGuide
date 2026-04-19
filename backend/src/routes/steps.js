// backend/src/routes/steps.js
// CRUD for tutorial steps, including screenshot upload

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb, UPLOADS_DIR } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `screenshot-${uniqueSuffix}${path.extname(file.originalname) || '.png'}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// GET /api/steps/:tutorialId - list steps for a tutorial
router.get('/:tutorialId', requireAuth, (req, res) => {
  const db = getDb();

  // Verify ownership
  const tutorial = db.get(
    'SELECT id FROM tutorials WHERE id = ? AND user_id = ?',
    [req.params.tutorialId, req.user.id]
  );

  if (!tutorial) {
    return res.status(404).json({ error: 'Tutorial not found' });
  }

  const steps = db.all(
    'SELECT * FROM steps WHERE tutorial_id = ? ORDER BY order_index ASC',
    [req.params.tutorialId]
  );

  res.json({ steps });
});

// POST /api/steps - create a new step with optional screenshot
router.post('/', requireAuth, upload.single('screenshot'), (req, res) => {
  const {
    tutorial_id,
    order_index,
    action_type,
    element_selector,
    element_description,
    instruction,
    page_url,
    metadata,
  } = req.body;

  if (!tutorial_id) {
    return res.status(400).json({ error: 'tutorial_id is required' });
  }

  const db = getDb();

  // Verify ownership of parent tutorial
  const tutorial = db.get(
    'SELECT id FROM tutorials WHERE id = ? AND user_id = ?',
    [tutorial_id, req.user.id]
  );

  if (!tutorial) {
    return res.status(404).json({ error: 'Tutorial not found' });
  }

  // Determine next order index if not provided
  let stepOrder = order_index;
  if (stepOrder === undefined || stepOrder === null || stepOrder === '') {
    const maxOrder = db.get(
      'SELECT MAX(order_index) as max_order FROM steps WHERE tutorial_id = ?',
      [tutorial_id]
    );
    stepOrder = (maxOrder?.max_order ?? -1) + 1;
  }

  const screenshotUrl = req.file
    ? `/uploads/${req.file.filename}`
    : (req.body.screenshot_url || '');

  const result = db.run(`
    INSERT INTO steps
      (tutorial_id, order_index, action_type, element_selector, element_description,
       instruction, screenshot_url, page_url, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    tutorial_id,
    stepOrder,
    action_type || 'click',
    element_selector || '',
    element_description || '',
    instruction || '',
    screenshotUrl,
    page_url || '',
    metadata || '{}'
  ]);

  // Update tutorial's updated_at
  db.run('UPDATE tutorials SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [tutorial_id]);

  const step = db.get('SELECT * FROM steps WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json({ step });
});

// PUT /api/steps/:id - update a step
router.put('/:id', requireAuth, upload.single('screenshot'), (req, res) => {
  const db = getDb();

  // Verify step belongs to current user's tutorial
  const step = db.get(`
    SELECT s.* FROM steps s
    JOIN tutorials t ON t.id = s.tutorial_id
    WHERE s.id = ? AND t.user_id = ?
  `, [req.params.id, req.user.id]);

  if (!step) {
    return res.status(404).json({ error: 'Step not found' });
  }

  const {
    instruction,
    action_type,
    element_selector,
    element_description,
    page_url,
    metadata,
  } = req.body;

  let screenshotUrl = step.screenshot_url;

  if (req.file) {
    // Delete old screenshot if it exists
    if (step.screenshot_url) {
      const oldPath = path.join(UPLOADS_DIR, path.basename(step.screenshot_url));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    screenshotUrl = `/uploads/${req.file.filename}`;
  }

  db.run(`
    UPDATE steps
    SET instruction = ?, action_type = ?, element_selector = ?,
        element_description = ?, page_url = ?, metadata = ?, screenshot_url = ?
    WHERE id = ?
  `, [
    instruction ?? step.instruction,
    action_type ?? step.action_type,
    element_selector ?? step.element_selector,
    element_description ?? step.element_description,
    page_url ?? step.page_url,
    metadata ?? step.metadata,
    screenshotUrl,
    req.params.id
  ]);

  db.run('UPDATE tutorials SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [step.tutorial_id]);

  const updated = db.get('SELECT * FROM steps WHERE id = ?', [req.params.id]);
  res.json({ step: updated });
});

// DELETE /api/steps/:id
router.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();

  const step = db.get(`
    SELECT s.* FROM steps s
    JOIN tutorials t ON t.id = s.tutorial_id
    WHERE s.id = ? AND t.user_id = ?
  `, [req.params.id, req.user.id]);

  if (!step) {
    return res.status(404).json({ error: 'Step not found' });
  }

  // Delete associated screenshot
  if (step.screenshot_url) {
    const imgPath = path.join(UPLOADS_DIR, path.basename(step.screenshot_url));
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  }

  db.run('DELETE FROM steps WHERE id = ?', [req.params.id]);
  db.run('UPDATE tutorials SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [step.tutorial_id]);

  res.json({ message: 'Step deleted' });
});

// POST /api/steps/reorder - reorder steps by providing ordered array of ids
router.post('/reorder', requireAuth, (req, res) => {
  const { tutorial_id, step_ids } = req.body;

  if (!tutorial_id || !Array.isArray(step_ids)) {
    return res.status(400).json({ error: 'tutorial_id and step_ids array required' });
  }

  const db = getDb();

  // Verify ownership
  const tutorial = db.get(
    'SELECT id FROM tutorials WHERE id = ? AND user_id = ?',
    [tutorial_id, req.user.id]
  );

  if (!tutorial) {
    return res.status(404).json({ error: 'Tutorial not found' });
  }

  db.exec('BEGIN');
  try {
    step_ids.forEach((id, index) => {
      db.run('UPDATE steps SET order_index = ? WHERE id = ? AND tutorial_id = ?', [index, id, tutorial_id]);
    });
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  db.run('UPDATE tutorials SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [tutorial_id]);

  const steps = db.all(
    'SELECT * FROM steps WHERE tutorial_id = ? ORDER BY order_index ASC',
    [tutorial_id]
  );

  res.json({ steps });
});

// POST /api/steps/bulk - bulk create steps (used by extension at end of recording)
router.post('/bulk', requireAuth, (req, res) => {
  const { tutorial_id, steps } = req.body;

  if (!tutorial_id || !Array.isArray(steps)) {
    return res.status(400).json({ error: 'tutorial_id and steps array required' });
  }

  const db = getDb();

  const tutorial = db.get(
    'SELECT id FROM tutorials WHERE id = ? AND user_id = ?',
    [tutorial_id, req.user.id]
  );

  if (!tutorial) {
    return res.status(404).json({ error: 'Tutorial not found' });
  }

  db.exec('BEGIN');
  try {
    steps.forEach((step, index) => {
      db.run(`
        INSERT INTO steps
          (tutorial_id, order_index, action_type, element_selector, element_description,
           instruction, screenshot_url, page_url, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        tutorial_id,
        step.order_index ?? index,
        step.action_type || 'click',
        step.element_selector || '',
        step.element_description || '',
        step.instruction || '',
        step.screenshot_url || '',
        step.page_url || '',
        JSON.stringify(step.metadata || {})
      ]);
    });
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  db.run('UPDATE tutorials SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [tutorial_id]);

  const saved = db.all(
    'SELECT * FROM steps WHERE tutorial_id = ? ORDER BY order_index ASC',
    [tutorial_id]
  );

  res.status(201).json({ steps: saved });
});

module.exports = router;
