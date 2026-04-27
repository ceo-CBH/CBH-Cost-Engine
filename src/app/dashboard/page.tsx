import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: quotes } = await supabase.from('quotes').select('*, quote_tiers(*)').order('created_at', { ascending: false }).limit(10)
  const { data: allQuotes } = await supabase.from('quotes').select('id, status')

  const total    = allQuotes?.length || 0
  const approved = allQuotes?.filter(q=>q.status==='approved').length || 0
  const pending  = allQuotes?.filter(q=>q.status==='pending').length || 0

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      <Sidebar userEmail={user.email||''} userRole={profile?.role||'estimator'}/>

      <main style={{ flex:1, marginLeft:'220px', padding:'32px', overflowY:'auto' }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'28px' }}>
          <div>
            <div style={{ fontFamily:'var(--font-syne)', fontSize:'24px', fontWeight:'700', letterSpacing:'-0.5px', marginBottom:'4px' }}>
              Good morning 👋
            </div>
            <div style={{ fontSize:'14px', color:'#86868B' }}>Here&apos;s what&apos;s happening with CBH pricing today</div>
          </div>
          <Link href="/quote/new" className="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Quote
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'24px' }}>
          {[
            { label:'Total Quotes',   value: total,    color:'#F5F5F7' },
            { label:'Approved',       value: approved, color:'#30D158' },
            { label:'Pending Review', value: pending,  color:'#FF9F0A' },
            { label:'Conversion',     value: total ? `${Math.round(approved/total*100)}%` : '—', color:'#0A84FF' },
          ].map(s=>(
            <div key={s.label} className="card" style={{ padding:'16px 18px' }}>
              <div style={{ fontSize:'12px', color:'#86868B', marginBottom:'6px', fontWeight:'500' }}>{s.label}</div>
              <div style={{ fontFamily:'var(--font-syne)', fontSize:'26px', fontWeight:'700', color:s.color, letterSpacing:'-1px' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Quick action cards */}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'12px', marginBottom:'24px' }}>
          <div className="card" style={{ padding:'20px 22px', background:'linear-gradient(135deg,rgba(10,132,255,0.12),rgba(10,132,255,0.04))', borderColor:'rgba(10,132,255,0.2)' }}>
            <div style={{ fontFamily:'var(--font-syne)', fontSize:'18px', fontWeight:'700', marginBottom:'6px' }}>Create a quote</div>
            <div style={{ fontSize:'13px', color:'#86868B', marginBottom:'14px' }}>Enter box dimensions, select finishing, get instant pricing across all quantity tiers</div>
            <Link href="/quote/new" className="btn btn-primary btn-sm">Start new quote →</Link>
          </div>
          <div className="card" style={{ padding:'20px 22px' }}>
            <div style={{ fontFamily:'var(--font-syne)', fontSize:'15px', fontWeight:'600', marginBottom:'6px' }}>Rate Card</div>
            <div style={{ fontSize:'12px', color:'#86868B', marginBottom:'14px' }}>Material rates, lam costs, currency divisor — all admin editable</div>
            <Link href="/rates" className="btn btn-ghost btn-sm">Manage rates →</Link>
          </div>
        </div>

        {/* Recent quotes */}
        <div className="card" style={{ padding:'0', overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'0.5px solid rgba(255,255,255,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:'13px', fontWeight:'600', color:'#86868B', textTransform:'uppercase', letterSpacing:'.6px' }}>Recent Quotes</div>
            <Link href="/quotes" style={{ fontSize:'12px', color:'var(--accent)', textDecoration:'none' }}>View all</Link>
          </div>
          {!quotes?.length ? (
            <div style={{ padding:'40px', textAlign:'center', color:'#48484A', fontSize:'13px' }}>No quotes yet. Create your first quote above.</div>
          ) : (
            quotes.slice(0,8).map(q => {
              const firstTier = q.quote_tiers?.[0]
              const statusColor = q.status==='approved'?'#30D158':q.status==='pending'?'#FF9F0A':q.status==='rejected'?'#FF453A':'#86868B'
              return (
                <Link key={q.id} href={`/quotes/${q.id}`} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 18px', borderBottom:'0.5px solid rgba(255,255,255,0.06)', textDecoration:'none', transition:'background .15s' }}>
                  <div>
                    <div style={{ fontSize:'13px', fontWeight:'600', color:'#F5F5F7', fontFamily:'var(--font-dm-mono)' }}>#{q.quote_number}</div>
                    <div style={{ fontSize:'11px', color:'#86868B', marginTop:'2px' }}>
                      {q.finish_l}×{q.finish_w}×{q.finish_h}{q.unit} · {q.box_style}
                      {q.customer_name ? ` · ${q.customer_name}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    {firstTier && <div style={{ fontSize:'14px', fontWeight:'600', color:'#0A84FF', fontFamily:'var(--font-dm-mono)' }}>${Number(firstTier.total_usd).toFixed(2)}</div>}
                    <div style={{ fontSize:'11px', color:statusColor, marginTop:'2px', textTransform:'capitalize', fontWeight:'500' }}>{q.status}</div>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
