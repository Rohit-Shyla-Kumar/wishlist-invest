import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "wishlist.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    display_currency TEXT NOT NULL DEFAULT 'SGD',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS wishlist_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL CHECK (price > 0),
    currency TEXT NOT NULL,
    product_url TEXT,
    cooldown_value INTEGER NOT NULL CHECK (cooldown_value >= 1),
    cooldown_unit TEXT NOT NULL,
    consideration_ends_at TEXT NOT NULL,
    investment_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'considering'
      CHECK (status IN ('considering', 'purchased', 'deleted')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_items_user_status
    ON wishlist_items(user_id, status);
`);

export default db;
