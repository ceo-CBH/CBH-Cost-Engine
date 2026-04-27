'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV = [
  { href:'/quote/new', label:'New Quote',     icon:'M12 4v16m8-8H4' },
  { href:'/quotes',    label:'My Quotes',     icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { href:'/dashboard', label:'Dashboard',     icon:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href:'/rates',     label:'Rate Card',     icon:'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
]

export default function Sidebar({ userEmail, userRole }: { userEmail:string; userRole:string }) {
  const path = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside style={{
      width:'220px', flexShrink:0, background:'#111111',
      borderRight:'0.5px solid rgba(255,255,255,0.08)',
      display:'flex', flexDirection:'column',
      padding:'16px 10px', height:'100vh', position:'fixed', left:0, top:0, zIndex:50
    }}>
      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:'9px', padding:'4px 8px', marginBottom:'24px' }}>
        <div style={{ width:'28px', height:'28px', background:'linear-gradient(135deg,#0A84FF,#0055CC)', borderRadius:'7px', display:'grid', placeItems:'center', flexShrink:0, boxShadow:'0 0 14px rgba(10,132,255,0.3)' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="white">
            <rect x="1" y="1" width="6" height="6" rx="1.5"/>
            <rect x="9" y="1" width="6" height="6" rx="1.5"/>
            <rect x="1" y="9" width="6" height="6" rx="1.5"/>
            <rect x="9" y="9" width="6" height="6" rx="1.5"/>
          </svg>
        </div>
        <div>
          <div style={{ fontFamily:'var(--font-syne)', fontSize:'13px', fontWeight:'700', color:'#F5F5F7', letterSpacing:'-0.2px' }}>CBH Price</div>
          <div style={{ fontSize:'10px', color:'#48484A', fontWeight:'500' }}>Engine v6</div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'2px' }}>
        {NAV.map(item => {
          const active = path === item.href || (item.href !== '/dashboard' && path.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href} style={{
              display:'flex', alignItems:'center', gap:'9px', padding:'8px 10px',
              borderRadius:'10px', fontSize:'13px', fontWeight:'500', textDecoration:'none',
              color: active ? '#0A84FF' : '#86868B',
              background: active ? 'rgba(10,132,255,0.1)' : 'transparent',
              border: active ? '0.5px solid rgba(10,132,255,0.2)' : '0.5px solid transparent',
              transition:'all .15s',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon}/>
              </svg>
              {item.label}
            </Link>
          )
        })}
      </div>

      {/* User */}
      <div style={{ borderTop:'0.5px solid rgba(255,255,255,0.08)', paddingTop:'12px' }}>
        <div style={{ padding:'8px 10px', marginBottom:'4px' }}>
          <div style={{ fontSize:'12px', color:'#F5F5F7', fontWeight:'500', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{userEmail}</div>
          <div style={{ fontSize:'10px', color:'#48484A', marginTop:'2px', textTransform:'capitalize' }}>{userRole}</div>
        </div>
        <button onClick={signOut} style={{ width:'100%', display:'flex', alignItems:'center', gap:'9px', padding:'8px 10px', borderRadius:'10px', background:'none', border:'none', cursor:'pointer', color:'#86868B', fontSize:'13px', fontFamily:'inherit' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          Sign out
        </button>
      </div>
    </aside>
  )
}
