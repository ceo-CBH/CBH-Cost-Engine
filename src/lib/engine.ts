// ═══════════════════════════════════════════════════════════════════
// CBH PRICING ENGINE v6 — All formulas verified against 40+ real jobs
// ═══════════════════════════════════════════════════════════════════

export type BoxStyle =
  | 'tuck' | 'mailer' | 'sleeve' | '2pc' | '4corner'
  | 'rigid-mag' | 'rigid-book'
  | 'corr-rsc' | 'corr-mail'

export type LamType = 'none' | 'gloss' | 'matte' | 'soft'
export type PrintSpec = 'none' | '4c' | '2c' | 'pms' | 'gnd'
export type PrintSides = 'outside' | 'both'
export type FlutType = 'E' | 'B' | 'C'
export type DieOption = 'none' | 'new' | 'existing'
export type PasteOption = 'none' | 'auto' | 'hand'
export type StockKey = 'bleach' | 'art' | 'alb' | 'krf'
export type WrapType = 'std' | 'mor' | 'art'

// Standard cut sheet sizes — from Sheet Sizes & Machines.txt
export const ALL_SHEETS: [number, number, string][] = [
  [6.5,7.5,'20×30'], [7.5,10,'20×30'], [10,10,'20×30'],
  [10,15,'20×30'], [10,20,'20×30'], [15,20,'20×30'],
  [7.6,9,'23×36'], [7.6,12,'23×36'], [9,11.5,'23×36'],
  [11.5,12,'23×36'], [11.5,18,'23×36'], [12,23,'23×36'], [18,23,'23×36'],
  [8.3,9,'25×36'], [8.3,12,'25×36'], [9,12.5,'25×36'],
  [12,12.5,'25×36'], [12,25,'25×36'], [12.5,18,'25×36'], [18,25,'25×36'],
  [7,11,'22×28'], [9.3,11,'22×28'], [11,14,'22×28'], [14,22,'22×28'],
  [7.5,12.5,'25×30'], [8.3,10,'25×30'], [12.5,15,'25×30'],
  [12.5,30,'25×30'], [15,25,'25×30'],
  [8.5,13.5,'27×34'], [13.5,17,'27×34'], [17,27,'27×34'],
  [30,40,'30×40'],
]

export const MACHINES = [
  { id: 'm52', name: 'Heidelburg 52', pL: 14.5, pW: 20 },
  { id: 'sol', name: 'Solna',         pL: 18,   pW: 25 },
  { id: 'm74', name: 'Heidelburg 74', pL: 19,   pW: 29 },
  { id: 'spm', name: 'Speed Master',  pL: 28,   pW: 39.5 },
]

export const MACHINE_RATES: Record<string, { c4:number,c2:number,pms:number,gnd:number,plate:number }> = {
  m52: { c4:3000, c2:2000, pms:1250, gnd:3000, plate:400  },
  sol: { c4:4800, c2:3200, pms:2000, gnd:4000, plate:800  },
  m74: { c4:5000, c2:3500, pms:2500, gnd:4500, plate:1000 },
  spm: { c4:6000, c2:4500, pms:8000, gnd:8000, plate:2000 },
}

// DHL box specs — confirmed from Mark
export const DHL_BOXES = [
  { n: 6, L: 41.7, W: 35.9, H: 36.9, maxKg: 12 },
  { n: 7, L: 48.1, W: 40.4, H: 38.9, maxKg: 17 },
  { n: 8, L: 54.1, W: 44.4, H: 40.9, maxKg: 22 },
]

// Board GSM equivalents for weight calculation (verified from actual weights)
export const CORR_WEIGHT_GSM: Record<FlutType, number> = {
  E: 3471, // verified Diana: ±0.0%
  B: 907,  // verified Mark: ±0.0%
  C: 1300, // estimated
}

// ── FLAT SIZE FORMULAS (verified against est sheets) ─────────────────
export function flatSize(style: BoxStyle, L: number, W: number, H: number) {
  switch (style) {
    case 'tuck':      return { fL: 2*L+0.55,         fW: 2*H+W+1.825 }
    case 'mailer':    return { fL: L+2*H+0.177,       fW: 2*(L+W)+0.725 }
    case 'sleeve':    return { fL: W+2*H+0.75,        fW: L+0.25 }
    case '2pc':       { const Hl=Math.max(H*.15,.375); return { fL: Math.max(L+2*H+.5,L+2*Hl+1), fW: Math.max(W+2*H+.5,W+2*Hl+1) } }
    case '4corner':   return { fL: L+2*H+0.125,       fW: 2*(W+H)+2.125 }
    case 'rigid-mag': return { fL: L+2*H+0.75,        fW: W+H+0.5 }
    case 'rigid-book':return { fL: L+2*H+0.5,         fW: W+H+0.375 }
    case 'corr-rsc':  return { fL: 2*(L+W)+1.5,       fW: H+L/2+0.5 }
    case 'corr-mail': return { fL: 2*L+H-1,           fW: 2*W+H+3 }
    default:          return { fL: 0, fW: 0 }
  }
}

export function bestSheet(oL: number, oW: number): [number, number, string] {
  const fits = ALL_SHEETS.filter(([sL,sW]) =>
    (oL<=sL && oW<=sW) || (oW<=sL && oL<=sW)
  )
  if (!fits.length) return [30,40,'30×40']
  fits.sort((a,b)=>a[0]*a[1]-b[0]*b[1])
  return fits[0]
}

export function autoMachine(fL: number, fW: number) {
  const sorted = [...MACHINES].sort((a,b)=>a.pL*a.pW-b.pL*b.pW)
  for (const m of sorted) {
    if ((fL<=m.pL&&fW<=m.pW)||(fW<=m.pL&&fL<=m.pW)) return m
  }
  return MACHINES[3]
}

// ── QTY MULTIPLIER (derived from 44-job Shipping Ledger) ─────────────
export function qtyMultiplier(qty: number, mat: 'pb'|'wrap'|'corr'): number {
  if (mat === 'corr') return 1.0
  if (mat === 'wrap') {
    if (qty < 50)   return 8.0
    if (qty < 100)  return 5.0
    if (qty < 200)  return 3.5
    if (qty < 500)  return 2.2
    if (qty < 1000) return 1.5
    return 1.1
  }
  // paperboard
  if (qty < 100)  return 3.5
  if (qty < 300)  return 2.2
  if (qty < 600)  return 1.35
  if (qty < 1500) return 1.15
  if (qty < 3000) return 1.08
  return 1.0
}

// ── WEIGHT FORMULAS (verified against all historical data) ───────────
export function calcWeight(
  style: BoxStyle, fL: number, fW: number,
  gsm: number, qty: number, flute: FlutType = 'B',
  gbThick: number = 2, sides: PrintSides = 'outside'
): number {
  const isC = style.startsWith('corr')
  const isR = style.startsWith('rigid')
  if (isC) {
    // Use board GSM equivalent (full board weight incl. liner+medium+liner)
    const boardGsm = CORR_WEIGHT_GSM[flute]
    const area = fL * fW
    return area * boardGsm / 15500 / 100 * qty
  }
  if (isR) {
    // Wrap paper weight
    const wrapKg = fL * fW * 150 / 15500 / 100 * qty
    // Greyboard weight: surface area × density
    // Surface area approximated from flat size
    const boardGsm = 1.3 * (gbThick / 10) * 10000
    const boardKg = fL * fW * boardGsm / 15500 / 100 * qty * 0.6
    return wrapKg + boardKg
  }
  // Paperboard: open_L × open_W × GSM / 15500 / 100 × qty
  return fL * fW * gsm / 15500 / 100 * qty
}

// ── MAIN CALCULATION ─────────────────────────────────────────────────
export interface CalcInput {
  L: number; W: number; H: number // finish size in inches
  style: BoxStyle
  qty: number
  gsm: number
  stockKey: StockKey
  wrapType?: WrapType
  gbThick?: number
  flute?: FlutType
  pSpec: PrintSpec
  lam: LamType
  sides: PrintSides
  die: DieOption
  paste: PasteOption
  scan: number
  foilSqIn: number
  foamOn: boolean
  fL_ins?: number; fW_ins?: number
  ribQty: number; magQty: number
  rush: number
  prof: number
  courier: string; zone: string
  bpc: number; cWt: number
  rates: Record<string, number>
}

export interface CalcTier {
  qty: number
  bk: Record<string,number>
  totalCost: number
  profit: number
  finalPKR: number
  finalUSD: number
  unitUSD: number
  margin: number
  matKg: number
  shipKg: number
  cartons: number
  volWt: number
  chargeWt: number
  dhlBox: typeof DHL_BOXES[0] | null
  effSheets: number
  mult: number
  flat: { fL: number; fW: number }
  machine: typeof MACHINES[0]
  sheet: [number, number, string]
  ups: number
}

export function calcTier(input: CalcInput): CalcTier {
  const { L, W, H, style, qty, gsm, pSpec, lam, sides, die, paste,
          scan, foilSqIn, foamOn, ribQty, magQty, rush, prof,
          courier, zone, bpc, cWt, rates } = input
  const stockKey = input.stockKey || 'bleach'
  const wrapType = input.wrapType || 'std'
  const gbThick  = input.gbThick  || 2
  const flute    = input.flute    || 'B'
  const isR = style.startsWith('rigid')
  const isC = style.startsWith('corr')

  const flat    = flatSize(style, L, W, H)
  const machine = autoMachine(flat.fL, flat.fW)
  const sheet   = bestSheet(flat.fL, flat.fW)
  const [sL, sW] = sheet
  const mr      = MACHINE_RATES[machine.id]
  const ups     = Math.max(
    Math.floor(sL/flat.fL)*Math.floor(sW/flat.fW),
    Math.floor(sL/flat.fW)*Math.floor(sW/flat.fL), 1
  )
  const matType = isC ? 'corr' : isR ? 'wrap' : 'pb'
  const mult    = qtyMultiplier(qty, matType)
  const eff     = Math.ceil(Math.ceil(qty/ups)*mult)
  const bk: Record<string,number> = {}
  let matKg = 0

  // ── Material cost ──────────────────────────────────────────────
  if (isC) {
    const linerCost = flat.fL * flat.fW * rates.corr_liner * qty * (sides==='both' ? 2 : 1)
    const boardRate = flute==='E' ? rates.corr_board_e : flute==='B' ? rates.corr_board_b : rates.corr_board_c
    const boardCost = flat.fL * flat.fW * boardRate * qty
    bk['Corrugated liner'] = linerCost
    bk['Corrugated board'] = boardCost
    matKg = calcWeight(style, flat.fL, flat.fW, gsm, qty, flute)
  } else if (isR) {
    if (wrapType === 'mor') {
      const sqmPerBox = (flat.fL * flat.fW * 6.4516) / 10000
      bk['Morocco / Synthetic'] = sqmPerBox * (rates.mor / 1.38) * qty
      matKg = flat.fL * flat.fW * 120 / 15500 / 100 * qty
    } else {
      const wr   = wrapType==='art' ? rates.art : rates.wrap
      const wGsm = wrapType==='art' ? 128 : 150
      bk['Wrap paper'] = sL * sW * wGsm * wr / 15500 / 100 * eff
      matKg = flat.fL * flat.fW * wGsm / 15500 / 100 * qty
    }
    // Greyboard
    const gbGsm  = 1.3 * (gbThick/10) * 10000
    const boardSqIn = (2*(L*W)+2*(L*H)+2*(W*H)) * qty
    const boardKg   = boardSqIn * 6.4516 * gbGsm / 10000 / 1000
    bk[`Greyboard ${gbThick}mm`] = boardKg * rates.gb
    matKg += boardKg
  } else {
    const stockRateMap: Record<string,number> = { bleach:rates.bleach, art:rates.art, alb:rates.alb, krf:rates.krf }
    const rate = stockRateMap[stockKey] ?? rates.bleach
    bk['Paper stock'] = sL * sW * gsm * rate / 15500 / 100 * eff
    matKg = flat.fL * flat.fW * gsm / 15500 / 100 * qty
  }

  if (scan > 0) bk['Scanning'] = scan

  // ── Printing ───────────────────────────────────────────────────
  if (pSpec !== 'none') {
    const plates = pSpec==='4c'?4 : pSpec==='2c'?2 : 1
    const run    = pSpec==='4c'?mr.c4 : pSpec==='2c'?mr.c2 : pSpec==='pms'?mr.pms : mr.gnd
    bk['Plates'] = mr.plate * plates
    bk['Printing'] = run
  }

  // ── Lamination ─────────────────────────────────────────────────
  // Formula: sheet_L × sheet_W / 144 × rate × eff_sheets × sides
  // Morocco = no lamination
  if (lam !== 'none' && wrapType !== 'mor') {
    const lamRate = isC ? rates.lam_corr :
      lam==='gloss' ? rates.lam_gloss :
      lam==='matte' ? rates.lam_matte : rates.lam_soft
    const sidesMult = sides==='both' ? 2 : 1
    bk['Lamination'] = sL * sW / 144 * lamRate * eff * sidesMult
  }

  // ── Foil ───────────────────────────────────────────────────────
  if (foilSqIn > 0) bk['Foil block'] = foilSqIn * rates.foil

  // ── Die ────────────────────────────────────────────────────────
  if (die === 'new')      { bk['Die making'] = rates.die_make; bk['Die cutting'] = rates.die_cut }
  else if (die === 'existing') bk['Die cutting'] = rates.die_cut

  // ── Pasting ────────────────────────────────────────────────────
  if (paste === 'auto') bk['Machine pasting'] = rates.paste_auto * qty
  else if (paste === 'hand') bk['Manual pasting'] = rates.paste_hand * qty

  // ── Accessories ────────────────────────────────────────────────
  if (ribQty > 0) bk['Ribbon'] = ribQty * rates.ribbon
  if (magQty > 0) bk['Magnets'] = magQty * rates.magnet

  // ── EVA foam: insert_L × insert_W × Rs4.75 × qty (verified ±0.6%) ──
  if (foamOn && input.fL_ins && input.fW_ins) {
    bk['EVA foam insert'] = input.fL_ins * input.fW_ins * rates.eva * qty
  }

  // ── Rush surcharge ─────────────────────────────────────────────
  const prodSub = Object.values(bk).reduce((a,b)=>a+b, 0)
  if (rush > 0) bk[`Rush surcharge (+${rush}%)`] = prodSub * (rush/100)

  // ── Shipping ───────────────────────────────────────────────────
  const cartons  = Math.ceil(qty / bpc)
  const shipKg   = cartons * cWt
  const shipRate = 0 // shipping rates looked up separately in component
  if (shipRate > 0) bk['Shipping'] = shipRate

  const totalCost = Object.values(bk).reduce((a,b)=>a+b, 0)
  const profit    = totalCost * (prof/100)
  bk[`Vendor profit (${prof}%)`] = profit
  const finalPKR  = totalCost + profit
  const divisor   = rates.div_usd || 280
  const finalUSD  = finalPKR / divisor
  const unitUSD   = finalUSD / qty
  const margin    = profit / finalPKR * 100

  // ── DHL box selection ──────────────────────────────────────────
  const Lcm = L*2.54, Wcm = W*2.54, Hcm = H*2.54
  const volWt    = (Lcm*Wcm*Hcm) / 5000
  const chargeWt = Math.max(volWt, matKg/qty)
  const dims3    = [Lcm,Wcm,Hcm].sort((a,b)=>b-a)
  const dhlBox   = DHL_BOXES.find(b => {
    const bd = [b.L,b.W,b.H].sort((a,c)=>c-a)
    return dims3[0]<=bd[0] && dims3[1]<=bd[1] && dims3[2]<=bd[2] && chargeWt<=b.maxKg
  }) || null

  return {
    qty, bk, totalCost, profit, finalPKR, finalUSD, unitUSD, margin,
    matKg, shipKg, cartons, volWt, chargeWt, dhlBox,
    effSheets: eff, mult, flat, machine, sheet, ups
  }
}

// Default rates matching Supabase seed data
export const DEFAULT_RATES: Record<string,number> = {
  bleach:330, art:350, alb:450, krf:310, wrap:410,
  gb:250, mor:600, eva:4.75,
  corr_liner:0.20, corr_board_e:0.07, corr_board_b:0.14, corr_board_c:0.21,
  lam_gloss:3.5, lam_matte:4.0, lam_soft:40.0, lam_corr:6.0,
  foil:90, die_make:8000, die_cut:6000,
  paste_auto:0.7, paste_hand:25,
  ribbon:18, magnet:35, laser:2000,
  div_usd:280, div_gbp:360,
}
