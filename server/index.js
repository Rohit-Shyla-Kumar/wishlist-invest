import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import itemRoutes from "./routes/items.js";
import {
  HORIZONS,
  INVESTMENTS,
  CURRENCIES,
  DEFAULT_CURRENCY,
} from "./lib/finance.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const PORT = Number(process.env.PORT) || 3000;
const SESSION_SECRET =
  process.env.SESSION_SECRET || "dev-only-change-in-production";

const app = express();

app.use(express.json());
app.use(
  session({
    name: "wishlist.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.get("/api/meta", (_req, res) => {
  res.json({
    horizons: HORIZONS,
    investments: INVESTMENTS,
    currencies: CURRENCIES,
    defaultCurrency: DEFAULT_CURRENCY,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);

app.use(express.static(publicDir));

app.get("/dashboard", (_req, res) => {
  res.sendFile(path.join(publicDir, "dashboard.html"));
});

app.get("/login", (_req, res) => {
  res.sendFile(path.join(publicDir, "login.html"));
});

app.get("/register", (_req, res) => {
  res.sendFile(path.join(publicDir, "register.html"));
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Wishlist → Wealth running at http://localhost:${PORT}`);
});
