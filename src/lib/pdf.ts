import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

interface QuoteData {
  quoteNumber: string
  customerName: string
  date: string
  boxStyle: string
  dimensions: string
  flatSize: string
  machineUsed: string
  dhlBox: string
  tiers: Array<{
    qty: number
    totalUSD: number
    unitUSD: number
    totalPKR: number
    margin?: number
  }>
  breakdown?: Record<string, number>
  isInternal?: boolean
}

export async function generateQuotePDF(data: QuoteData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842]) // A4
  const { width, height } = page.getSize()

  const bold   = await doc.embedFont(StandardFonts.HelveticaBold)
  const normal = await doc.embedFont(StandardFonts.Helvetica)

  const black  = rgb(0.11, 0.11, 0.11)
  const grey   = rgb(0.43, 0.43, 0.43)
  const light  = rgb(0.95, 0.95, 0.96)
  const accent = rgb(0.04, 0.48, 1.0)
  const green  = rgb(0.11, 0.62, 0.46)

  let y = height - 40

  // ── Header bar ──────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: height-70, width, height: 70, color: black })
  page.drawText('CBH', { x: 32, y: height-42, size: 22, font: bold, color: rgb(1,1,1) })
  page.drawText('PRICE ENGINE', { x: 32, y: height-57, size: 8, font: normal, color: rgb(0.6,0.6,0.6) })
  page.drawText('Custom Boxes Hub', { x: width-160, y: height-42, size: 10, font: bold, color: rgb(1,1,1) })
  page.drawText('customboxeshub.com', { x: width-160, y: height-57, size: 8, font: normal, color: rgb(0.6,0.6,0.6) })

  y = height - 95

  // ── Quote number + date ─────────────────────────────────────────────
  page.drawText(`Quote #${data.quoteNumber}`, { x: 32, y, size: 18, font: bold, color: black })
  page.drawText(data.date, { x: width-130, y, size: 10, font: normal, color: grey })
  if (data.isInternal) {
    page.drawRectangle({ x: width-200, y: y-4, width: 60, height: 18, color: rgb(0.95,0.55,0.1) })
    page.drawText('INTERNAL', { x: width-195, y: y+1, size: 8, font: bold, color: rgb(1,1,1) })
  }

  y -= 24

  // ── Customer ────────────────────────────────────────────────────────
  if (data.customerName) {
    page.drawText(`Customer: ${data.customerName}`, { x: 32, y, size: 10, font: normal, color: grey })
    y -= 18
  }

  // ── Divider ─────────────────────────────────────────────────────────
  page.drawLine({ start:{x:32,y}, end:{x:width-32,y}, thickness:0.5, color:rgb(0.85,0.85,0.87) })
  y -= 18

  // ── Box specs ───────────────────────────────────────────────────────
  page.drawText('Box Specification', { x:32, y, size:11, font:bold, color:black })
  y -= 16

  const specs = [
    ['Style', data.boxStyle],
    ['Finish dimensions', data.dimensions],
    ['Flat / open size', data.flatSize],
    ['Machine', data.machineUsed],
    ['DHL box', data.dhlBox],
  ]
  for (const [label, value] of specs) {
    page.drawText(label, { x:32, y, size:9, font:normal, color:grey })
    page.drawText(value, { x:160, y, size:9, font:normal, color:black })
    y -= 14
  }

  y -= 8
  page.drawLine({ start:{x:32,y}, end:{x:width-32,y}, thickness:0.5, color:rgb(0.85,0.85,0.87) })
  y -= 20

  // ── Pricing table header ────────────────────────────────────────────
  page.drawText('Multi-Tier Pricing', { x:32, y, size:11, font:bold, color:black })
  y -= 18

  // Table header row
  page.drawRectangle({ x:32, y: y-4, width: width-64, height: 20, color: black })
  const cols = [32, 140, 260, 380, 470]
  const headers = ['Quantity', 'Total (USD)', 'Per unit (USD)', 'Total (PKR)', data.isInternal ? 'Margin' : '']
  headers.forEach((h,i) => {
    if (h) page.drawText(h, { x: cols[i]+6, y: y+2, size:8, font:bold, color:rgb(1,1,1) })
  })
  y -= 22

  // Table rows
  data.tiers.forEach((tier, idx) => {
    const rowBg = idx % 2 === 0 ? light : rgb(1,1,1)
    page.drawRectangle({ x:32, y: y-4, width: width-64, height: 20, color: rowBg })
    page.drawText(tier.qty.toLocaleString(), { x: cols[0]+6, y: y+2, size:9, font:bold, color:black })
    page.drawText(`$${tier.totalUSD.toFixed(2)}`, { x: cols[1]+6, y: y+2, size:9, font:normal, color:accent })
    page.drawText(`$${tier.unitUSD.toFixed(3)}`, { x: cols[2]+6, y: y+2, size:9, font:normal, color:black })
    page.drawText(`Rs ${Math.round(tier.totalPKR).toLocaleString()}`, { x: cols[3]+6, y: y+2, size:9, font:normal, color:grey })
    if (data.isInternal && tier.margin !== undefined) {
      const mColor = tier.margin >= 40 ? green : tier.margin >= 30 ? rgb(0.72,0.47,0.07) : rgb(0.87,0.2,0.18)
      page.drawText(`${tier.margin.toFixed(1)}%`, { x: cols[4]+6, y: y+2, size:9, font:bold, color:mColor })
    }
    y -= 22
  })

  y -= 12

  // ── PKR breakdown (internal only) ───────────────────────────────────
  if (data.isInternal && data.breakdown) {
    page.drawLine({ start:{x:32,y}, end:{x:width-32,y}, thickness:0.5, color:rgb(0.85,0.85,0.87) })
    y -= 18
    page.drawText('PKR Cost Breakdown (Internal)', { x:32, y, size:11, font:bold, color:black })
    y -= 16

    for (const [label, value] of Object.entries(data.breakdown)) {
      const isProfit = label.includes('profit')
      const color = isProfit ? green : black
      page.drawText(label, { x:32, y, size:8, font:normal, color:grey })
      page.drawText(`Rs ${Math.round(value).toLocaleString()}`, { x:width-100, y, size:8, font:isProfit?bold:normal, color })
      y -= 13
      if (y < 60) break
    }
  }

  // ── Footer ──────────────────────────────────────────────────────────
  page.drawLine({ start:{x:32,y:50}, end:{x:width-32,y:50}, thickness:0.5, color:rgb(0.85,0.85,0.87) })
  page.drawText('Custom Boxes Hub · customboxeshub.com · accounts@customboxeshub.com · (866)-472-5540', {
    x:32, y:36, size:7, font:normal, color:rgb(0.6,0.6,0.6)
  })
  page.drawText('This quote is valid for 30 days from the date of issue.', {
    x:32, y:24, size:7, font:normal, color:rgb(0.6,0.6,0.6)
  })

  return await doc.save()
}

export function downloadPDF(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
