// CBH Pasting & Making Cost Calculator

export type PastingType = 'none' | 'machine' | 'manual' | 'corrugation';

export interface PastingParams {
  type: PastingType;
  sheets?: number;            // for manual pasting (rounds up to next 1,000)
  quantity?: number;          // for machine pasting (per unit)
  openSizeSqIn?: number;      // for corrugation pasting
}

// Manual Pasting: Rs1,000 per 1,000 sheets, round UP to next 1,000
// Machine Pasting: Rs0.7 per unit (from rates table — unchanged)
// Corrugation Pasting: open_size_sqin × Rs5
export function calculatePasting(params: PastingParams): number {
  const { type, sheets = 0, quantity = 0, openSizeSqIn = 0 } = params;

  switch (type) {
    case 'manual': {
      const billableThousands = Math.ceil(sheets / 1000);
      return billableThousands * 1000;
    }
    case 'machine': {
      return Math.round(quantity * 0.7);
    }
    case 'corrugation': {
      return Math.round(openSizeSqIn * 5);
    }
    default:
      return 0;
  }
}

// Rigid Box Making: Rs250 per box — mandatory for all rigid styles
// Covers wrapping labour + greyboard assembly
export function calculateRigidBoxMaking(quantity: number): number {
  return quantity * 250;
}
