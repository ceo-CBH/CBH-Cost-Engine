// CBH UV Coating Cost Calculator
// Formula: UV Cost = (flat_size_sqin / 144) × Rs6 per sq ft
// flat_size_sqin = fL × fW of blank

export interface UVCoatingParams {
  flatSizeSqIn: number;
  enabled: boolean;
}

export function calculateUVCoating(params: UVCoatingParams): number {
  if (!params.enabled) return 0;
  return Math.round((params.flatSizeSqIn / 144) * 6);
}
