# Wishlist → Wealth

A simple static calculator that shows how much your impulse or wishlist purchases could be worth if you invested the money instead.

**Formula:** `future value = price × (1 + annual rate)^years` at 5, 10, and 25 years.

Rates are illustrative assumptions only — not financial advice.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure, form, results |
| `styles.css` | Layout and styling (mobile-first, iPhone-safe) |
| `app.js` | Wishlist logic and projections |

## Run locally

**Option A — open in browser (Windows)**

```powershell
cd C:\Users\rohit\source\repos\wishlist-invest
start index.html
```

**Option B — local server (recommended)**

```powershell
cd C:\Users\rohit\source\repos\wishlist-invest
python -m http.server 8080
```

Then open `http://localhost:8080` on your PC, or `http://YOUR_PC_IP:8080` on your phone (same Wi‑Fi).

## Deploy to Cloudflare Pages

This project is **static HTML** — no build step. Cloudflare serves the repo root as the site.

### Prerequisites

- A [Cloudflare](https://dash.cloudflare.com/sign-up) account (free tier is fine)
- Your code in **GitHub**, **GitLab**, or ready to upload as a folder

### Option 1 — Connect Git (recommended)

1. Push this folder to a new GitHub repo (e.g. `wishlist-invest`).
2. In Cloudflare Dashboard: **Workers & Pages → Create → Pages → Connect to Git**.
3. Select the repo and branch (`main`).
4. **Build settings:**
   - **Framework preset:** None
   - **Build command:** *(leave empty)*
   - **Build output directory:** `/` or `.` (project root — where `index.html` lives)
5. Click **Save and Deploy**.

After the first deploy, your site is live at `https://<project-name>.pages.dev`. You can add a custom domain under **Custom domains**.

### Option 2 — Direct Upload (no Git)

1. **Workers & Pages → Create → Pages → Upload assets**.
2. Name the project (e.g. `wishlist-invest`).
3. Drag in these files (same folder level): `index.html`, `styles.css`, `app.js`.
4. Deploy.

Re-upload when you change files (or switch to Git later).

### Option 3 — Wrangler CLI (optional)

```powershell
npm install -g wrangler
cd C:\Users\rohit\source\repos\wishlist-invest
wrangler pages deploy . --project-name=wishlist-invest
```

Log in when prompted (`wrangler login`). Each deploy updates the same `*.pages.dev` URL.

### Cloudflare settings checklist

| Setting | Value |
|---------|--------|
| Build command | *(empty)* |
| Build output directory | `.` (root) |
| Node version | Not required |

No `functions`, environment variables, or SSR needed.

### Custom domain (optional)

1. In your Pages project: **Custom domains → Set up a custom domain**.
2. Follow the wizard to add a DNS record in Cloudflare (or your registrar).
3. HTTPS is automatic.

## Usage

1. Enter an item name and price.
2. Set a **wait before buying** period (days, weeks, or months).
3. Pick an investment assumption from the dropdown.
4. Click **Add to wishlist** — projections update immediately.
5. Review per-item values and the combined totals card.

Remove items with **Remove** on each card.

## Mobile / iPhone

The layout uses safe-area insets (notch/home indicator), 16px+ form fields (avoids iOS zoom-on-focus), and touch-friendly button sizes. Test on a real device via your deployed `*.pages.dev` URL or local server on the same network.
