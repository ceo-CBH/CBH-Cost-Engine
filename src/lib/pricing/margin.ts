// CBH Two-Layer Markup System
//
// Layer 1 — Vendor Cost (PKR)      ← engine calculates
// Layer 2 — Vendor Profit %        ← salesperson sets (default 30%)
// Layer 3 — Shipping PKR           ← added after vendor profit
// Layer 4 — PKR ÷ exchangeRate     = Selling Price (USD) on Customer Quote
//
// Customer PDF shows USD only.
// Internal PDF shows full PKR breakdown.

const DEFAULT_SALES_MARGIN_PCT = 30;
const DEFAULT_PKR_USD_RATE = 280; // admin editable in Supabase rates table

export interface MarginResult {
  vendorCostPKR: number;
  salesMarginPct: number;
  sellingPricePKR: number;
  sellingPriceUSD: number;
  vendorTotalPKR: number;
  shippingPKR: number;
  marginAmountPKR: number;
  effectiveMarginPct: number; // confirmation back to user
}

export function calculateSellingPrice(
  vendorCostPKR: number,
  salesMarginPct: number = DEFAULT_SALES_MARGIN_PCT,
  pkrUsdRate: number = DEFAULT_PKR_USD_RATE,
  shippingPKR: number = 0,
): MarginResult {
  const marginAmountPKR = vendorCostPKR * (salesMarginPct / 100);
  const vendorTotalPKR = vendorCostPKR + marginAmountPKR;
  const sellingPricePKR = vendorTotalPKR + shippingPKR;
  const sellingPriceUSD = sellingPricePKR / pkrUsdRate;
  const effectiveMarginPct = sellingPricePKR > 0 ? (marginAmountPKR / sellingPricePKR) * 100 : 0;

  return {
    vendorCostPKR: Math.round(vendorCostPKR),
    salesMarginPct,
    sellingPricePKR: Math.round(sellingPricePKR),
    sellingPriceUSD: Math.round(sellingPriceUSD * 100) / 100, // 2 decimal places
    vendorTotalPKR: Math.round(vendorTotalPKR),
    shippingPKR: Math.round(shippingPKR),
    marginAmountPKR: Math.round(marginAmountPKR),
    effectiveMarginPct: Math.round(effectiveMarginPct * 10) / 10,
  };
}

// Per-tier helper for 6-tier quote grid
export function calculateAllTiers(
  tierCostsPKR: number[],
  salesMarginPct: number = DEFAULT_SALES_MARGIN_PCT,
  pkrUsdRate: number = DEFAULT_PKR_USD_RATE,
): MarginResult[] {
  return tierCostsPKR.map(cost =>
    calculateSellingPrice(cost, salesMarginPct, pkrUsdRate)
  );
}
