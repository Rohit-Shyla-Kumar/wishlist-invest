import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../middleware.js";
import {
  VALID_CURRENCIES,
  VALID_COOLDOWN_UNITS,
  INVESTMENTS,
  computeConsiderationEndsAt,
} from "../lib/finance.js";

const router = Router();
router.use(requireAuth);

const investmentIds = new Set(INVESTMENTS.map((i) => i.id));

function rowToItem(row) {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    currency: row.currency,
    productUrl: row.product_url || null,
    cooldownValue: row.cooldown_value,
    cooldownUnit: row.cooldown_unit,
    considerationEndsAt: row.consideration_ends_at,
    investmentId: row.investment_id,
    status: row.status,
    createdAt: row.created_at,
  };
}

function isValidUrl(str) {
  if (!str) return true;
  try {
    const u = new URL(str);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

router.get("/", (req, res) => {
  const rows = db
    .prepare(
      `SELECT * FROM wishlist_items
       WHERE user_id = ? AND status = 'considering'
       ORDER BY consideration_ends_at ASC`
    )
    .all(req.session.userId);
  res.json({ items: rows.map(rowToItem) });
});

router.post("/", (req, res) => {
  const name = String(req.body.name ?? "").trim();
  const price = Number(req.body.price);
  const currency = String(req.body.currency ?? "").toUpperCase();
  const productUrl = String(req.body.productUrl ?? "").trim() || null;
  const cooldownValue = parseInt(req.body.cooldownValue, 10);
  const cooldownUnit = String(req.body.cooldownUnit ?? "");
  const investmentId = String(req.body.investmentId ?? "");

  if (!name || name.length > 200) {
    return res.status(400).json({ error: "Item name is required" });
  }
  if (!Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ error: "Valid price is required" });
  }
  if (!VALID_CURRENCIES.includes(currency)) {
    return res.status(400).json({ error: "Invalid currency" });
  }
  if (!VALID_COOLDOWN_UNITS.includes(cooldownUnit)) {
    return res.status(400).json({ error: "Invalid cooldown unit" });
  }
  if (!Number.isFinite(cooldownValue) || cooldownValue < 1) {
    return res.status(400).json({ error: "Invalid cooldown" });
  }
  if (!investmentIds.has(investmentId)) {
    return res.status(400).json({ error: "Invalid investment" });
  }
  if (!isValidUrl(productUrl)) {
    return res.status(400).json({ error: "Product link must be http or https" });
  }

  const considerationEndsAt = computeConsiderationEndsAt(cooldownValue, cooldownUnit);

  const result = db
    .prepare(
      `INSERT INTO wishlist_items (
        user_id, name, price, currency, product_url,
        cooldown_value, cooldown_unit, consideration_ends_at, investment_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.session.userId,
      name,
      price,
      currency,
      productUrl,
      cooldownValue,
      cooldownUnit,
      considerationEndsAt,
      investmentId
    );

  const row = db
    .prepare("SELECT * FROM wishlist_items WHERE id = ?")
    .get(result.lastInsertRowid);
  res.status(201).json({ item: rowToItem(row) });
});

router.post("/:id/extend", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = db
    .prepare(
      `SELECT * FROM wishlist_items
       WHERE id = ? AND user_id = ? AND status = 'considering'`
    )
    .get(id, req.session.userId);
  if (!row) return res.status(404).json({ error: "Item not found" });

  const considerationEndsAt = computeConsiderationEndsAt(
    row.cooldown_value,
    row.cooldown_unit
  );
  db.prepare(
    "UPDATE wishlist_items SET consideration_ends_at = ? WHERE id = ?"
  ).run(considerationEndsAt, id);

  const updated = db.prepare("SELECT * FROM wishlist_items WHERE id = ?").get(id);
  res.json({ item: rowToItem(updated) });
});

router.post("/:id/purchase", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const result = db
    .prepare(
      `UPDATE wishlist_items SET status = 'purchased'
       WHERE id = ? AND user_id = ? AND status = 'considering'`
    )
    .run(id, req.session.userId);
  if (result.changes === 0) return res.status(404).json({ error: "Item not found" });
  res.json({ ok: true });
});

router.delete("/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const result = db
    .prepare(
      `UPDATE wishlist_items SET status = 'deleted'
       WHERE id = ? AND user_id = ? AND status = 'considering'`
    )
    .run(id, req.session.userId);
  if (result.changes === 0) return res.status(404).json({ error: "Item not found" });
  res.json({ ok: true });
});

export default router;
