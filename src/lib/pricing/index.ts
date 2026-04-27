// CBH Pricing Module — Central Export
// All confirmed formulas verified against 40+ real jobs + Mark's Apr 2026 confirmations

export { calculateGreyboard } from './greyboard';
export type { GreyboardParams } from './greyboard';

export { calculateFoiling } from './foiling';
export type { FoilingParams, FoilingResult } from './foiling';

export { calculateUVCoating } from './uv';
export type { UVCoatingParams } from './uv';

export { calculateDieMaking, calculateDieCutting } from './die';
export type { DieMakingParams, DieCuttingParams } from './die';

export { calculatePasting, calculateRigidBoxMaking } from './pasting';
export type { PastingType, PastingParams } from './pasting';

export { calculateTwoPieceFlatSizes } from './two-piece';
export type { TwoPieceFlatSizes } from './two-piece';

export { calculateSellingPrice, calculateAllTiers } from './margin';
export type { MarginResult } from './margin';
