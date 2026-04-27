// CBH Two-Piece Rigid Box Flat Size Calculator
// IMPORTANT: A 2-piece box has TWO flat sizes — Lid AND Tray — both calculated separately
// This was a confirmed gap in the previous engine.
// Lid is slightly larger than tray by clearance offset (0.157" on L and W)

export interface TwoPieceFlatSizes {
  tray: { fL: number; fW: number; areaSqIn: number };
  lid:  { fL: number; fW: number; areaSqIn: number };
  totalAreaSqIn: number; // tray + lid combined (used for stock/lam calc)
}

// Handover formula for 2-piece lid+base:
//   fL = L + 2H + 0.5
//   fW = W + 2H + 0.5
// Lid gets clearance offset of +0.157" on both L and W (verified from die line)
const LID_CLEARANCE = 0.157;

export function calculateTwoPieceFlatSizes(
  L: number,  // inner box length (inches)
  W: number,  // inner box width (inches)
  H: number,  // inner box height (inches)
): TwoPieceFlatSizes {
  // Tray
  const trayFl = L + 2 * H + 0.5;
  const trayFw = W + 2 * H + 0.5;

  // Lid (slightly larger)
  const lidL = L + LID_CLEARANCE;
  const lidW = W + LID_CLEARANCE;
  const lidFl = lidL + 2 * H + 0.5;
  const lidFw = lidW + 2 * H + 0.5;

  const trayArea = trayFl * trayFw;
  const lidArea  = lidFl * lidFw;

  return {
    tray: { fL: trayFl, fW: trayFw, areaSqIn: trayArea },
    lid:  { fL: lidFl,  fW: lidFw,  areaSqIn: lidArea  },
    totalAreaSqIn: trayArea + lidArea,
  };
}
