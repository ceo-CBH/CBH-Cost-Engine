// CBH Corrugation Cost Calculator
// Confirmed formula: ((sheet_size * GSM) / 15500) * rate / 100

export interface CorrugatedMaterialParams {
  sheetAreaSqIn: number;
  sheets: number;
  sides?: number;
  gsm?: number;
  ratePerKg?: number;
}

export function calculateCorrugatedMaterial(params: CorrugatedMaterialParams): number {
  const {
    sheetAreaSqIn,
    sheets,
    sides = 1,
    gsm = 250,
    ratePerKg = 300,
  } = params;

  return sheetAreaSqIn * gsm / 15500 * ratePerKg / 100 * sheets * sides;
}

export function calculateCorrugatedWeightKg(params: Omit<CorrugatedMaterialParams, 'ratePerKg'>): number {
  const {
    sheetAreaSqIn,
    sheets,
    sides = 1,
    gsm = 250,
  } = params;

  return sheetAreaSqIn * gsm / 15500 / 100 * sheets * sides;
}
