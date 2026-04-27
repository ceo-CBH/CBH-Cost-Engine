'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { createClient } from '@/lib/supabase/client'
import { calcTier, flatSize, autoMachine, bestSheet, DEFAULT_RATES, type BoxStyle, type CalcInput, type CalcTier } from '@/lib/engine'
import { calculateSellingPrice } from '@/lib/pricing'
import { generateQuotePDF, downloadPDF } from '@/lib/pdf'

const BOX_STYLES = [
  { value:'tuck',       label:'Tuck end box',            group:'Folding / Paperboard' },
  { value:'mailer',     label:'Mailer / auto-bottom',    group:'Folding / Paperboard' },
  { value:'sleeve',     label:'Sleeve',                  group:'Folding / Paperboard' },
  { value:'4corner',    label:'4-corner box',            group:'Folding / Paperboard' },
  { value:'2pc',        label:'2-piece rigid lid & tray', group:'Rigid' },
  { value:'rigid-mag',  label:'Rigid — magnetic closure',group:'Rigid' },
  { value:'rigid-book', label:'Rigid — bookend',          group:'Rigid' },
  { value:'corr-rsc',   label:'RSC shipping carton',     group:'Corrugated' },
  { value:'corr-mail',  label:'Corrugated mailer',       group:'Corrugated' },
]

type Tier = { qty: number }

function defaultGsmForStyle(boxStyle: BoxStyle): string {
  if (boxStyle.startsWith('rigid') || boxStyle === '2pc') return '150'
  if (boxStyle.startsWith('corr')) return '200'
  return '350'
}

export default function NewQuotePage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [step, setStep] = useState(1)
  const [user, setUser] = useState<{email:string; role:string} | null>(null)
  const [rates, setRates] = useState<Record<string,number>>(DEFAULT_RATES)
  const [saving, setSaving] = useState(false)
  const [calcLoading, setCalcLoading] = useState(false)

  // Form state
  const [unit, setUnit] = useState<'mm'|'in'>('mm')
  const [L, setL] = useState(''); const [W, setW] = useState(''); const [H, setH] = useState('')
  const [style, setStyle] = useState<BoxStyle>('tuck')
  const [tiers, setTiers] = useState<Tier[]>([{qty:500},{qty:1000}])
  const [newQty, setNewQty] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [gsm, setGsm] = useState(() => defaultGsmForStyle('tuck'))
  const [stockKey, setStockKey] = useState<'bleach'|'art'|'alb'|'krf'>('bleach')
  const [wrapType, setWrapType] = useState<'std'|'mor'|'art'>('std')
  const [gbThick, setGbThick] = useState('2')
  const [flute, setFlute] = useState<'E'|'B'|'C'>('B')
  const [pSpec, setPSpec] = useState<'none'|'4c'|'2c'|'pms'|'gnd'>('4c')
  const [sides, setSides] = useState<'outside'|'both'>('outside')
  const [lam, setLam] = useState<'none'|'gloss'|'matte'|'soft'>('matte')
  const [die, setDie] = useState<'none'|'new'|'existing'>('new')
  const [paste, setPaste] = useState<'none'|'auto'|'hand'>('none')
  const [scan, setScan] = useState('500')
  const [foilEnabled, setFoilEnabled] = useState(false)
  const [uvEnabled, setUvEnabled] = useState(false)
  const [foamOn, setFoamOn] = useState(false)
  const [fLins, setFLins] = useState(''); const [fWins, setFWins] = useState('')
  const [ribQty, setRibQty] = useState('0'); const [magQty, setMagQty] = useState('0')
  const [rush, setRush] = useState('0')
  const [prof, setProf] = useState('30')
  const [bpc, setBpc] = useState('24'); const [cWt, setCWt] = useState('5')
  const [destination, setDestination] = useState<'USA'|'UK'>('USA')
  const [customerZip, setCustomerZip] = useState('')
  const [cartonL, setCartonL] = useState('')
  const [cartonW, setCartonW] = useState('')
  const [cartonH, setCartonH] = useState('')
  const [results, setResults] = useState<CalcTier[] | null>(null)
  const [fileUploading, setFileUploading] = useState(false)
  const [aiResult, setAiResult] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({data:{user}})=>{
      if (!user) { router.push('/login'); return }
      supabase.from('profiles').select('email,role').eq('id',user.id).single().then(({data})=>{
        setUser({ email: user.email||'', role: data?.role||'estimator' })
      })
    })
    supabase.from('rates').select('key,value').then(({data})=>{
      if (data) {
        const r: Record<string,number> = { ...DEFAULT_RATES }
        data.forEach(({key,value})=>{ r[key]=Number(value) })
        setRates(r)
      }
    })
  }, [router, supabase])

  const isRigid = style.startsWith('rigid') || style === '2pc'
  const isCorr  = style.startsWith('corr')

  function toin(v: string): number {
    const n = parseFloat(v) || 0
    return unit==='mm' ? n/25.4 : n
  }

  function handleStyleChange(nextStyle: BoxStyle) {
    setStyle(nextStyle)
    setGsm(defaultGsmForStyle(nextStyle))
  }

  // Derived flat size display
  const Linch = toin(L), Winch = toin(W), Hinch = toin(H)
  const flatDisplay = (Linch && Winch && Hinch) ? flatSize(style,Linch,Winch,Hinch) : null
  const autoMach = flatDisplay ? autoMachine(flatDisplay.fL, flatDisplay.fW) : null
  const autoSheet = flatDisplay ? bestSheet(flatDisplay.fL, flatDisplay.fW) : null

  function addTier() {
    const q = parseInt(newQty)
    if (!q || tiers.find(t=>t.qty===q) || tiers.length>=6) return
    setTiers(prev=>[...prev,{qty:q}].sort((a,b)=>a.qty-b.qty))
    setNewQty('')
  }
  function removeTier(qty:number) { setTiers(prev=>prev.filter(t=>t.qty!==qty)) }
  function addPreset() {
    const toAdd = [500,1000,2500].filter(q=>!tiers.find(t=>t.qty===q))
    setTiers(prev=>[...prev,...toAdd.map(qty=>({qty}))].sort((a,b)=>a.qty-b.qty).slice(0,6))
  }

  function buildInput(qty:number): CalcInput {
    return {
      L:toin(L), W:toin(W), H:toin(H), style, qty,
      gsm:parseInt(gsm)||350, stockKey, wrapType, gbThick:parseFloat(gbThick)||2, flute,
      pSpec, lam: (wrapType==='mor'?'none':lam), sides, die, paste,
      scan:parseInt(scan)||0, foilEnabled, uvEnabled,
      foamOn, fL_ins:parseFloat(fLins)||0, fW_ins:parseFloat(fWins)||0,
      ribQty:parseInt(ribQty)||0, magQty:parseInt(magQty)||0,
      rush:parseInt(rush)||0, prof:parseInt(prof)||30, salesMarginPct:parseInt(prof)||30,
      courier:'Auto', zone:destination, bpc:parseInt(bpc)||24, cWt:parseFloat(cWt)||5,
      destination, customerZip,
      cartonL:parseFloat(cartonL)||toin(L), cartonW:parseFloat(cartonW)||toin(W), cartonH:parseFloat(cartonH)||toin(H),
      rates,
    }
  }

  function updateSalesMargin(next: string) {
    setProf(next)
    const pct = parseInt(next) || 30
    setResults(prev => prev?.map(r => {
      const pricing = calculateSellingPrice(r.totalCost, pct, rates.div_usd || 280)
      return {
        ...r,
        profit: pricing.marginAmountPKR,
        finalPKR: pricing.sellingPricePKR,
        finalUSD: pricing.sellingPriceUSD,
        unitUSD: pricing.sellingPriceUSD / r.qty,
        margin: pricing.effectiveMarginPct,
        salesMarginPct: pct,
        salesMarginPKR: pricing.marginAmountPKR,
      }
    }) ?? null)
  }

  function runCalc() {
    if (!Linch||!Winch||!Hinch||!tiers.length) return
    setCalcLoading(true)
    setTimeout(()=>{
      const res = tiers.map(t=>calcTier(buildInput(t.qty)))
      setResults(res)
      setCalcLoading(false)
      setStep(3)
    }, 1600)
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileUploading(true); setAiResult('Claude is reading your file…')
    try {
      const b64 = await new Promise<string>((ok,err)=>{
        const r = new FileReader()
        r.onload = ()=>ok((r.result as string).split(',')[1])
        r.onerror = err
        r.readAsDataURL(file)
      })
      const res = await fetch('/api/claude', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ type:'dieline', b64, mime:file.type, name:file.name })
      })
      const data = await res.json()
      if (data.L) {
        setL(unit==='mm' ? String(Math.round(data.L*25.4)) : String(data.L))
        setW(unit==='mm' ? String(Math.round(data.W*25.4)) : String(data.W))
        setH(unit==='mm' ? String(Math.round(data.H*25.4)) : String(data.H))
        if (data.style && BOX_STYLES.find(s=>s.value===data.style)) {
          const nextStyle = data.style as BoxStyle
          setStyle(nextStyle)
          if (!data.gsm) setGsm(defaultGsmForStyle(nextStyle))
        }
        if (data.gsm) setGsm(String(data.gsm))
        setAiResult(`✓ Extracted: ${data.L}"×${data.W}"×${data.H}" · ${data.style||'—'} · confidence: ${data.confidence||'—'}${data.notes?'\n'+data.notes:''}`)
      } else {
        setAiResult('Could not extract dimensions — please enter manually.')
      }
    } catch {
      setAiResult('Error reading file — please enter dimensions manually.')
    }
    setFileUploading(false)
  }

  async function saveQuote() {
    if (!results) return
    setSaving(true)
    const first = results[0]
    const qnum = `Q-${Math.floor(Date.now()/1000)}`

    const { data: quote, error } = await supabase.from('quotes').insert({
      quote_number: qnum,
      customer_name: customerName || null,
      box_style: style,
      finish_l: toin(L), finish_w: toin(W), finish_h: toin(H), unit,
      flat_l: first.flat.fL, flat_w: first.flat.fW,
      gsm: parseInt(gsm), material: isRigid ? `greyboard ${gbThick}mm` : isCorr ? `corrugated ${flute}` : stockKey,
      print_spec: pSpec, lamination: lam, print_sides: sides, die, pasting: paste,
      foam_insert: foamOn, foam_l: parseFloat(fLins)||null, foam_w: parseFloat(fWins)||null,
      rush_pct: parseInt(rush), profit_pct: parseInt(prof), divisor: rates.div_usd||280,
      courier: first.shipping?.selectedCourier || 'Auto',
      zone: first.shipping?.selectedZone ? String(first.shipping.selectedZone) : destination,
      machine_used: first.machine.name, sheet_size: `${first.sheet[0]}×${first.sheet[1]}`,
      status: 'pending',
    }).select().single()

    if (!error && quote) {
      await supabase.from('quote_tiers').insert(
        results.map(r=>({
          quote_id: quote.id, qty: r.qty,
          eff_sheets: r.effSheets, qty_multiplier: r.mult,
          stock_pkr: r.bk['Paper stock']||r.bk['Wrap paper']||r.bk['Corrugated liner']||0,
          lam_pkr: r.bk['Lamination']||0, print_pkr: r.bk['Printing']||0,
          die_pkr: (r.bk['Die Making']||0)+(r.bk['Die Cutting']||0),
          foam_pkr: r.bk['EVA foam insert']||0,
          pasting_pkr: r.bk['Pasting']||0,
          shipping_pkr: r.shippingPkr,
          profit_pkr: r.profit, total_pkr: r.finalPKR,
          total_usd: r.finalUSD, unit_usd: r.unitUSD, margin_pct: r.margin,
          mat_weight_kg: r.matKg, ship_weight_kg: r.shipKg,
          dhl_box: r.dhlBox?.n||null,
        }))
      )
      router.push(`/quotes/${quote.id}`)
    }
    setSaving(false)
  }

  async function downloadQuotePDF(internal:boolean) {
    if (!results) return
    const first = results[0]
    const bytes = await generateQuotePDF({
      quoteNumber: `Q-${Date.now()}`,
      customerName: customerName || 'Custom Boxes Hub Client',
      date: new Date().toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'}),
      boxStyle: BOX_STYLES.find(s=>s.value===style)?.label || style,
      dimensions: `${L}×${W}×${H} ${unit}`,
      flatSize: `${first.flat.fL.toFixed(3)}" × ${first.flat.fW.toFixed(3)}"`,
      machineUsed: first.machine.name,
      dhlBox: first.shipping
        ? `${first.shipping.selectedCourier} · ${first.shipping.chargeableWeightKg}kg`
        : first.dhlBox ? `DHL Box ${first.dhlBox.n}` : 'Custom freight',
      tiers: results.map(r=>({ qty:r.qty, totalUSD:r.finalUSD, unitUSD:r.unitUSD, totalPKR:r.finalPKR, margin:r.margin })),
      breakdown: internal ? first.bk : undefined,
      isInternal: internal,
    })
    downloadPDF(bytes, `CBH-Quote-${internal?'Internal-':''}${Date.now()}.pdf`)
  }

  if (!user) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'#86868B'}}>Loading…</div>

  return (
    <div style={{display:'flex',minHeight:'100vh'}}>
      <Sidebar userEmail={user.email} userRole={user.role}/>
      <main style={{flex:1,marginLeft:'220px',padding:'32px',overflowY:'auto'}}>

        {/* Step indicator */}
        <div style={{display:'flex',alignItems:'center',gap:'0',marginBottom:'28px'}}>
          {['Box Details','Finishing','Quote Result'].map((label,i)=>{
            const n=i+1; const done=step>n; const active=step===n
            return (
              <div key={label} style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'13px',fontWeight:'500',color:active?'#0A84FF':done?'#30D158':'#48484A',cursor:done?'pointer':'default'}} onClick={()=>done&&setStep(n)}>
                  <div style={{width:'26px',height:'26px',borderRadius:'50%',border:`1.5px solid ${active?'#0A84FF':done?'#30D158':'#48484A'}`,background:active?'#0A84FF':done?'#30D158':'transparent',display:'grid',placeItems:'center',fontSize:'11px',fontWeight:'700',color:active||done?'white':'#48484A',boxShadow:active?'0 0 12px rgba(10,132,255,0.4)':'none',transition:'all .2s'}}>
                    {done ? '✓' : n}
                  </div>
                  {label}
                </div>
                {i<2 && <div style={{width:'40px',height:'1px',background:done?'#30D158':'rgba(255,255,255,0.1)',margin:'0 8px',flexShrink:0}}/>}
              </div>
            )
          })}
        </div>

        {/* ══ STEP 1 ══ */}
        {step===1 && (
          <div className="fade-up">
            <div style={{fontFamily:'var(--font-syne)',fontSize:'22px',fontWeight:'700',letterSpacing:'-.4px',marginBottom:'4px'}}>Box Details</div>
            <div style={{fontSize:'13px',color:'#86868B',marginBottom:'22px'}}>Dimensions, style and quantity tiers. Everything else is calculated automatically.</div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginBottom:'14px'}}>

              {/* Dimensions */}
              <div className="card" style={{padding:'18px 20px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
                  <div style={{fontSize:'11px',fontWeight:'600',color:'#86868B',textTransform:'uppercase',letterSpacing:'.6px'}}>Dimensions</div>
                  <div style={{display:'flex',background:'#1A1A1A',border:'0.5px solid rgba(255,255,255,0.1)',borderRadius:'8px',padding:'3px',gap:'2px'}}>
                    {(['mm','in'] as const).map(u=>(
                      <button key={u} onClick={()=>setUnit(u)} style={{padding:'4px 12px',borderRadius:'5px',border:'none',background:unit===u?'#0A84FF':'transparent',color:unit===u?'white':'#86868B',fontSize:'12px',fontWeight:'500',cursor:'pointer',transition:'all .12s'}}>{u}</button>
                    ))}
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px',marginBottom:'12px'}}>
                  {[['L','Length',L,setL],['W','Width',W,setW],['H','Height',H,setH]].map(([k,lbl,val,set])=>(
                    <div key={String(k)}>
                      <label style={{display:'block',fontSize:'11px',color:'#86868B',marginBottom:'4px',fontWeight:'500'}}>{String(lbl)} ({unit})</label>
                      <input className="input" type="number" step={unit==='mm'?'1':'0.125'} value={String(val)} onChange={e=>(set as (v:string)=>void)(e.target.value)} placeholder="0"/>
                    </div>
                  ))}
                </div>
                <div>
                  <label style={{display:'block',fontSize:'11px',color:'#86868B',marginBottom:'4px',fontWeight:'500'}}>Box style</label>
                  <select className="input" value={style} onChange={e=>handleStyleChange(e.target.value as BoxStyle)}>
                    {['Folding / Paperboard','Rigid','Corrugated'].map(grp=>(
                      <optgroup key={grp} label={grp}>
                        {BOX_STYLES.filter(s=>s.group===grp).map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                {flatDisplay && (
                  <div style={{marginTop:'12px',background:'rgba(10,132,255,0.07)',border:'0.5px solid rgba(10,132,255,0.2)',borderRadius:'8px',padding:'8px 12px',fontFamily:'var(--font-dm-mono)',fontSize:'12px',color:'#0A84FF'}}>
                    📐 Flat: {flatDisplay.fL.toFixed(3)}&quot; × {flatDisplay.fW.toFixed(3)}&quot;
                    &nbsp;·&nbsp; Machine: {autoMach?.name}
                    &nbsp;·&nbsp; Sheet: {autoSheet?.[0]}×{autoSheet?.[1]}&quot;
                  </div>
                )}
              </div>

              {/* Quantity tiers */}
              <div className="card" style={{padding:'18px 20px'}}>
                <div style={{fontSize:'11px',fontWeight:'600',color:'#86868B',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:'12px'}}>Quantity Tiers <span style={{color:'#48484A',fontWeight:'400',textTransform:'none',letterSpacing:'0'}}>— up to 6, auto-prices each</span></div>
                {tiers.map(t=>(
                  <div key={t.qty} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'0.5px solid rgba(255,255,255,0.06)'}}>
                    <span style={{fontFamily:'var(--font-dm-mono)',fontSize:'13px',fontWeight:'500'}}>{t.qty.toLocaleString()} units</span>
                    <button onClick={()=>removeTier(t.qty)} style={{background:'none',border:'none',cursor:'pointer',color:'#48484A',fontSize:'16px',padding:'2px 6px',transition:'color .15s'}} onMouseOver={e=>(e.currentTarget.style.color='#FF453A')} onMouseOut={e=>(e.currentTarget.style.color='#48484A')}>×</button>
                  </div>
                ))}
                <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
                  <input className="input" type="number" value={newQty} onChange={e=>setNewQty(e.target.value)} placeholder="e.g. 2500" onKeyDown={e=>e.key==='Enter'&&addTier()} style={{flex:1}}/>
                  <button onClick={addTier} className="btn btn-ghost btn-sm">+ Add</button>
                </div>
                <button onClick={addPreset} className="btn btn-ghost btn-sm" style={{width:'100%',justifyContent:'center',marginTop:'8px'}}>Quick: 500 / 1,000 / 2,500</button>

                <div style={{marginTop:'14px'}}>
                  <label style={{display:'block',fontSize:'11px',color:'#86868B',marginBottom:'4px',fontWeight:'500'}}>Customer name (optional)</label>
                  <input className="input" type="text" value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="Client name for the quote"/>
                </div>
              </div>
            </div>

            {/* Die line upload */}
            <div className="card" style={{padding:'18px 20px',marginBottom:'14px'}}>
              <div style={{fontSize:'11px',fontWeight:'600',color:'#86868B',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:'10px'}}>
                Upload die line or 3D render
                <span style={{background:'rgba(10,132,255,0.15)',color:'#0A84FF',fontSize:'10px',fontWeight:'700',padding:'2px 7px',borderRadius:'4px',marginLeft:'8px',letterSpacing:'.3px'}}>Claude AI</span>
              </div>
              <label style={{display:'block',border:'1.5px dashed rgba(255,255,255,0.14)',borderRadius:'12px',padding:'20px',textAlign:'center',cursor:'pointer',transition:'all .2s',background:'rgba(255,255,255,0.02)'}}>
                <input type="file" accept=".pdf,.ai,.dxf,.png,.jpg,.jpeg,.svg,.cdr" onChange={handleFile} style={{display:'none'}}/>
                <div style={{fontSize:'13px',fontWeight:'500',marginBottom:'4px'}}>{fileUploading ? 'Claude is reading your file…' : 'Drop die line, artwork or 3D render'}</div>
                <div style={{fontSize:'12px',color:'#48484A'}}>PDF · AI · CDR · DXF · PNG · JPG — Claude extracts dimensions automatically</div>
              </label>
              {aiResult && (
                <div style={{marginTop:'8px',background:aiResult.startsWith('✓')?'rgba(48,209,88,0.08)':'rgba(255,159,10,0.08)',border:`0.5px solid ${aiResult.startsWith('✓')?'rgba(48,209,88,0.2)':'rgba(255,159,10,0.2)'}`,borderRadius:'8px',padding:'10px 12px',fontSize:'12px',color:aiResult.startsWith('✓')?'#30D158':'#FF9F0A',whiteSpace:'pre-wrap'}}>
                  {aiResult}
                </div>
              )}
            </div>

            <div style={{display:'flex',justifyContent:'flex-end'}}>
              <button className="btn btn-primary" onClick={()=>setStep(2)} disabled={!Linch||!Winch||!Hinch||!tiers.length}>
                Next: Finishing →
              </button>
            </div>
          </div>
        )}

        {/* ══ STEP 2 ══ */}
        {step===2 && (
          <div className="fade-up">
            <div style={{fontFamily:'var(--font-syne)',fontSize:'22px',fontWeight:'700',letterSpacing:'-.4px',marginBottom:'4px'}}>Finishing Requirements</div>
            <div style={{fontSize:'13px',color:'#86868B',marginBottom:'22px'}}>Material, printing, lamination and accessories. The engine calculates everything else.</div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginBottom:'14px'}}>
              <div>
                {/* Material */}
                <div className="card" style={{padding:'18px 20px',marginBottom:'14px'}}>
                  <div style={{fontSize:'11px',fontWeight:'600',color:'#86868B',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:'12px'}}>Material</div>
                  {isCorr && (
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px'}}>
                      <div><label style={{display:'block',fontSize:'11px',color:'#86868B',marginBottom:'4px',fontWeight:'500'}}>Flute type</label>
                        <select className="input" value={flute} onChange={e=>setFlute(e.target.value as 'E'|'B'|'C')}>
                          <option value="E">E flute (thin, 1.1mm)</option>
                          <option value="B">B flute (standard, 3mm)</option>
                          <option value="C">C flute (heavy, 4mm)</option>
                        </select>
                      </div>
                      <div><label style={{display:'block',fontSize:'11px',color:'#86868B',marginBottom:'4px',fontWeight:'500'}}>GSM (liner)</label>
                        <input className="input" type="number" value={gsm} onChange={e=>setGsm(e.target.value)}/></div>
                    </div>
                  )}
                  {isRigid && (
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px'}}>
                      <div><label style={{display:'block',fontSize:'11px',color:'#86868B',marginBottom:'4px',fontWeight:'500'}}>Board thickness</label>
                        <select className="input" value={gbThick} onChange={e=>setGbThick(e.target.value)}>
                          <option value="1.5">1.5mm</option><option value="2">2mm</option>
                          <option value="2.5">2.5mm</option><option value="3">3mm</option>
                        </select>
                      </div>
                      <div><label style={{display:'block',fontSize:'11px',color:'#86868B',marginBottom:'4px',fontWeight:'500'}}>Wrap paper</label>
                        <select className="input" value={wrapType} onChange={e=>setWrapType(e.target.value as 'std'|'mor'|'art')}>
                          <option value="std">Standard 150gsm</option>
                          <option value="mor">Morocco / Synthetic</option>
                          <option value="art">Art card</option>
                        </select>
                      </div>
                    </div>
                  )}
                  {!isRigid && !isCorr && (
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px'}}>
                      <div><label style={{display:'block',fontSize:'11px',color:'#86868B',marginBottom:'4px',fontWeight:'500'}}>Paper stock</label>
                        <select className="input" value={stockKey} onChange={e=>setStockKey(e.target.value as typeof stockKey)}>
                          <option value="bleach">Bleach card (Rs330/kg)</option>
                          <option value="art">Art card (Rs350/kg)</option>
                          <option value="alb">Albaster (Rs450/kg)</option>
                          <option value="krf">Kraft (Rs310/kg)</option>
                        </select>
                      </div>
                      <div><label style={{display:'block',fontSize:'11px',color:'#86868B',marginBottom:'4px',fontWeight:'500'}}>GSM</label>
                        <input className="input" type="number" value={gsm} onChange={e=>setGsm(e.target.value)}/></div>
                    </div>
                  )}
                  <div><label style={{display:'block',fontSize:'11px',color:'#86868B',marginBottom:'4px',fontWeight:'500'}}>Print specification</label>
                    <select className="input" value={pSpec} onChange={e=>setPSpec(e.target.value as typeof pSpec)}>
                      <option value="none">No print</option><option value="4c">4-color CMYK</option>
                      <option value="2c">2-color</option><option value="pms">1-color PMS</option>
                      <option value="gnd">1-color ground</option>
                    </select>
                  </div>
                  {pSpec!=='none' && (
                    <div style={{marginTop:'10px'}}><label style={{display:'block',fontSize:'11px',color:'#86868B',marginBottom:'4px',fontWeight:'500'}}>Print sides</label>
                      <select className="input" value={sides} onChange={e=>setSides(e.target.value as 'outside'|'both')}>
                        <option value="outside">Outside only</option>
                        <option value="both">Inside &amp; outside (×2 lam)</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Lamination */}
                <div className="card" style={{padding:'18px 20px',marginBottom:'14px'}}>
                  <div style={{fontSize:'11px',fontWeight:'600',color:'#86868B',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:'12px'}}>Lamination &amp; Finishing</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px',marginBottom:'10px'}}>
                    <div><label style={{display:'block',fontSize:'11px',color:'#86868B',marginBottom:'4px',fontWeight:'500'}}>Lamination {wrapType==='mor'&&<span style={{color:'#FF9F0A'}}>(disabled — Morocco)</span>}</label>
                      <select className="input" value={lam} onChange={e=>setLam(e.target.value as typeof lam)} disabled={wrapType==='mor'}>
                        <option value="none">None</option><option value="gloss">Gloss (Rs3.5/sqft)</option>
                        <option value="matte">Matte (Rs4/sqft)</option><option value="soft">Soft touch (Rs40/sqft)</option>
                      </select>
                    </div>
                    <div><label style={{display:'block',fontSize:'11px',color:'#86868B',marginBottom:'4px',fontWeight:'500'}}>Foiling</label>
                      <select className="input" value={foilEnabled?'yes':'no'} onChange={e=>setFoilEnabled(e.target.value==='yes')}>
                        <option value="no">No foil</option>
                        <option value="yes">Yes — block + foil</option>
                      </select>
                    </div>
                    <div><label style={{display:'block',fontSize:'11px',color:'#86868B',marginBottom:'4px',fontWeight:'500'}}>UV coating</label>
                      <select className="input" value={uvEnabled?'yes':'no'} onChange={e=>setUvEnabled(e.target.value==='yes')}>
                        <option value="no">No UV</option>
                        <option value="yes">Yes — Rs6/sqft</option>
                      </select>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                    <div><label style={{display:'block',fontSize:'11px',color:'#86868B',marginBottom:'4px',fontWeight:'500'}}>Die</label>
                      <select className="input" value={die} onChange={e=>setDie(e.target.value as typeof die)}>
                        <option value="none">No die</option><option value="new">New die</option>
                        <option value="existing">Existing die</option>
                      </select>
                    </div>
                    <div><label style={{display:'block',fontSize:'11px',color:'#86868B',marginBottom:'4px',fontWeight:'500'}}>Pasting / assembly</label>
                      <select className="input" value={paste} onChange={e=>setPaste(e.target.value as typeof paste)}>
                        <option value="none">None</option><option value="auto">Machine (Rs0.70/unit)</option>
                        <option value="hand">Manual (Rs1,000/1k sheets)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                {/* Accessories */}
                <div className="card" style={{padding:'18px 20px',marginBottom:'14px'}}>
                  <div style={{fontSize:'11px',fontWeight:'600',color:'#86868B',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:'12px'}}>Accessories &amp; Inserts</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px'}}>
                    <div><label style={{display:'block',fontSize:'11px',color:'#86868B',marginBottom:'4px',fontWeight:'500'}}>Ribbon (units)</label>
                      <input className="input" type="number" value={ribQty} onChange={e=>setRibQty(e.target.value)}/></div>
                    <div><label style={{display:'block',fontSize:'11px',color:'#86868B',marginBottom:'4px',fontWeight:'500'}}>Magnet sets</label>
                      <input className="input" type="number" value={magQty} onChange={e=>setMagQty(e.target.value)}/></div>
                  </div>
                  <div style={{marginBottom:'10px'}}><label style={{display:'block',fontSize:'11px',color:'#86868B',marginBottom:'4px',fontWeight:'500'}}>EVA foam insert</label>
                    <select className="input" value={foamOn?'yes':'no'} onChange={e=>setFoamOn(e.target.value==='yes')}>
                      <option value="no">None</option><option value="yes">Yes — add foam insert</option>
                    </select>
                  </div>
                  {foamOn && (
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px'}}>
                      <div><label style={{display:'block',fontSize:'11px',color:'#86868B',marginBottom:'4px',fontWeight:'500'}}>Insert L (in)</label>
                        <input className="input" type="number" step="0.125" value={fLins} onChange={e=>setFLins(e.target.value)}/></div>
                      <div><label style={{display:'block',fontSize:'11px',color:'#86868B',marginBottom:'4px',fontWeight:'500'}}>Insert W (in)</label>
                        <input className="input" type="number" step="0.125" value={fWins} onChange={e=>setFWins(e.target.value)}/></div>
                      <div><label style={{display:'block',fontSize:'11px',color:'#86868B',marginBottom:'4px',fontWeight:'500'}}>Thickness</label>
                        <select className="input">
                          <option value="10">10mm</option><option value="25">25mm</option><option value="50">50mm</option>
                        </select>
                      </div>
                    </div>
                  )}
                  <div style={{marginTop:'10px'}}><label style={{display:'block',fontSize:'11px',color:'#86868B',marginBottom:'4px',fontWeight:'500'}}>Scanning / artwork fee (PKR)</label>
                    <input className="input" type="number" value={scan} onChange={e=>setScan(e.target.value)}/></div>
                </div>

                {/* Shipping & margin */}
                <div className="card" style={{padding:'18px 20px',marginBottom:'14px'}}>
                  <div style={{fontSize:'11px',fontWeight:'600',color:'#86868B',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:'12px'}}>Shipping &amp; Margin</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px'}}>
                    <div><label style={{display:'block',fontSize:'11px',color:'#86868B',marginBottom:'4px',fontWeight:'500'}}>Destination</label>
                      <select className="input" value={destination} onChange={e=>setDestination(e.target.value as 'USA'|'UK')}>
                        <option value="USA">USA — auto DHL/JFK</option>
                        <option value="UK">UK — Skynet</option>
                      </select>
                    </div>
                    <div><label style={{display:'block',fontSize:'11px',color:'#86868B',marginBottom:'4px',fontWeight:'500'}}>Customer zip</label>
                      <input className="input" type="text" value={customerZip} onChange={e=>setCustomerZip(e.target.value)} placeholder={destination==='USA'?'e.g. 10001':'Optional'} disabled={destination!=='USA'}/>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px'}}>
                    <div><label style={{display:'block',fontSize:'11px',color:'#86868B',marginBottom:'4px',fontWeight:'500'}}>Boxes per carton</label>
                      <input className="input" type="number" value={bpc} onChange={e=>setBpc(e.target.value)}/></div>
                    <div><label style={{display:'block',fontSize:'11px',color:'#86868B',marginBottom:'4px',fontWeight:'500'}}>Carton weight (kg)</label>
                      <input className="input" type="number" value={cWt} step="0.5" onChange={e=>setCWt(e.target.value)}/></div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px',marginBottom:'10px'}}>
                    <div><label style={{display:'block',fontSize:'11px',color:'#86868B',marginBottom:'4px',fontWeight:'500'}}>Carton L (in)</label>
                      <input className="input" type="number" value={cartonL} step="0.125" onChange={e=>setCartonL(e.target.value)} placeholder={L||'auto'}/></div>
                    <div><label style={{display:'block',fontSize:'11px',color:'#86868B',marginBottom:'4px',fontWeight:'500'}}>Carton W (in)</label>
                      <input className="input" type="number" value={cartonW} step="0.125" onChange={e=>setCartonW(e.target.value)} placeholder={W||'auto'}/></div>
                    <div><label style={{display:'block',fontSize:'11px',color:'#86868B',marginBottom:'4px',fontWeight:'500'}}>Carton H (in)</label>
                      <input className="input" type="number" value={cartonH} step="0.125" onChange={e=>setCartonH(e.target.value)} placeholder={H||'auto'}/></div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                    <div><label style={{display:'block',fontSize:'11px',color:'#86868B',marginBottom:'4px',fontWeight:'500'}}>Sales margin (%)</label>
                      <input className="input" type="number" min="10" max="60" value={prof} onChange={e=>setProf(e.target.value)}/></div>
                    <div><label style={{display:'block',fontSize:'11px',color:'#86868B',marginBottom:'4px',fontWeight:'500'}}>Rush surcharge</label>
                      <select className="input" value={rush} onChange={e=>setRush(e.target.value)}>
                        <option value="0">Standard</option><option value="10">1-week rush (+10%)</option>
                        <option value="20">48-hr rush (+20%)</option><option value="35">Super rush (+35%)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <button className="btn btn-ghost" onClick={()=>setStep(1)}>← Back</button>
              <button className="btn btn-primary" onClick={runCalc}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                Calculate Quote
              </button>
            </div>
          </div>
        )}

        {/* ══ STEP 3 ══ */}
        {step===3 && (
          <div className="fade-up">
            {calcLoading ? (
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'50vh',gap:'16px'}}>
                <div style={{width:'52px',height:'52px',border:'3px solid rgba(255,255,255,0.1)',borderTopColor:'#0A84FF',borderRadius:'50%'}} className="spin"/>
                <div style={{fontSize:'15px',color:'#86868B'}} className="pulse">Calculating the best price for your custom box…</div>
                <div style={{fontSize:'12px',color:'#48484A'}}>Running formula engine · Checking historical patterns · Optimising</div>
              </div>
            ) : results && (
              <>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'22px'}}>
                  <div>
                    <div style={{fontFamily:'var(--font-syne)',fontSize:'22px',fontWeight:'700',letterSpacing:'-.4px',marginBottom:'4px'}}>Quote Result</div>
                    <div style={{fontSize:'13px',color:'#86868B'}}>
                      {L}×{W}×{H}{unit} · {BOX_STYLES.find(s=>s.value===style)?.label} · {tiers.length} tier{tiers.length!==1?'s':''}
                      {customerName && ` · ${customerName}`}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:'8px'}}>
                    <button onClick={()=>downloadQuotePDF(false)} className="btn btn-ghost btn-sm">⬇ Customer PDF</button>
                    <button onClick={()=>downloadQuotePDF(true)} className="btn btn-ghost btn-sm">⬇ Internal PDF</button>
                    <button onClick={saveQuote} disabled={saving} className="btn btn-success btn-sm">
                      {saving ? 'Saving…' : '✓ Save Quote'}
                    </button>
                  </div>
                </div>

                {/* Hero - first tier */}
                <div style={{background:'linear-gradient(135deg,rgba(10,132,255,0.14),rgba(10,132,255,0.04))',border:'0.5px solid rgba(10,132,255,0.25)',borderRadius:'16px',padding:'22px 24px',marginBottom:'14px',position:'relative',overflow:'hidden'}}>
                  <div style={{position:'absolute',top:'-40px',right:'-40px',width:'120px',height:'120px',background:'radial-gradient(circle,rgba(10,132,255,0.15),transparent 70%)',borderRadius:'50%'}}/>
                  <div style={{fontSize:'11px',color:'#0A84FF',fontWeight:'600',letterSpacing:'.5px',textTransform:'uppercase',marginBottom:'6px'}}>
                    {results[0].qty.toLocaleString()} units — selling price
                  </div>
                  <div style={{fontFamily:'var(--font-syne)',fontSize:'44px',fontWeight:'800',letterSpacing:'-2px',lineHeight:'1',marginBottom:'6px'}}>
                    ${results[0].finalUSD.toFixed(2)}
                  </div>
                  <div style={{fontSize:'13px',color:'rgba(255,255,255,0.5)'}}>
                    ${results[0].unitUSD.toFixed(3)}/unit · Rs {Math.round(results[0].finalPKR).toLocaleString()} PKR · {results[0].salesMarginPct}% sales margin
                  </div>
                </div>

                <div className="card" style={{padding:'14px 16px',marginBottom:'14px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'16px'}}>
                    <div style={{minWidth:'170px'}}>
                      <div style={{fontSize:'10px',color:'#48484A',fontWeight:'600',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:'3px'}}>Sales Margin</div>
                      <div style={{fontFamily:'var(--font-syne)',fontSize:'24px',fontWeight:'800'}}>{prof}%</div>
                    </div>
                    <input type="range" min="10" max="60" value={prof} onChange={e=>updateSalesMargin(e.target.value)} style={{flex:1}}/>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',minWidth:'260px'}}>
                      <div>
                        <div style={{fontSize:'10px',color:'#48484A',fontWeight:'600',textTransform:'uppercase',letterSpacing:'.5px'}}>Selling PKR</div>
                        <div style={{fontFamily:'var(--font-dm-mono)',fontSize:'13px',color:'#F5F5F7'}}>Rs {Math.round(results[0].finalPKR).toLocaleString()}</div>
                      </div>
                      <div>
                        <div style={{fontSize:'10px',color:'#48484A',fontWeight:'600',textTransform:'uppercase',letterSpacing:'.5px'}}>Selling USD</div>
                        <div style={{fontFamily:'var(--font-dm-mono)',fontSize:'13px',color:'#0A84FF'}}>${results[0].finalUSD.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginBottom:'14px'}}>

                  {/* Tier pricing table */}
                  <div className="card" style={{padding:'0',overflow:'hidden'}}>
                    <div style={{padding:'12px 16px',background:'rgba(255,255,255,0.04)',borderBottom:'0.5px solid rgba(255,255,255,0.08)',fontSize:'11px',fontWeight:'600',color:'#86868B',textTransform:'uppercase',letterSpacing:'.6px',display:'flex',alignItems:'center',gap:'8px'}}>
                      Multi-Tier Pricing
                      <span style={{background:'#0A84FF',color:'white',fontSize:'9px',fontWeight:'700',padding:'1px 6px',borderRadius:'3px',letterSpacing:'.4px'}}>AUTO</span>
                    </div>
                    <div style={{padding:'12px 16px 4px'}}>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'8px',padding:'6px 0',borderBottom:'0.5px solid rgba(255,255,255,0.08)',fontSize:'10px',fontWeight:'600',color:'#48484A',textTransform:'uppercase',letterSpacing:'.5px'}}>
                        <span>Qty</span><span>Total USD</span><span>Per unit</span><span>Margin</span>
                      </div>
                      {results.map(r=>{
                        const mc = r.margin>=40?'#30D158':r.margin>=30?'#FF9F0A':'#FF453A'
                        return (
                          <div key={r.qty} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'8px',padding:'9px 0',borderBottom:'0.5px solid rgba(255,255,255,0.06)',alignItems:'center'}}>
                            <span style={{fontFamily:'var(--font-dm-mono)',fontSize:'13px',fontWeight:'600'}}>{r.qty.toLocaleString()}</span>
                            <span style={{fontFamily:'var(--font-dm-mono)',fontSize:'13px',color:'#0A84FF',fontWeight:'600'}}>${r.finalUSD.toFixed(2)}</span>
                            <span style={{fontFamily:'var(--font-dm-mono)',fontSize:'12px',color:'#86868B'}}>${r.unitUSD.toFixed(3)}</span>
                            <span style={{fontSize:'12px',fontWeight:'600',color:mc}}>{r.margin.toFixed(0)}%</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Engine outputs */}
                  <div>
                    <div className="card" style={{padding:'14px 16px',marginBottom:'10px'}}>
                      <div style={{fontSize:'11px',fontWeight:'600',color:'#86868B',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:'10px',display:'flex',alignItems:'center',gap:'6px'}}>
                        Engine Output
                        <span style={{background:'#0A84FF',color:'white',fontSize:'9px',fontWeight:'700',padding:'1px 6px',borderRadius:'3px'}}>AUTO</span>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                        {[
                          ['Flat size', `${results[0].flat.fL.toFixed(2)}" × ${results[0].flat.fW.toFixed(2)}"`],
                          ['Machine', results[0].machine.name],
                          ['Sheet size', `${results[0].sheet[0]}×${results[0].sheet[1]}" (${results[0].sheet[2]})`],
                          ['Imposition', `${results[0].ups}-up`],
                          ['Material weight', `${results[0].matKg.toFixed(1)} kg`],
                          ['Ship weight', `${results[0].shipKg.toFixed(0)} kg (${results[0].cartons} ctn)`],
                        ].map(([label,val])=>(
                          <div key={String(label)}>
                            <div style={{fontSize:'10px',color:'#48484A',fontWeight:'500',marginBottom:'2px',textTransform:'uppercase',letterSpacing:'.4px'}}>{label}</div>
                            <div style={{fontSize:'12px',fontFamily:'var(--font-dm-mono)',color:'#0A84FF'}}>{val}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Smart shipping */}
                    {results[0].shipping && (
                      <div className="card" style={{padding:'14px 16px'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
                          <div>
                            <div style={{fontSize:'10px',color:'#48484A',fontWeight:'600',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:'3px'}}>Smart Shipping</div>
                            <div style={{fontFamily:'var(--font-syne)',fontSize:'20px',fontWeight:'800',letterSpacing:'-.5px'}}>{results[0].shipping.selectedCourier}</div>
                          </div>
                          <span className={`badge ${results[0].shipping.savingsPKR && results[0].shipping.savingsPKR > 0 ? 'badge-green' : 'badge-amber'}`}>
                            {results[0].shipping.deliveryDays}
                          </span>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px',marginBottom:results[0].shipping.flag?'8px':'0'}}>
                          {[
                            ['Cost', `Rs ${Math.round(results[0].shipping.selectedRatePKR).toLocaleString()}`],
                            ['Chargeable', `${results[0].shipping.chargeableWeightKg}kg`],
                            ['Vol wt', `${results[0].shipping.volumetricWeightKg.toFixed(1)}kg`],
                            ['Saving', results[0].shipping.savingsPKR ? `Rs ${Math.round(results[0].shipping.savingsPKR).toLocaleString()}` : '—'],
                          ].map(([l,v])=>(
                            <div key={String(l)}>
                              <div style={{fontSize:'10px',color:'#48484A',fontWeight:'600',textTransform:'uppercase',letterSpacing:'.4px'}}>{l}</div>
                              <div style={{fontSize:'12px',fontWeight:'500',fontFamily:'var(--font-dm-mono)',marginTop:'2px'}}>{v}</div>
                            </div>
                          ))}
                        </div>
                        {results[0].shipping.flag && (
                          <div style={{fontSize:'11px',color:'#FF9F0A',background:'rgba(255,159,10,.08)',border:'0.5px solid rgba(255,159,10,.2)',borderRadius:'6px',padding:'7px 9px'}}>
                            {results[0].shipping.flag}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* PKR Breakdown */}
                <div className="card" style={{padding:'0',overflow:'hidden',marginBottom:'14px'}}>
                  <div style={{padding:'12px 16px',background:'rgba(255,255,255,0.04)',borderBottom:'0.5px solid rgba(255,255,255,0.08)',fontSize:'11px',fontWeight:'600',color:'#86868B',textTransform:'uppercase',letterSpacing:'.6px'}}>
                    PKR Cost Breakdown — {results[0].qty.toLocaleString()} units
                    <span style={{background:'#0A84FF',color:'white',fontSize:'9px',fontWeight:'700',padding:'1px 6px',borderRadius:'3px',marginLeft:'8px'}}>ALL AUTO</span>
                  </div>
                  <div style={{padding:'4px 0'}}>
                    {Object.entries(results[0].bk).map(([k,v])=>(
                      <div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 16px',borderBottom:'0.5px solid rgba(255,255,255,0.05)',fontSize:'13px'}}>
                        <span style={{color:'#86868B'}}>{k}</span>
                        <span style={{fontFamily:'var(--font-dm-mono)',fontSize:'12px',color:'#F5F5F7',fontWeight:'400'}}>
                          Rs {Math.round(Number(v)).toLocaleString()}
                        </span>
                      </div>
                    ))}
                    <div style={{display:'flex',justifyContent:'space-between',padding:'9px 16px',fontWeight:'600',fontSize:'13px'}}>
                      <span>Cost total</span>
                      <span style={{fontFamily:'var(--font-dm-mono)'}}>Rs {Math.round(results[0].totalCost).toLocaleString()}</span>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',padding:'9px 16px',borderTop:'0.5px solid rgba(255,255,255,0.06)',fontWeight:'600',fontSize:'13px',color:'#30D158'}}>
                      <span>Sales margin ({results[0].salesMarginPct}%)</span>
                      <span style={{fontFamily:'var(--font-dm-mono)'}}>Rs {Math.round(results[0].salesMarginPKR).toLocaleString()}</span>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',padding:'10px 16px',background:'rgba(255,255,255,0.04)',fontWeight:'600',fontSize:'14px'}}>
                      <span>Selling price PKR</span>
                      <span style={{fontFamily:'var(--font-dm-mono)'}}>Rs {Math.round(results[0].finalPKR).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <button className="btn btn-ghost" onClick={()=>setStep(2)}>← Edit</button>
                  <div style={{display:'flex',gap:'8px'}}>
                    <button onClick={()=>downloadQuotePDF(false)} className="btn btn-ghost">⬇ Customer PDF</button>
                    <button onClick={()=>downloadQuotePDF(true)} className="btn btn-ghost">⬇ Internal PDF</button>
                    <button onClick={saveQuote} disabled={saving} className="btn btn-primary">
                      {saving ? 'Saving…' : '✓ Save & Submit'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

      </main>
    </div>
  )
}
