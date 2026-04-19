// backend/src/config/database.js
// SQLite database initialization using node-sqlite3-wasm (pure WebAssembly, no compilation needed)

const { Database } = require('node-sqlite3-wasm');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../snapguide.db');

let db;

/**
 * Returns the singleton database instance.
 */
function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL'); // Better concurrent performance
    db.exec('PRAGMA foreign_keys = ON');
  }
  return db;
}

/**
 * Creates all tables on first run.
 */
function initDatabase() {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      email     TEXT    UNIQUE NOT NULL,
      password  TEXT    NOT NULL,
      name      TEXT    NOT NULL DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tutorials (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL,
      title        TEXT    NOT NULL DEFAULT 'Untitled Tutorial',
      description  TEXT    DEFAULT '',
      share_token  TEXT    UNIQUE,
      is_public    INTEGER DEFAULT 0,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS steps (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      tutorial_id         INTEGER NOT NULL,
      order_index         INTEGER NOT NULL DEFAULT 0,
      action_type         TEXT    DEFAULT 'click',
      element_selector    TEXT    DEFAULT '',
      element_description TEXT    DEFAULT '',
      instruction         TEXT    NOT NULL DEFAULT '',
      screenshot_url      TEXT    DEFAULT '',
      page_url            TEXT    DEFAULT '',
      metadata            TEXT    DEFAULT '{}',
      created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tutorial_id) REFERENCES tutorials(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS assets (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      tutorial_id   INTEGER,
      step_id       INTEGER,
      filename      TEXT NOT NULL,
      original_name TEXT,
      mime_type     TEXT,
      size          INTEGER,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tutorial_id) REFERENCES tutorials(id) ON DELETE CASCADE
    );
  `);

  console.log('Database initialized at:', DB_PATH);
}

// Ensure uploads directory exists
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

module.exports = { getDb, initDatabase, UPLOADS_DIR };
