import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'

export default async function QuotesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: quotes } = await supabase
    .from('quotes')
    .select('*, quote_tiers(*)')
    .order('created_at', { ascending: false })

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      <Sidebar userEmail={user.email||''} userRole={profile?.role||'estimator'}/>
      <main style={{ flex:1, marginLeft:'220px', padding:'32px', overflowY:'auto' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
          <div>
            <div style={{ fontFamily:'var(--font-syne)', fontSize:'22px', fontWeight:'700', letterSpacing:'-.4px' }}>Saved Quotes</div>
            <div style={{ fontSize:'13px', color:'#86868B', marginTop:'3px' }}>Historical rates locked at save time</div>
          </div>
          <Link href="/quote/new" className="btn btn-primary btn-sm">+ New Quote</Link>
        </div>

        {!quotes?.length ? (
          <div style={{ textAlign:'center', padding:'60px', color:'#48484A' }}>
            <div style={{ fontSize:'32px', marginBottom:'12px' }}>📦</div>
            <div style={{ fontSize:'15px', fontWeight:'500', marginBottom:'6px' }}>No quotes yet</div>
            <div style={{ fontSize:'13px', marginBottom:'18px' }}>Create your first quote to get started</div>
            <Link href="/quote/new" className="btn btn-primary">Create first quote</Link>
          </div>
        ) : (
          <div style={{ display:'grid', gap:'10px' }}>
            {quotes.map(q => {
              const tiers = q.quote_tiers || []
              const first = tiers[0]
              const statusColor = q.status==='approved'?'#30D158':q.status==='pending'?'#FF9F0A':q.status==='rejected'?'#FF453A':'#86868B'
              return (
                <div key={q.id} className="card" style={{ padding:'16px 20px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
                      <span style={{ fontFamily:'var(--font-dm-mono)', fontSize:'14px', fontWeight:'600' }}>#{q.quote_number}</span>
                      <span className="badge badge-grey" style={{ fontSize:'11px', textTransform:'capitalize' }}>{q.box_style}</span>
                      <span style={{ fontSize:'12px', color:statusColor, fontWeight:'500', textTransform:'capitalize' }}>{q.status}</span>
                      {q.customer_name && <span style={{ fontSize:'12px', color:'#86868B' }}>{q.customer_name}</span>}
                    </div>
                    <div style={{ textAlign:'right' }}>
                      {first && <div style={{ fontFamily:'var(--font-syne)', fontSize:'20px', fontWeight:'700', color:'#0A84FF', letterSpacing:'-.5px' }}>${Number(first.total_usd).toFixed(2)}</div>}
                      {first && <div style={{ fontSize:'11px', color:'#86868B', marginTop:'1px' }}>${Number(first.unit_usd).toFixed(3)}/unit · {Number(first.margin_pct).toFixed(1)}% margin</div>}
                    </div>
                  </div>
                  <div style={{ fontSize:'12px', color:'#86868B', marginBottom:'10px' }}>
                    {q.finish_l}×{q.finish_w}×{q.finish_h}{q.unit} · GSM {q.gsm}
                    {q.machine_used && ` · ${q.machine_used}`}
                    {q.sheet_size && ` · Sheet ${q.sheet_size}`}
                    &nbsp;·&nbsp;{new Date(q.created_at).toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'})}
                  </div>
                  {tiers.length > 0 && (
                    <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                      {tiers.map((t: {qty:number;total_usd:number;margin_pct:number}) => {
                        const mc = Number(t.margin_pct)>=40?'badge-green':Number(t.margin_pct)>=30?'badge-amber':'badge-red'
                        return (
                          <span key={t.qty} className={`badge ${mc}`} style={{ fontFamily:'var(--font-dm-mono)', fontSize:'11px' }}>
                            {Number(t.qty).toLocaleString()} → ${Number(t.total_usd).toFixed(0)}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
