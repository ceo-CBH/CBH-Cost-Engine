// CBH Greyboard Cost Calculator
// Formula confirmed by Mark — Rs300/kg rate (Apr 2026)
// gsm_board derived from thickness_mm

export interface GreyboardParams {
  lengthIn: number;       // box L inches
  widthIn: number;        // box W inches
  heightIn: number;       // box H inches
  thicknessMm: number;    // board thickness e.g. 2mm, 3mm
  quantity: number;
}

export function calculateGreyboard(params: GreyboardParams): number {
  const { lengthIn, widthIn, heightIn, thicknessMm, quantity } = params;

  // GSM derived from thickness (density = 1.3 g/cm³)
  const gsmBoard = 1.3 * (thicknessMm / 10) * 10000;

  // Total board area in sq inches (all 6 faces × qty)
  const boardAreaSqIn =
    (2 * lengthIn * widthIn +
     2 * lengthIn * heightIn +
     2 * widthIn * heightIn) * quantity;

  // Convert sq inches → sq cm → sq meters, then to kg, then × rate
  // Formula: area_sqin × 6.4516(cm²/in²) × gsm / 10000(cm²/m²) / 1000(g/kg) × 300(PKR/kg)
  const costPKR = boardAreaSqIn * 6.4516 * gsmBoard / 10000 / 1000 * 300;

  return Math.round(costPKR);
}
