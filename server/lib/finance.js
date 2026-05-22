/** Shared finance constants and pure calculation helpers */

export const HORIZONS = [5, 10, 25, 50];

export const INVESTMENTS = [
  { id: "tsla + spcx", label: "Tesla Inc (~35% / yr)", rate: 0.35 },
  { id: "sp500", label: "S&P 500 index (~12% / yr)", rate: 0.12 },
  { id: "growth-etf", label: "Growth / tech ETF (~15% / yr)", rate: 0.15 },
  { id: "reit", label: "Real estate REIT (~10% / yr)", rate: 0.1 },
  { id: "dividend stocks", label: "High-yield dividends portfolio (~8% / yr)", rate: 0.08 },
  { id: "conservative", label: "Balanced 60/40 portfolio (~7% / yr)", rate: 0.07 },
  { id: "gold", label: "Gold (~7% / yr)", rate: 0.07 },
  { id: "bonds", label: "US aggregate bonds (~4% / yr)", rate: 0.04 },
];

/** Illustrative static FX: SGD per 1 unit of currency */
export const CURRENCIES = {
  SGD: { code: "SGD", label: "Singapore dollar (SGD)", locale: "en-SG", toSgd: 1 },
  USD: { code: "USD", label: "US dollar (USD)", locale: "en-US", toSgd: 1.35 },
  GBP: { code: "GBP", label: "British pound (GBP)", locale: "en-GB", toSgd: 1.72 },
  HKD: { code: "HKD", label: "Hong Kong dollar (HKD)", locale: "en-HK", toSgd: 0.173 },
};

export const DEFAULT_CURRENCY = "SGD";
export const VALID_CURRENCIES = Object.keys(CURRENCIES);
export const VALID_COOLDOWN_UNITS = ["days", "weeks", "months"];

export function getCurrency(code) {
  return CURRENCIES[code] ?? CURRENCIES[DEFAULT_CURRENCY];
}

export function getInvestment(id) {
  return INVESTMENTS.find((i) => i.id === id) ?? INVESTMENTS[0];
}

export function toSgd(amount, fromCode) {
  return amount * getCurrency(fromCode).toSgd;
}

export function fromSgd(amountSgd, toCode) {
  return amountSgd / getCurrency(toCode).toSgd;
}

/** Convert between any two stored/display currencies */
export function convertAmount(amount, fromCode, toCode) {
  if (fromCode === toCode) return amount;
  return fromSgd(toSgd(amount, fromCode), toCode);
}

export function futureValue(principal, annualRate, years) {
  return principal * Math.pow(1 + annualRate, years);
}

export function formatMoney(amount, currencyCode) {
  const c = getCurrency(currencyCode);
  return new Intl.NumberFormat(c.locale, {
    style: "currency",
    currency: c.code,
    maximumFractionDigits: amount >= 1000 ? 0 : 2,
  }).format(amount);
}

export function cooldownToMs(value, unit) {
  const n = Number(value);
  const day = 24 * 60 * 60 * 1000;
  if (unit === "days") return n * day;
  if (unit === "weeks") return n * 7 * day;
  if (unit === "months") return n * 30 * day;
  return n * day;
}

export function computeConsiderationEndsAt(value, unit, fromDate = new Date()) {
  return new Date(fromDate.getTime() + cooldownToMs(value, unit)).toISOString();
}

export function projectItem(item, displayCurrency) {
  const inv = getInvestment(item.investment_id);
  const priceDisplay = convertAmount(item.price, item.currency, displayCurrency);
  const projections = HORIZONS.map((years) => {
    const fv = futureValue(priceDisplay, inv.rate, years);
    return { years, value: fv, gain: fv - priceDisplay };
  });
  return { investment: inv, priceDisplay, projections };
}

export function computeTotals(items, displayCurrency) {
  let totalToday = 0;
  const byHorizon = Object.fromEntries(HORIZONS.map((y) => [y, 0]));

  for (const item of items) {
    const inv = getInvestment(item.investment_id);
    const priceDisplay = convertAmount(item.price, item.currency, displayCurrency);
    totalToday += priceDisplay;
    for (const years of HORIZONS) {
      byHorizon[years] += futureValue(priceDisplay, inv.rate, years);
    }
  }

  return { totalToday, byHorizon };
}
