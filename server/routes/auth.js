import { Router } from "express";
import bcrypt from "bcrypt";
import db from "../db.js";
import { DEFAULT_CURRENCY, VALID_CURRENCIES } from "../lib/finance.js";

const router = Router();
const BCRYPT_ROUNDS = 12;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;

function sanitizeUser(row) {
  return {
    id: row.id,
    username: row.username,
    displayCurrency: row.display_currency,
    createdAt: row.created_at,
  };
}

router.post("/register", async (req, res) => {
  try {
    const username = String(req.body.username ?? "").trim();
    const password = String(req.body.password ?? "");

    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({
        error: "Username must be 3–32 characters (letters, numbers, underscore)",
      });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const existing = db
      .prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE")
      .get(username);
    if (existing) {
      return res.status(409).json({ error: "Username already taken" });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const result = db
      .prepare(
        "INSERT INTO users (username, password_hash, display_currency) VALUES (?, ?, ?)"
      )
      .run(username, passwordHash, DEFAULT_CURRENCY);

    req.session.userId = result.lastInsertRowid;
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.session.userId);
    res.status(201).json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const username = String(req.body.username ?? "").trim();
    const password = String(req.body.password ?? "");

    const user = db
      .prepare("SELECT * FROM users WHERE username = ? COLLATE NOCASE")
      .get(username);
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    req.session.userId = user.id;
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Logout failed" });
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

router.get("/me", (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.session.userId);
  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "Not signed in" });
  }
  res.json({ user: sanitizeUser(user) });
});

router.patch("/preferences", (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const displayCurrency = String(req.body.displayCurrency ?? "").toUpperCase();
  if (!VALID_CURRENCIES.includes(displayCurrency)) {
    return res.status(400).json({ error: "Invalid currency" });
  }
  db.prepare("UPDATE users SET display_currency = ? WHERE id = ?").run(
    displayCurrency,
    req.session.userId
  );
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.session.userId);
  res.json({ user: sanitizeUser(user) });
});

export default router;
