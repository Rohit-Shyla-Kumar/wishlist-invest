/**
 * Wishlist → Wealth
 * Future value: price × (1 + annualRate)^years
 * Prices stored in SGD; displayed in selected currency via static FX rates.
 */

const HORIZONS = [5, 10, 25, 50];

const INVESTMENTS = [
  { id: "tslaspcx", label: "Tesla + SpaceXai (~25% / yr)", rate: 0.25 },
  { id: "sp500", label: "S&P 500 index (~12% / yr)", rate: 0.12 },
  { id: "growth-etf", label: "Growth / tech ETF (~15% / yr)", rate: 0.15 },
  { id: "reit", label: "Real estate REIT (~10% / yr)", rate: 0.10 },
  { id: "dividend stocks", label: "High-yield dividends portfolio (~8% / yr)", rate: 0.08 },
  { id: "conservative", label: "Balanced 60/40 portfolio (~7% / yr)", rate: 0.07 },
  { id: "gold", label: "Gold (~7% / yr)", rate: 0.07 },
  { id: "bonds", label: "US aggregate bonds (~4% / yr)", rate: 0.04 },
];

/** Static illustrative FX: units of SGD per 1 unit of currency */
const CURRENCIES = {
  SGD: { code: "SGD", label: "Singapore dollar (SGD)", locale: "en-SG", toSgd: 1 },
  USD: { code: "USD", label: "US dollar (USD)", locale: "en-US", toSgd: 1.35 },
  HKD: { code: "HKD", label: "Hong Kong dollar (HKD)", locale: "en-HK", toSgd: 0.173 },
};

const DEFAULT_CURRENCY = "SGD";

/** @type {{ id: string, name: string, priceSgd: number, cooldownValue: number, cooldownUnit: string, investmentId: string }[]} */
let items = [];
let displayCurrency = DEFAULT_CURRENCY;

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

function initHorizonCount() {
  document.documentElement.style.setProperty("--horizon-count", String(HORIZONS.length));
}

function initCurrencyOptions() {
  Object.values(CURRENCIES).forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.code;
    opt.textContent = c.label;
    opt.selected = c.code === DEFAULT_CURRENCY;
    currencySelect.appendChild(opt);
  });
}

function initInvestmentOptions() {
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
  emptyStateText.innerHTML = `Items you add will show projected value at ${list} years.`;
}

function updatePriceLabel() {
  const sym = getCurrency(displayCurrency).code;
  priceLabel.textContent = `Price (${sym})`;
}

function getCurrency(code) {
  return CURRENCIES[code] ?? CURRENCIES[DEFAULT_CURRENCY];
}

function getInvestment(id) {
  return INVESTMENTS.find((i) => i.id === id) ?? INVESTMENTS[0];
}

function toSgd(amount, fromCode) {
  return amount * getCurrency(fromCode).toSgd;
}

function fromSgd(amountSgd, toCode) {
  return amountSgd / getCurrency(toCode).toSgd;
}

/**
 * @param {number} principal in display currency
 * @param {number} annualRate decimal e.g. 0.10
 * @param {number} years
 */
function futureValue(principal, annualRate, years) {
  return principal * Math.pow(1 + annualRate, years);
}

function formatMoney(amountInDisplayCurrency) {
  const c = getCurrency(displayCurrency);
  return new Intl.NumberFormat(c.locale, {
    style: "currency",
    currency: c.code,
    maximumFractionDigits: amountInDisplayCurrency >= 1000 ? 0 : 2,
  }).format(amountInDisplayCurrency);
}

function formatCooldown(value, unit) {
  const label = value === 1 ? unit.replace(/s$/, "") : unit;
  return `Wait ${value} ${label} before buying`;
}

function nextId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function addItem(data) {
  items.push({
    id: nextId(),
    name: data.name,
    priceSgd: data.priceSgd,
    cooldownValue: data.cooldownValue,
    cooldownUnit: data.cooldownUnit,
    investmentId: data.investmentId,
  });
  render();
}

function removeItem(id) {
  items = items.filter((i) => i.id !== id);
  render();
}

function itemPriceDisplay(item) {
  return fromSgd(item.priceSgd, displayCurrency);
}

function projectItem(item) {
  const inv = getInvestment(item.investmentId);
  const price = itemPriceDisplay(item);
  const projections = HORIZONS.map((years) => {
    const fv = futureValue(price, inv.rate, years);
    return { years, value: fv, gain: fv - price };
  });
  return { investment: inv, projections };
}

function renderItemCard(item) {
  const { investment, projections } = projectItem(item);
  const li = document.createElement("li");
  li.className = "item-card";
  li.dataset.id = item.id;

  const cells = projections
    .map(
      (p) => `
      <div class="projection-cell">
        <span class="projection-cell__years">${p.years} yr</span>
        <span class="projection-cell__value">${formatMoney(p.value)}</span>
        <span class="projection-cell__gain">${formatMoney(p.gain)}</span>
      </div>`
    )
    .join("");

  li.innerHTML = `
    <div class="item-card__header">
      <h3 class="item-card__title">${escapeHtml(item.name)}</h3>
      <span class="item-card__price">${formatMoney(itemPriceDisplay(item))}</span>
    </div>
    <p class="item-card__meta">
      ${escapeHtml(formatCooldown(item.cooldownValue, item.cooldownUnit))}
      · <strong>${escapeHtml(investment.label)}</strong>
    </p>
    <div class="projection-grid">${cells}</div>
    <button type="button" class="btn btn--ghost item-remove" aria-label="Remove ${escapeHtml(item.name)}">Remove</button>
  `;

  li.querySelector(".item-remove").addEventListener("click", () => removeItem(item.id));
  return li;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function computeTotals() {
  let totalPriceSgd = 0;
  const byHorizonSgd = Object.fromEntries(HORIZONS.map((y) => [y, 0]));

  items.forEach((item) => {
    totalPriceSgd += item.priceSgd;
    const inv = getInvestment(item.investmentId);
    const priceDisplay = itemPriceDisplay(item);
    HORIZONS.forEach((years) => {
      const fvDisplay = futureValue(priceDisplay, inv.rate, years);
      byHorizonSgd[years] += toSgd(fvDisplay, displayCurrency);
    });
  });

  const totalPrice = fromSgd(totalPriceSgd, displayCurrency);
  const byHorizon = Object.fromEntries(
    HORIZONS.map((y) => [y, fromSgd(byHorizonSgd[y], displayCurrency)])
  );

  return { totalPrice, byHorizon };
}

function renderTotals(byHorizon, totalPrice) {
  totalsPrice.textContent = `Today: ${formatMoney(totalPrice)}`;
  HORIZONS.forEach((years) => {
    const el = totalsGrid.querySelector(`[data-horizon="${years}"]`);
    if (el) el.textContent = formatMoney(byHorizon[years]);
  });
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

  const { totalPrice, byHorizon } = computeTotals();
  renderTotals(byHorizon, totalPrice);
}

function setDisplayCurrency(code) {
  if (!CURRENCIES[code]) return;
  displayCurrency = code;
  updatePriceLabel();
  render();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = document.getElementById("item-name").value.trim();
  const price = parseFloat(document.getElementById("item-price").value);
  const cooldownValue = parseInt(document.getElementById("cooldown-value").value, 10);
  const cooldownUnit = document.getElementById("cooldown-unit").value;
  const investmentId = investmentSelect.value;

  if (!name || !Number.isFinite(price) || price <= 0) return;
  if (!Number.isFinite(cooldownValue) || cooldownValue < 1) return;

  addItem({
    name,
    priceSgd: toSgd(price, displayCurrency),
    cooldownValue,
    cooldownUnit,
    investmentId,
  });

  document.getElementById("item-name").value = "";
  document.getElementById("item-price").value = "";
  document.getElementById("item-name").focus();
});

currencySelect.addEventListener("change", () => {
  setDisplayCurrency(currencySelect.value);
});

initHorizonCount();
initCurrencyOptions();
initInvestmentOptions();
initTotalsGrid();
updateEmptyStateCopy();
updatePriceLabel();
render();
