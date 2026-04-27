// CBH Foiling Cost Calculator
// Two separate cost lines per Jacob estimation sheet:
//   Block Cost  = flat_size_sqin × Rs90
//   Foiling Cost = flat_size_sqin × Rs120
// Total Foiling = Block + Foiling

export interface FoilingParams {
  flatSizeSqIn: number;   // flat blank area in square inches (fL × fW)
  enabled: boolean;
}

export interface FoilingResult {
  blockCostPKR: number;
  foilingCostPKR: number;
  totalPKR: number;
}

export function calculateFoiling(params: FoilingParams): FoilingResult {
  if (!params.enabled) {
    return { blockCostPKR: 0, foilingCostPKR: 0, totalPKR: 0 };
  }
  const blockCostPKR   = Math.round(params.flatSizeSqIn * 90);
  const foilingCostPKR = Math.round(params.flatSizeSqIn * 120);
  return {
    blockCostPKR,
    foilingCostPKR,
    totalPKR: blockCostPKR + foilingCostPKR,
  };
}
