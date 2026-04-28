// CBH Greyboard Cost Calculator
// Formula confirmed by Mark — Rs300/kg rate (Apr 2026)
// gsm_board derived from thickness_mm

export interface GreyboardParams {
  lengthIn?: number;      // box L inches, fallback only
  widthIn?: number;       // box W inches, fallback only
  heightIn?: number;      // box H inches, fallback only
  openSizeSqIn?: number;  // preferred: actual open/flat area for one box
  gsm?: number;           // optional explicit board GSM
  thicknessMm: number;    // board thickness e.g. 2mm, 3mm
  quantity: number;
}

export function calculateGreyboard(params: GreyboardParams): number {
  const { lengthIn = 0, widthIn = 0, heightIn = 0, thicknessMm, quantity } = params;

  // GSM derived from thickness (density = 1.3 g/cm³)
  const gsmBoard = params.gsm ?? 1.3 * (thicknessMm / 10) * 10000;

  // Preferred formula uses actual open/flat area. Finish-size surface area
  // remains only as a backward-compatible fallback for older callers.
  const oneBoxAreaSqIn = params.openSizeSqIn ??
    (2 * lengthIn * widthIn +
      2 * lengthIn * heightIn +
      2 * widthIn * heightIn);
  const boardAreaSqIn = oneBoxAreaSqIn * quantity;

  // Convert sq inches → sq cm → sq meters, then to kg, then × rate
  // Formula: area_sqin × 6.4516(cm²/in²) × gsm / 10000(cm²/m²) / 1000(g/kg) × 300(PKR/kg)
  const costPKR = boardAreaSqIn * 6.4516 * gsmBoard / 10000 / 1000 * 300;

  return Math.round(costPKR);
}
