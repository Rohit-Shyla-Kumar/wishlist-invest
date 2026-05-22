import { api } from "./api.js";
import {
  HORIZONS,
  INVESTMENTS,
  CURRENCIES,
  DEFAULT_CURRENCY,
  convertAmount,
  formatMoney,
  formatCountdown,
  isExpired,
  projectItem,
  computeTotals,
} from "./finance.js";

let user = null;
let items = [];
let displayCurrency = DEFAULT_CURRENCY;
const promptedExpired = new Set();
let tickTimer = null;

const form = document.getElementById("item-form");
const investmentSelect = document.getElementById("investment");
const currencySelect = document.getElementById("currency");
const itemList = document.getElementById("item-list");
const emptyState = document.getElementById("empty-state");
const emptyStateText = document.getElementById("empty-state-text");
const resultsCount = document.getElementById("results-count");
const totalsCard = document.getElementById("totals-card");
const totalsPrice = document.getElementById("totals-price");
const totalsGrid = document.getElementById("totals-grid");
const priceLabel = document.getElementById("price-label");
const usernameEl = document.getElementById("nav-username");
const logoutBtn = document.getElementById("logout-btn");
const toast = document.getElementById("toast");

function initHorizonCount() {
  document.documentElement.style.setProperty("--horizon-count", String(HORIZONS.length));
}

function initSelects() {
  Object.values(CURRENCIES).forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.code;
    opt.textContent = c.label;
    currencySelect.appendChild(opt);
  });

  INVESTMENTS.forEach((inv, i) => {
    const opt = document.createElement("option");
    opt.value = inv.id;
    opt.textContent = inv.label;
    if (i === 0) opt.selected = true;
    investmentSelect.appendChild(opt);
  });
}

function initTotalsGrid() {
  totalsGrid.replaceChildren(
    ...HORIZONS.map((years) => {
      const cell = document.createElement("div");
      cell.className = "totals-cell";
      cell.innerHTML = `
        <span class="totals-label">${years} years</span>
        <span class="totals-value" data-horizon="${years}">—</span>`;
      return cell;
    })
  );
}

function updateEmptyStateCopy() {
  const list = HORIZONS.map((y) => `<strong>${y}</strong>`).join(", ");
  emptyStateText.innerHTML = `Projections at ${list} years if you invest instead.`;
}

function updatePriceLabel() {
  priceLabel.textContent = `Price (${displayCurrency})`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function safeHref(url) {
  try {
    const u = new URL(url);
    if (u.protocol === "http:" || u.protocol === "https:") return u.href;
  } catch {
    /* invalid */
  }
  return "#";
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toast.hidden = true;
  }, 5000);
}

async function requireUser() {
  try {
    const { user: u } = await api("/api/auth/me");
    user = u;
    displayCurrency = u.displayCurrency;
    currencySelect.value = displayCurrency;
    usernameEl.textContent = u.username;
    updatePriceLabel();
    return true;
  } catch {
    window.location.href = "/login";
    return false;
  }
}

async function loadItems() {
  const data = await api("/api/items");
  items = data.items;
  render();
}

function renderItemCard(item) {
  const expired = isExpired(item.considerationEndsAt);
  const { investment, priceDisplay, projections } = projectItem(item, displayCurrency);
  const originalLabel = formatMoney(item.price, item.currency);
  const displayLabel = formatMoney(priceDisplay, displayCurrency);
  const showConverted =
    item.currency !== displayCurrency && Math.abs(priceDisplay - item.price) > 0.005;

  const li = document.createElement("li");
  li.className = `item-card${expired ? " item-card--expired" : ""}`;
  li.dataset.id = String(item.id);

  const linkHtml = item.productUrl
    ? `<a class="item-card__link" href="${safeHref(item.productUrl)}" target="_blank" rel="noopener noreferrer">View product</a>`
    : "";

  const cells = projections
    .map(
      (p) => `
      <div class="projection-cell">
        <span class="projection-cell__years">${p.years} yr</span>
        <span class="projection-cell__value">${formatMoney(p.value, displayCurrency)}</span>
        <span class="projection-cell__gain">${formatMoney(p.gain, displayCurrency)}</span>
      </div>`
    )
    .join("");

  const decisionHtml = expired
    ? `
    <div class="item-decision" role="alert">
      <p class="item-decision__title">Consideration period ended</p>
      <p class="item-decision__text">Take a moment: buy it, wait longer, or remove from your wishlist.</p>
      <div class="item-decision__actions">
        <button type="button" class="btn btn--secondary btn-extend">Extend wait</button>
        <button type="button" class="btn btn--primary btn-purchase">Mark purchased</button>
        <button type="button" class="btn btn--ghost btn-delete">Remove</button>
      </div>
    </div>`
    : "";

  li.innerHTML = `
    <div class="item-card__header">
      <h3 class="item-card__title">${escapeHtml(item.name)}</h3>
      <span class="item-card__price">${displayLabel}</span>
    </div>
    <p class="item-card__meta item-card__meta--stored">
      Added at <strong>${originalLabel}</strong>${showConverted ? ` · ≈ ${displayLabel} today` : ""}
    </p>
    <p class="item-card__meta">
      <span class="countdown" data-ends="${item.considerationEndsAt}"></span>
      · <strong>${escapeHtml(investment.label)}</strong>
    </p>
    ${linkHtml}
    <div class="projection-grid">${cells}</div>
    ${decisionHtml}
  `;

  if (expired) {
    li.querySelector(".btn-extend")?.addEventListener("click", () => extendItem(item.id));
    li.querySelector(".btn-purchase")?.addEventListener("click", () => purchaseItem(item.id));
    li.querySelector(".btn-delete")?.addEventListener("click", () => deleteItem(item.id));
  }

  return li;
}

function updateCountdowns() {
  const now = Date.now();
  let newlyExpired = false;

  document.querySelectorAll(".countdown[data-ends]").forEach((el) => {
    const ends = el.dataset.ends;
    const ms = new Date(ends).getTime() - now;
    el.textContent =
      ms > 0
        ? `Consider until: ${formatCountdown(ms)}`
        : "Consideration ended — decide below";
    if (ms <= 0) {
      const card = el.closest(".item-card");
      const id = card?.dataset.id;
      if (id && !promptedExpired.has(id)) {
        promptedExpired.add(id);
        newlyExpired = true;
        card?.classList.add("item-card--expired");
        if (!card.querySelector(".item-decision")) {
          loadItems();
        }
      }
    }
  });

  if (newlyExpired && Notification.permission === "granted") {
    new Notification("Wishlist → Wealth", {
      body: "A consideration period ended. Open your dashboard to decide.",
    });
  }
}

function render() {
  const hasItems = items.length > 0;
  emptyState.hidden = hasItems;
  itemList.hidden = !hasItems;
  totalsCard.hidden = !hasItems;

  if (!hasItems) {
    resultsCount.textContent = "No items yet — add one above.";
    itemList.replaceChildren();
    return;
  }

  const plural = items.length === 1 ? "item" : "items";
  resultsCount.textContent = `${items.length} ${plural} on your wishlist`;

  itemList.replaceChildren(...items.map(renderItemCard));

  const { totalToday, byHorizon } = computeTotals(items, displayCurrency);
  totalsPrice.textContent = `Today: ${formatMoney(totalToday, displayCurrency)}`;
  HORIZONS.forEach((years) => {
    const el = totalsGrid.querySelector(`[data-horizon="${years}"]`);
    if (el) el.textContent = formatMoney(byHorizon[years], displayCurrency);
  });

  updateCountdowns();
}

async function setDisplayCurrency(code) {
  const { user: u } = await api("/api/auth/preferences", {
    method: "PATCH",
    body: { displayCurrency: code },
  });
  user = u;
  displayCurrency = u.displayCurrency;
  updatePriceLabel();
  render();
}

async function extendItem(id) {
  await api(`/api/items/${id}/extend`, { method: "POST" });
  promptedExpired.delete(String(id));
  showToast("Consideration period extended.");
  await loadItems();
}

async function purchaseItem(id) {
  await api(`/api/items/${id}/purchase`, { method: "POST" });
  promptedExpired.delete(String(id));
  showToast("Marked as purchased.");
  await loadItems();
}

async function deleteItem(id) {
  await api(`/api/items/${id}`, { method: "DELETE" });
  promptedExpired.delete(String(id));
  await loadItems();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("item-name").value.trim();
  const price = parseFloat(document.getElementById("item-price").value);
  const productUrl = document.getElementById("item-link").value.trim();
  const cooldownValue = parseInt(document.getElementById("cooldown-value").value, 10);
  const cooldownUnit = document.getElementById("cooldown-unit").value;
  const investmentId = investmentSelect.value;

  if (!name || !Number.isFinite(price) || price <= 0) return;
  if (!Number.isFinite(cooldownValue) || cooldownValue < 1) return;

  try {
    await api("/api/items", {
      method: "POST",
      body: {
        name,
        price,
        currency: displayCurrency,
        productUrl: productUrl || null,
        cooldownValue,
        cooldownUnit,
        investmentId,
      },
    });
    document.getElementById("item-name").value = "";
    document.getElementById("item-price").value = "";
    document.getElementById("item-link").value = "";
    document.getElementById("item-name").focus();
    await loadItems();
  } catch (err) {
    showToast(err.message);
  }
});

currencySelect.addEventListener("change", () => {
  setDisplayCurrency(currencySelect.value).catch((err) => showToast(err.message));
});

logoutBtn.addEventListener("click", async () => {
  await api("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
});

async function init() {
  initHorizonCount();
  initSelects();
  initTotalsGrid();
  updateEmptyStateCopy();

  if (!(await requireUser())) return;

  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }

  await loadItems();
  tickTimer = setInterval(() => {
    updateCountdowns();
  }, 1000);
}

init();
