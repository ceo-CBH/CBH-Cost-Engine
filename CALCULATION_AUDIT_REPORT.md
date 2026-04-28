# CBH Cost Engine Calculation Audit

Date: 2026-04-28

## Scope

Audited calculation files:

- `src/lib/engine.ts`
- `src/lib/pricing/die.ts`
- `src/lib/pricing/foiling.ts`
- `src/lib/pricing/greyboard.ts`
- `src/lib/pricing/margin.ts`
- `src/lib/pricing/pasting.ts`
- `src/lib/pricing/two-piece.ts`
- `src/lib/pricing/uv.ts`
- `src/lib/shipping/calculator.ts`
- `src/lib/shipping/jfk-zones.ts`
- `src/app/quote/new/page.tsx`
- `src/lib/pdf.ts`
- `src/app/rates/page.tsx`

Source estimate workbooks reviewed:

- `De la rosa 1 1.xlsx`
- `Engstorm - CBH - Estimation 2.xlsx`
- `Kramer - CBH - Estimation 1.xlsx`
- `Marlen 1.xlsx`

## Extracted Estimate Facts

| Example | Finish size | Open / flat size from estimate | Qty | Style / material | Printing | Finishing | Production cost total | Vendor total | Shipping / final |
| --- | ---: | ---: | ---: | --- | --- | --- | ---: | ---: | ---: |
| De la rosa | 7 x 7 x 7 in | Box: 21.25 x 35.375; insert: 15.25 x 15.375 | 1, 250 | Mailer box with 2 corrugated inserts; Corrugated | Full color | Matte/Gloss; die; pasting | 45,202 / 104,002 | 58,762.60 / 135,202.60 | Qty 1: 14,988 PKR shipping, final 263.395 USD. Qty 250: 371,000 PKR shipping, final 1,807.87 USD |
| Engstorm | 5.25 x 4.5 x 1.175 in | 9.25 x 12.25 | 500 | Reverse tuck; 350 GSM bleach card | Plain white | Matte/Gloss; die; pasting | 11,950 | 15,535 | 42,000 PKR shipping, final 205.48 USD |
| Kramer | 9 x 9 x 3.5 in | 16.875 x 27.5; ribbon 1 x 12 | 50 | Magnetic closure collapsible rigid; white rigid | Full color logo outside + 1 color ground both sides | Matte/Gloss; magnets/ribbon; die; making | 62,612 | 81,395.60 | 105,000 PKR shipping, final 665.70 USD |
| Marlen | 12 x 12 x 6 in | Tray: 24.375 x 24.375; Lid: 24.5 x 24.5 | 120 | Two-piece rigid + MDF | 1 color ground | UV yes; gold foil yes; die; making | 180,000 | 234,000 | No shipping row in workbook |

Unclear or estimated fields:

- De la rosa has two corrugated inserts, but the app has no native component model for extra corrugated inserts.
- Kramer has a compound print pass: full color outside plus 1-color ground on both sides. The app currently allows only one print specification at a time.
- Marlen material says "Rigid + MDF"; the app has greyboard thickness but no MDF material model.
- Shipping carton dimensions / destination zip are not present in these workbooks. Old sheets mostly use manual shipping formulas such as `weight * 3500 / 280`.

## Current Engine Comparison

The app was run through `calcTier()` using the closest available app style and extracted estimate quantities. For production comparison, the app production subtotal excludes its shipping line, then applies the old workbook's 30% vendor-profit markup for apples-to-apples comparison. The "current app final" column shows what the app currently returns with shipping included and its current margin formula.

| Example | Expected vendor total | App production total + 30% markup | Difference | Difference % | Current app final incl. shipping/margin | Suspected cause |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| De la rosa qty 1 | 58,762.60 | 26,459.16 | -32,303.44 | -55.0% | 60,276 | Missing corrugated insert components; app derives 20 x 24 instead of estimate 21.25 x 35.375; missing low-quantity minimums |
| De la rosa qty 250 | 135,202.60 | 87,347.00 | -47,855.60 | -35.4% | 894,317 | Shipping added before margin; smart DHL rate differs from old 3,500/kg sheet; open size and insert handling mismatch |
| Engstorm qty 500 | 15,535.00 | 14,295.46 | -1,239.54 | -8.0% | 118,909 | App derives 11.05 x 8.675 instead of estimate 9.25 x 12.25; missing 10 x 12.5 sheet; shipping and margin order inflate final |
| Kramer qty 50 | 81,395.60 | 51,202.43 | -30,193.17 | -37.1% | 282,209 | Rigid-mag flat formula gives 16.75 x 13 instead of 16.875 x 27.5; compound print pass unsupported; shipping and margin order inflate final |
| Marlen qty 120 | 234,000.00 | 533,810.21 | +299,810.21 | +128.1% | 612,045 | Foil toggle applies full combined box area; two-piece tray/lid flats differ; MDF not modeled; workbook uses 200/box making while app uses confirmed 250/box |

## Exact Problems Found

### 1. Margin and Shipping Order

Affected files:

- `src/lib/engine.ts`
- `src/lib/pricing/margin.ts`
- `src/app/quote/new/page.tsx`

Current behavior:

```text
cost total includes shipping
selling price = cost total / (1 - margin%)
```

Workbook behavior:

```text
production cost total
vendor profit = production cost total * 30%
vendor total = production cost total + vendor profit
final customer total = vendor total + shipping
```

Impact:

- Shipping is being marked up.
- A 30% setting is treated as target gross margin instead of 30% vendor markup.
- This alone can more than double customer-facing totals when shipping is large.

Recommended fix:

```text
production cost total = production lines only
vendor profit = production cost total * margin%
vendor total = production cost total + vendor profit
final selling price = vendor total + shipping
```

### 2. Manual Open / Flat Size Is Missing

Affected files:

- `src/lib/engine.ts`
- `src/app/quote/new/page.tsx`

Current behavior:

The app always calculates flat size from finish size and style.

Examples:

- Engstorm expected 9.25 x 12.25, app calculated 11.05 x 8.675.
- De la rosa expected 21.25 x 35.375, app calculated 20 x 24 for the nearest corrugated mailer style.
- Kramer expected 16.875 x 27.5, app calculated 16.75 x 13.

Impact:

Most downstream costs are wrong because stock, lamination, die, foil, UV, imposition, sheet choice, and weight all depend on open size.

Recommended fix:

Add optional manual flat/open-size override fields and use them before formula-derived flats.

### 3. Sheet Size Library Is Missing Real Estimate Sheet Sizes

Affected file:

- `src/lib/engine.ts`

Current missing sheet sizes observed in estimates:

- 10 x 12.5
- 20 x 30 full sheet
- 23 x 36 full sheet
- 25 x 30 full sheet
- 27 x 34 full sheet

Impact:

The app often selects 30 x 40 or another non-estimate sheet, which changes stock, lamination, imposition, and effective sheets.

Recommended fix:

Add the missing real sheet sizes without removing the existing cut-size list.

### 4. Two-Piece Rigid Flat Formula Does Not Match Marlen

Affected files:

- `src/lib/pricing/two-piece.ts`
- `src/lib/engine.ts`

Current behavior for 12 x 12 x 6:

```text
Tray = 24.5 x 24.5
Lid = 24.657 x 24.657
```

Estimate:

```text
Tray = 24.375 x 24.375
Lid = 24.5 x 24.5
```

Confirmed rule from user:

```text
Lid and tray must be calculated separately.
Lid must include +0.157 inch clearance offset.
```

Recommended fix:

Use a 0.375 allowance for the tray base flat and apply +0.157 clearance to the lid. For exact legacy estimates, manual tray/lid override should also be available.

### 5. Corrugated Formula Is Not Centralized and Does Not Follow the Confirmed Formula

Affected files:

- `src/lib/engine.ts`
- `src/lib/pricing/*`

Current behavior:

Corrugated material is calculated inline from flat area and hard-coded per-square-inch rates:

```text
Corrugated liner = flat area * corr_liner * qty * sides
Corrugated board = flat area * corr_board rate * qty
```

Confirmed formula to check:

```text
Corrugation = ((sheet_size * 250) / 15500) * 300 / 100
```

Recommended fix:

Move corrugation into a pricing module and calculate from selected sheet area and effective sheet count.

### 6. Foil and UV Need Area Clarity

Affected files:

- `src/lib/engine.ts`
- `src/lib/pricing/foiling.ts`
- `src/lib/pricing/uv.ts`
- `src/app/quote/new/page.tsx`

Current behavior:

The UI only has YES/NO toggles. When enabled, the engine uses the entire flat blank area.

Confirmed formula:

```text
Block = flat_size * 90
Foiling labour = flat_size * 120
UV = (flat_size / 144) * 6
```

Estimate conflict:

- Marlen workbook has Block = 3,000 and Foiling = 3,000, while full combined flat area would produce app values over 250,000 PKR.
- Marlen UV workbook value is 4,000, while the confirmed formula on full combined flat area produces about 50 PKR.

Recommendation:

Keep formulas centralized, but add optional foil/UV area override fields. If no override is supplied, the app can still default to full flat area.

### 7. Estimate Conflicts With Confirmed Formula List

These are not safe to "fix" without Mark confirming which rule should win:

- Engstorm die making is 1,200, but confirmed formula says `open_size * 8`, minimum 2,500.
- Kramer die making uses `17 * 28 * 12`, but confirmed formula says `open_size * 8`.
- Marlen making is `120 * 200`, but confirmed formula says rigid box making is 250 PKR per box.
- Marlen UV and foiling line items do not match the confirmed full-flat formulas.
- De la rosa and Kramer include manual extras / labor lines not expressible in the current app.

## Recommended Fixes To Apply Now

1. Separate production subtotal, vendor markup, shipping, and final selling total.
2. Change margin calculation to workbook-style markup.
3. Add manual flat/open-size overrides, including separate lid/tray override for two-piece rigid boxes.
4. Add missing sheet sizes from real estimates.
5. Centralize corrugation formula and use selected sheet area.
6. Add optional foil/UV area overrides while preserving current YES/NO toggles.
7. Fix two-piece base tray allowance to 0.375 and preserve +0.157 lid clearance.

Items not safe to auto-fix without confirmation:

- Modeling extra corrugated inserts as separate components.
- Replacing confirmed 250 PKR/box rigid making with older workbook-specific 200 PKR/box or flat 1,000 PKR.
- Replacing confirmed die formula with older ad-hoc die values.
- Replacing smart shipping with older manual 3,500 PKR/kg shipping.

## Fixes Applied

Applied after the audit section above was written:

- Added optional manual open-size overrides in `src/app/quote/new/page.tsx` and `src/lib/engine.ts`.
- Added separate two-piece tray and lid open-size overrides.
- Added missing real sheet sizes observed in workbooks: 10 x 12.5, 20 x 30, 23 x 36, 22 x 28, and 27 x 34.
- Added centralized `src/lib/pricing/corrugation.ts`.
- Updated corrugated liner/board cost to use selected sheet area and effective sheet count.
- Updated greyboard to prefer actual open/flat area instead of finish-size surface area.
- Changed margin logic to workbook-style markup.
- Moved shipping outside production cost and outside vendor markup.
- Added optional foil and UV area override fields.
- Changed two-piece tray base allowance to 0.375 while preserving the +0.157 lid clearance rule.

## Post-Fix Comparison

These reruns used workbook open-size overrides where available. Shipping still uses the app's DHL/JFK/Skynet rate table because the workbook shipping carton/destination fields are not available.

| Example | Expected vendor total | App vendor total after fixes | Difference | Difference % | App final incl. app shipping | Remaining gap |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| De la rosa qty 1 | 58,762.60 | 29,163 | -29,600 | -50.4% | 51,002 | App still cannot model the 2 corrugated inserts and low-quantity manual minimums. |
| De la rosa qty 250 | 135,202.60 | 67,565 | -67,638 | -50.0% | 626,397 | Insert components are still missing; app shipping rate is 558,832 vs workbook manual shipping 371,000. |
| Engstorm qty 500 | 15,535 | 16,225 | +690 | +4.4% | 88,465 | Production now closely matches; remaining production gap is mainly die minimum 2,500 vs workbook die 1,200, and app shipping 72,240 vs workbook 42,000. |
| Kramer qty 50 | 81,395.60 | 80,244 | -1,152 | -1.4% | 238,403 | Production now closely matches; remaining final gap is app shipping 158,160 vs workbook 105,000. |
| Marlen qty 120 | 234,000 | 531,818 | +297,818 | +127.3% | 549,627 | Foil/UV/MDF assumptions are unresolved. Workbook foil/UV values do not match the confirmed full-flat formulas. |

## Remaining Recommendations

Do not treat the remaining De la rosa and Marlen gaps as arithmetic bugs yet. They require product-model decisions:

- Add a true "extra component" model for inserts, trays, sleeves, and corrugated inserts.
- Add MDF as a separate rigid material line if it should be priced.
- Confirm whether foil and UV should use full flat area, artwork area, batch minimums, or estimator-entered fixed costs.
- Confirm whether shipping should continue using the new DHL/JFK/Skynet smart selector or preserve the older workbook's manual 3,500 PKR/kg model for historical parity.
