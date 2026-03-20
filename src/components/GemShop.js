'use client'
import { useState } from 'react'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"
const mono = "'JetBrains Mono','Fira Code',Menlo,monospace"

const ITEMS = [
  {
    id: 'streakFreeze', name: 'Streak Freeze', cost: 50,
    desc: 'Protect your streak for 1 missed day',
    color: '#60A5FA', gradient: 'linear-gradient(135deg,#60A5FA,#3B82F6)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z"/>
        <path d="M12 6v4M10 8h4" stroke="#fff" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    id: 'heartRefill', name: 'Heart Refill', cost: 30,
    desc: 'Restore all 5 hearts instantly',
    color: '#ef5060', gradient: 'linear-gradient(135deg,#ef5060,#dc2626)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#ef5060">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    ),
  },
  {
    id: 'xpBoost', name: 'Double XP', cost: 75,
    desc: '2x XP on all tasks for 15 minutes',
    color: '#FBBF24', gradient: 'linear-gradient(135deg,#FBBF24,#F59E0B)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
  },
  {
    id: 'streakRepair', name: 'Streak Repair', cost: 200,
    desc: 'Restore a broken streak (within 24h)',
    color: '#F97316', gradient: 'linear-gradient(135deg,#F97316,#EA580C)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    ),
  },
  {
    id: 'themeOcean', name: 'Theme: Ocean', cost: 150,
    desc: 'Blue-themed path map', cosmetic: true,
    color: '#06d6e8', gradient: 'linear-gradient(135deg,#06d6e8,#0891B2)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#06d6e8" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
      </svg>
    ),
  },
  {
    id: 'themeSunset', name: 'Theme: Sunset', cost: 150,
    desc: 'Amber-themed path map', cosmetic: true,
    color: '#FB923C', gradient: 'linear-gradient(135deg,#FB923C,#EA580C)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FB923C" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
      </svg>
    ),
  },
]

function GemIcon({ sz = 18 }) {
  return (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
      <path d="M6 3L2 9l10 12L22 9l-4-6H6z" fill="#0ef5c2" opacity="0.85"/>
      <path d="M12 3l-2 6h4l-2-6z" fill="#fff" opacity="0.25"/>
      <path d="M6 3L2 9l10 12L22 9l-4-6H6z" stroke="#0ef5c2" strokeWidth="1.5" fill="none"/>
    </svg>
  )
}

export default function GemShop({ gems, goalId, onClose, onPurchase }) {
  const [buying, setBuying]         = useState(null)
  const [confirm, setConfirm]       = useState(null)
  const [success, setSuccess]       = useState(null)
  const [errorMsg, setErrorMsg]     = useState(null)

  const ownedThemes = (() => {
    try { return JSON.parse(localStorage.getItem('pathai.ownedThemes') || '[]') } catch { return [] }
  })()

  async function handleBuy(item) {
    if (buying) return
    setBuying(item.id)
    setErrorMsg(null)
    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      const token = session?.access_token || null
      const res = await fetch('/api/gem-purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ goalId, itemId: item.id, accessToken: token }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Purchase failed')
        setBuying(null)
        setConfirm(null)
        return
      }
      // Save cosmetic purchases locally
      if (item.id.startsWith('theme')) {
        const themes = [...ownedThemes, item.id]
        localStorage.setItem('pathai.ownedThemes', JSON.stringify(themes))
      }
      setSuccess(item.id)
      setTimeout(() => setSuccess(null), 2000)
      onPurchase(data)
    } catch {
      setErrorMsg('Network error')
    }
    setBuying(null)
    setConfirm(null)
  }

  return (
    <>
      <style>{`
        @keyframes shopSlideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes shopFadeIn{from{opacity:0}to{opacity:1}}
        @keyframes shopSuccessFlash{0%{box-shadow:0 0 0 0 rgba(14,245,194,0.4)}100%{box-shadow:0 0 0 0 transparent}}
        @media (prefers-reduced-motion:reduce){
          @keyframes shopSlideUp{from{opacity:0}to{opacity:1}}
        }
      `}</style>

      {/* Backdrop */}
      <div onClick={onClose} style={{
        position:'fixed',inset:0,zIndex:300,
        background:'rgba(0,0,0,0.70)',backdropFilter:'blur(14px)',WebkitBackdropFilter:'blur(14px)',
        animation:'shopFadeIn 0.2s ease both',
      }}/>

      {/* Panel */}
      <div style={{
        position:'fixed',bottom:0,left:0,right:0,zIndex:301,
        maxHeight:'88vh',overflowY:'auto',
        background:'linear-gradient(180deg,#0d0d1a 0%,#080814 100%)',
        borderRadius:'24px 24px 0 0',
        border:'1px solid rgba(255,255,255,0.10)',borderBottom:'none',
        fontFamily:font,
        animation:'shopSlideUp 0.3s cubic-bezier(0.16,1,0.3,1) both',
      }}>
        {/* Drag handle */}
        <div style={{width:36,height:4,borderRadius:9999,background:'rgba(255,255,255,0.15)',margin:'12px auto 0'}}/>

        {/* Header */}
        <div style={{padding:'16px 22px 12px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <h2 style={{fontSize:20,fontWeight:800,color:'#F1F5F9',marginBottom:4}}>Gem Shop</h2>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <GemIcon sz={16}/>
              <span style={{fontSize:16,fontWeight:800,color:'#0ef5c2',fontFamily:mono}}>{gems}</span>
              <span style={{fontSize:12,color:'#475569',fontWeight:600}}>available</span>
            </div>
          </div>
          <button onClick={onClose} style={{
            width:36,height:36,background:'rgba(255,255,255,0.07)',
            border:'1px solid rgba(255,255,255,0.10)',borderRadius:10,
            display:'flex',alignItems:'center',justifyContent:'center',
            cursor:'pointer',color:'#8e8e93',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Error */}
        {errorMsg && (
          <div style={{margin:'0 22px 12px',padding:'10px 14px',background:'rgba(239,80,96,0.10)',border:'1px solid rgba(239,80,96,0.22)',borderRadius:12,fontSize:13,color:'#ef5060'}}>
            {errorMsg}
          </div>
        )}

        {/* Items grid */}
        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))',
          gap:12,padding:'0 22px 32px',
        }}>
          {ITEMS.map(item => {
            const canAfford = gems >= item.cost
            const owned = item.cosmetic && ownedThemes.includes(item.id)
            const isSuccess = success === item.id
            const isBuying = buying === item.id

            return (
              <div key={item.id} style={{
                background: isSuccess ? 'rgba(14,245,194,0.06)' : 'rgba(255,255,255,0.03)',
                border: `1.5px solid ${isSuccess ? 'rgba(14,245,194,0.30)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius:18,padding:'16px',
                display:'flex',flexDirection:'column',gap:12,
                transition:'all 0.25s',
              }}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{
                    width:44,height:44,borderRadius:14,
                    background:item.gradient,opacity:0.18,position:'absolute',
                  }}/>
                  <div style={{
                    width:44,height:44,borderRadius:14,
                    background:`${item.color}14`,
                    border:`1px solid ${item.color}30`,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    flexShrink:0,
                  }}>
                    {item.icon}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:700,color:'#F1F5F9'}}>{item.name}</div>
                    <div style={{fontSize:12,color:'#475569',lineHeight:1.4}}>{item.desc}</div>
                  </div>
                </div>

                {owned ? (
                  <div style={{
                    padding:'10px',borderRadius:12,textAlign:'center',
                    background:'rgba(14,245,194,0.06)',border:'1px solid rgba(14,245,194,0.18)',
                    fontSize:13,fontWeight:700,color:'#0ef5c2',
                  }}>
                    ✓ Owned
                  </div>
                ) : confirm === item.id ? (
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    <div style={{fontSize:12,color:'#94A3B8',textAlign:'center'}}>
                      Spend <span style={{color:'#0ef5c2',fontWeight:700}}>{item.cost}</span> gems on {item.name}?
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={() => setConfirm(null)} style={{
                        flex:1,padding:'10px',background:'rgba(255,255,255,0.05)',
                        border:'1px solid rgba(255,255,255,0.10)',borderRadius:12,
                        color:'#94A3B8',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:font,
                      }}>Cancel</button>
                      <button onClick={() => handleBuy(item)} disabled={isBuying} style={{
                        flex:1,padding:'10px',
                        background:'linear-gradient(135deg,#0ef5c2,#00d4ff)',
                        border:'none',borderRadius:12,
                        color:'#06060f',fontSize:13,fontWeight:800,
                        cursor:isBuying?'default':'pointer',fontFamily:font,
                        display:'flex',alignItems:'center',justifyContent:'center',gap:6,
                      }}>
                        {isBuying ? (
                          <div style={{width:14,height:14,border:'2px solid rgba(0,0,0,0.1)',borderTopColor:'#06060f',borderRadius:'50%',animation:'spin 0.65s linear infinite'}}/>
                        ) : 'Confirm'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => canAfford ? setConfirm(item.id) : null}
                    disabled={!canAfford}
                    style={{
                      padding:'10px',borderRadius:12,
                      background: canAfford ? `${item.color}14` : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${canAfford ? `${item.color}30` : 'rgba(255,255,255,0.06)'}`,
                      color: canAfford ? item.color : '#334155',
                      fontSize:13,fontWeight:700,cursor:canAfford?'pointer':'default',
                      fontFamily:font,display:'flex',alignItems:'center',justifyContent:'center',gap:6,
                      transition:'all 0.15s',
                      opacity: canAfford ? 1 : 0.6,
                    }}
                  >
                    <GemIcon sz={14}/>
                    {canAfford ? item.cost : `${item.cost} (need ${item.cost - gems} more)`}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
