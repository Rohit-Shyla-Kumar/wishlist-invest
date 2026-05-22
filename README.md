# Wishlist → Wealth

Wishlist calculator with **accounts**, **SQLite persistence**, consideration **countdowns**, and investment projections in **SGD / USD / GBP / HKD**.

**Formula:** `future value = price × (1 + annual rate)^years` at 5, 10, 25, and 50 years.

Each item keeps the **price and currency from when it was added**. The dashboard converts to your chosen display currency using static illustrative FX rates.

## Quick start

```powershell
cd C:\Users\rohit\source\repos\wishlist-invest
copy .env.example .env
npm install
npm start
```

Open **http://localhost:3000** → create an account → add wishlist items.

| Page | URL |
|------|-----|
| Home | `/` |
| Register | `/register` |
| Sign in | `/login` |
| Dashboard | `/dashboard` |

## Features

- **Sign up / sign in** — username + password (bcrypt hash + salt, 12 rounds)
- **Wishlist items** — name, price, product link, cooldown, investment assumption
- **Original currency** stored per item; display currency preference per user (default SGD)
- **Live countdown** until consideration ends → extend, mark purchased, or remove
- **Browser notifications** (optional) when a timer ends
- **Projections** at 5 / 10 / 25 / 50 years with per-item and combined totals

## Project layout

```
server/           Express API + SQLite
  lib/finance.js  Shared rates & calculations
  db.js           Schema (users, wishlist_items)
public/           Static UI (HTML, CSS, JS)
data/             SQLite database (gitignored)
```

## API (session cookie)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/auth/me` | Current user |
| PATCH | `/api/auth/preferences` | `{ displayCurrency }` |
| GET | `/api/items` | List active wishlist items |
| POST | `/api/items` | Add item |
| POST | `/api/items/:id/extend` | Reset cooldown |
| POST | `/api/items/:id/purchase` | Mark purchased |
| DELETE | `/api/items/:id` | Remove from wishlist |

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | HTTP port |
| `SESSION_SECRET` | *(dev fallback)* | Session signing — **set in production** |

## Deploy notes

This app needs a **Node.js host** (not static-only Pages). Options:

- [Railway](https://railway.app), [Render](https://render.com), [Fly.io](https://fly.io), or a VPS
- Set `SESSION_SECRET` and `NODE_ENV=production`
- Persist the `data/` volume so SQLite survives restarts

Cloudflare Pages alone cannot run this backend; use **Cloudflare Workers + D1** later if you want to stay on Cloudflare.

## Future

Product links are stored for a planned **AI agent** to purchase items or auto-invest when the user decides.

## Disclaimer

Educational tool only — not financial advice. FX and return rates are illustrative assumptions.
