'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'signin'|'signup'>('signin')
  const supabase = createClient()

  async function handleGoogle() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` }
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const fn = mode === 'signin'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/auth/callback` } })
    const { error } = await fn
    if (error) { setError(error.message); setLoading(false) }
    else window.location.href = '/dashboard'
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#080808', padding:'20px' }}>
      <div style={{ width:'100%', maxWidth:'400px' }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'40px' }}>
          <div style={{ width:'56px', height:'56px', background:'linear-gradient(135deg,#0A84FF,#0055CC)', borderRadius:'14px', margin:'0 auto 14px', display:'grid', placeItems:'center', boxShadow:'0 0 30px rgba(10,132,255,0.3)' }}>
            <svg width="28" height="28" viewBox="0 0 16 16" fill="white">
              <rect x="1" y="1" width="6" height="6" rx="1.5"/>
              <rect x="9" y="1" width="6" height="6" rx="1.5"/>
              <rect x="1" y="9" width="6" height="6" rx="1.5"/>
              <rect x="9" y="9" width="6" height="6" rx="1.5"/>
            </svg>
          </div>
          <div style={{ fontFamily:'var(--font-syne)', fontSize:'22px', fontWeight:'700', letterSpacing:'-0.5px', color:'#F5F5F7' }}>CBH Price Engine</div>
          <div style={{ fontSize:'13px', color:'#86868B', marginTop:'4px' }}>Custom Boxes Hub</div>
        </div>

        {/* Card */}
        <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'18px', padding:'28px' }}>
          <div style={{ fontSize:'17px', fontWeight:'600', marginBottom:'6px', color:'#F5F5F7' }}>
            {mode === 'signin' ? 'Welcome back' : 'Create account'}
          </div>
          <div style={{ fontSize:'13px', color:'#86868B', marginBottom:'24px' }}>
            {mode === 'signin' ? 'Sign in to continue to CBH Price Engine' : 'Join CBH Price Engine'}
          </div>

          {/* Google */}
          <button onClick={handleGoogle} disabled={loading} className="btn btn-ghost" style={{ width:'100%', justifyContent:'center', marginBottom:'18px', gap:'10px' }}>
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'18px' }}>
            <div style={{ flex:1, height:'0.5px', background:'rgba(255,255,255,0.1)' }}/>
            <span style={{ fontSize:'12px', color:'#48484A' }}>or</span>
            <div style={{ flex:1, height:'0.5px', background:'rgba(255,255,255,0.1)' }}/>
          </div>

          {/* Email form */}
          <form onSubmit={handleEmail}>
            <div style={{ marginBottom:'12px' }}>
              <label style={{ display:'block', fontSize:'12px', color:'#86868B', marginBottom:'5px', fontWeight:'500' }}>Email address</label>
              <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@customboxeshub.com" required/>
            </div>
            <div style={{ marginBottom:'20px' }}>
              <label style={{ display:'block', fontSize:'12px', color:'#86868B', marginBottom:'5px', fontWeight:'500' }}>Password</label>
              <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required/>
            </div>

            {error && (
              <div style={{ background:'rgba(255,69,58,.1)', border:'0.5px solid rgba(255,69,58,.25)', borderRadius:'8px', padding:'10px 12px', fontSize:'12px', color:'#FF453A', marginBottom:'14px' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }}>
              {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div style={{ textAlign:'center', marginTop:'16px', fontSize:'13px', color:'#86868B' }}>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={()=>setMode(mode==='signin'?'signup':'signin')} style={{ background:'none', border:'none', color:'var(--accent)', cursor:'pointer', fontSize:'13px', fontFamily:'inherit' }}>
              {mode === 'signin' ? 'Request access' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
