// backend/src/routes/tutorials.js
// CRUD for tutorials

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/tutorials - list all tutorials for authenticated user
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const tutorials = db.all(`
    SELECT t.*, COUNT(s.id) as step_count
    FROM tutorials t
    LEFT JOIN steps s ON s.tutorial_id = t.id
    WHERE t.user_id = ?
    GROUP BY t.id
    ORDER BY t.updated_at DESC
  `, [req.user.id]);

  res.json({ tutorials });
});

// GET /api/tutorials/:id - get single tutorial with steps
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const tutorial = db.get(
    'SELECT * FROM tutorials WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );

  if (!tutorial) {
    return res.status(404).json({ error: 'Tutorial not found' });
  }

  const steps = db.all(
    'SELECT * FROM steps WHERE tutorial_id = ? ORDER BY order_index ASC',
    [tutorial.id]
  );

  res.json({ tutorial, steps });
});

// GET /api/tutorials/share/:token - public share link (no auth required)
router.get('/share/:token', (req, res) => {
  const db = getDb();
  const tutorial = db.get(
    'SELECT * FROM tutorials WHERE share_token = ? AND is_public = 1',
    [req.params.token]
  );

  if (!tutorial) {
    return res.status(404).json({ error: 'Tutorial not found or not public' });
  }

  const steps = db.all(
    'SELECT * FROM steps WHERE tutorial_id = ? ORDER BY order_index ASC',
    [tutorial.id]
  );

  res.json({ tutorial, steps });
});

// POST /api/tutorials - create new tutorial
router.post('/', requireAuth, (req, res) => {
  const { title, description } = req.body;
  const db = getDb();

  const result = db.run(
    'INSERT INTO tutorials (user_id, title, description) VALUES (?, ?, ?)',
    [req.user.id, title || 'Untitled Tutorial', description || '']
  );

  const tutorial = db.get('SELECT * FROM tutorials WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json({ tutorial });
});

// PUT /api/tutorials/:id - update tutorial
router.put('/:id', requireAuth, (req, res) => {
  const { title, description, is_public } = req.body;
  const db = getDb();

  const tutorial = db.get(
    'SELECT * FROM tutorials WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );

  if (!tutorial) {
    return res.status(404).json({ error: 'Tutorial not found' });
  }

  // Generate share token if making public for the first time
  let shareToken = tutorial.share_token;
  if (is_public && !shareToken) {
    shareToken = uuidv4().replace(/-/g, '');
  }

  db.run(`
    UPDATE tutorials
    SET title = ?, description = ?, is_public = ?, share_token = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `, [
    title ?? tutorial.title,
    description ?? tutorial.description,
    is_public !== undefined ? (is_public ? 1 : 0) : tutorial.is_public,
    shareToken,
    req.params.id,
    req.user.id
  ]);

  const updated = db.get('SELECT * FROM tutorials WHERE id = ?', [req.params.id]);
  res.json({ tutorial: updated });
});

// DELETE /api/tutorials/:id
router.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const tutorial = db.get(
    'SELECT * FROM tutorials WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );

  if (!tutorial) {
    return res.status(404).json({ error: 'Tutorial not found' });
  }

  db.run('DELETE FROM tutorials WHERE id = ?', [req.params.id]);
  res.json({ message: 'Tutorial deleted' });
});

// POST /api/tutorials/:id/share - toggle public sharing
router.post('/:id/share', requireAuth, (req, res) => {
  const db = getDb();
  const tutorial = db.get(
    'SELECT * FROM tutorials WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );

  if (!tutorial) {
    return res.status(404).json({ error: 'Tutorial not found' });
  }

  const newIsPublic = tutorial.is_public ? 0 : 1;
  let shareToken = tutorial.share_token;

  // Generate token when first making public
  if (newIsPublic && !shareToken) {
    shareToken = uuidv4().replace(/-/g, '');
  }

  db.run(`
    UPDATE tutorials SET is_public = ?, share_token = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [newIsPublic, shareToken, req.params.id]);

  const updated = db.get('SELECT * FROM tutorials WHERE id = ?', [req.params.id]);
  res.json({ tutorial: updated });
});

module.exports = router;
