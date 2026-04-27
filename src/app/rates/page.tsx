'use client'
import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_RATES } from '@/lib/engine'

interface Rate { id: string; key: string; label: string; value: number; unit: string; category: string }

const CATEGORIES = ['stock','board','foam','corrugated','finishing','accessories','currency']

export default function RatesPage() {
  const supabase = createClient()
  const [user, setUser] = useState<{email:string;role:string}|null>(null)
  const [rates, setRates] = useState<Rate[]>([])
  const [edits, setEdits] = useState<Record<string,string>>({})
  const [reasons, setReasons] = useState<Record<string,string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(()=>{
    supabase.auth.getUser().then(({data:{user}})=>{
      if (!user) return
      supabase.from('profiles').select('email,role').eq('id',user.id).single().then(({data})=>{
        setUser({email:user.email||'',role:data?.role||'estimator'})
      })
    })
    supabase.from('rates').select('*').order('category').then(({data})=>{
      if (data) setRates(data)
    })
  },[])

  async function saveRates() {
    setSaving(true)
    const changed = Object.entries(edits).filter(([k,v])=>v&&!isNaN(Number(v)))
    const {data:{user}} = await supabase.auth.getUser()
    for (const [key, newVal] of changed) {
      const rate = rates.find(r=>r.key===key)
      if (!rate || Number(newVal)===rate.value) continue
      await supabase.from('rates').update({value:Number(newVal), updated_at:new Date().toISOString()}).eq('key',key)
      await supabase.from('rate_log').insert({rate_key:key, rate_label:rate.label, old_value:rate.value, new_value:Number(newVal), reason:reasons[key]||'—', changed_by:user?.id})
    }
    const {data} = await supabase.from('rates').select('*').order('category')
    if (data) setRates(data)
    setEdits({}); setReasons({}); setSaving(false); setSaved(true)
    setTimeout(()=>setSaved(false),3000)
  }

  if (!user) return null
  const isAdmin = user.role==='admin'

  return (
    <div style={{display:'flex',minHeight:'100vh'}}>
      <Sidebar userEmail={user.email} userRole={user.role}/>
      <main style={{flex:1,marginLeft:'220px',padding:'32px',overflowY:'auto',maxWidth:'1100px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}>
          <div>
            <div style={{fontFamily:'var(--font-syne)',fontSize:'22px',fontWeight:'700',letterSpacing:'-.4px'}}>Rate Card</div>
            <div style={{fontSize:'13px',color:'#86868B',marginTop:'3px'}}>All changes logged with timestamp and reason</div>
          </div>
          {isAdmin && (
            <button onClick={saveRates} disabled={saving} className={`btn ${saved?'btn-success':'btn-primary'}`}>
              {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Changes'}
            </button>
          )}
        </div>

        {CATEGORIES.map(cat=>{
          const catRates = rates.filter(r=>r.category===cat)
          if (!catRates.length) return null
          const catLabel = {stock:'Paper Stock (PKR/kg)',board:'Rigid Board & Specialty',foam:'EVA Foam',corrugated:'Corrugated',finishing:'Finishing & Assembly',accessories:'Accessories',currency:'Currency Divisors'}[cat]||cat
          return (
            <div key={cat} className="card" style={{padding:'0',overflow:'hidden',marginBottom:'14px'}}>
              <div style={{padding:'12px 18px',background:'rgba(255,255,255,0.04)',borderBottom:'0.5px solid rgba(255,255,255,0.08)',fontSize:'11px',fontWeight:'600',color:'#86868B',textTransform:'uppercase',letterSpacing:'.6px'}}>{catLabel}</div>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{background:'rgba(255,255,255,0.02)'}}>
                    {['Material','Unit','Current rate', isAdmin?'New rate':'', isAdmin?'Reason':''].filter(Boolean).map(h=>(
                      <th key={h} style={{textAlign:'left',padding:'8px 16px',fontSize:'10px',fontWeight:'600',color:'#48484A',borderBottom:'0.5px solid rgba(255,255,255,0.06)',textTransform:'uppercase',letterSpacing:'.5px'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {catRates.map(r=>(
                    <tr key={r.id} style={{borderBottom:'0.5px solid rgba(255,255,255,0.05)'}}>
                      <td style={{padding:'9px 16px',fontSize:'13px'}}>{r.label}</td>
                      <td style={{padding:'9px 16px',fontSize:'11px',color:'#86868B',fontFamily:'var(--font-dm-mono)'}}>{r.unit}</td>
                      <td style={{padding:'9px 16px',fontFamily:'var(--font-dm-mono)',fontSize:'13px',fontWeight:'600',color:'#0A84FF'}}>{r.value}</td>
                      {isAdmin && (
                        <>
                          <td style={{padding:'6px 10px',width:'120px'}}>
                            <input className="input" type="number" step="any" value={edits[r.key]||''} onChange={e=>setEdits(prev=>({...prev,[r.key]:e.target.value}))} placeholder="—" style={{padding:'6px 10px'}}/>
                          </td>
                          <td style={{padding:'6px 10px'}}>
                            <input className="input" type="text" value={reasons[r.key]||''} onChange={e=>setReasons(prev=>({...prev,[r.key]:e.target.value}))} placeholder="reason…" style={{padding:'6px 10px'}}/>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}

        {!isAdmin && (
          <div style={{padding:'14px 18px',background:'rgba(255,159,10,0.08)',border:'0.5px solid rgba(255,159,10,0.2)',borderRadius:'10px',fontSize:'13px',color:'#FF9F0A'}}>
            Rate editing requires Admin access. Contact Mark Ahtesham to update rates.
          </div>
        )}
      </main>
    </div>
  )
}
