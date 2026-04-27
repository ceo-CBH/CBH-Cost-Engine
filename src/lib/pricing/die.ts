// CBH Die Cost Calculator

export interface DieMakingParams {
  openSizeSqIn: number;   // open/flat size area in sq inches
  dieOption: 'none' | 'new' | 'existing';
}

export interface DieCuttingParams {
  sheets: number;         // effective sheets (eff_sheets)
  ratePerThousand?: number; // default 700 (midpoint of 600–800 range)
}

// Die Making
// Formula: open_size × 8, minimum Rs2,500
export function calculateDieMaking(params: DieMakingParams): number {
  if (params.dieOption === 'none' || params.dieOption === 'existing') return 0;
  const cost = params.openSizeSqIn * 8;
  return Math.round(Math.max(cost, 2500));
}

// Die Cutting
// Rate: 600–800 PKR per 1,000 sheets (default 700)
// Minimum charge = 1,000 sheets even if actual sheets < 1,000
export function calculateDieCutting(params: DieCuttingParams): number {
  const { sheets, ratePerThousand = 700 } = params;
  const billableThousands = Math.max(Math.ceil(sheets / 1000), 1);
  return Math.round(billableThousands * ratePerThousand);
}
