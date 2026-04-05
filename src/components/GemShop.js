'use client'
import { useState } from 'react'
import { purchaseGemItem } from '@/lib/progressionClient'
import { GEM_SHOP_ITEMS, HEARTS_MAX_CAP } from '@/lib/tokens'
import { getStoredOwnedThemes, setStoredOwnedThemes, unlockStoredTheme } from '@/lib/appThemes'
import { setStoredMaxHearts } from '@/lib/shopStorage'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"
const mono = "'JetBrains Mono','Fira Code',Menlo,monospace"

const ITEMS = [
  {
    id: 'heartRefill', name: 'Heart Refill', cost: 30,
    desc: 'Restore every heart instantly',
    color: '#ef5060',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#ef5060">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    ),
  },
  {
    id: 'heartContainer', name: 'Heart Container', cost: 120,
    desc: 'Permanently increase your max hearts by 1',
    color: '#fb7185',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fb7185" strokeWidth="2" strokeLinecap="round">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        <path d="M12 7v6M9 10h6" stroke="#fff" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    id: 'taskReroll', name: 'Task Reroll Pass', cost: 45,
    desc: 'Swap one unfinished standard task for a fresh valid alternative',
    inventoryKey: 'taskReroll',
    color: '#2dd4bf',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7h11a4 4 0 0 1 4 4v1"/>
        <path d="M18 5l3 3-3 3"/>
        <path d="M21 17H10a4 4 0 0 1-4-4v-1"/>
        <path d="M6 19l-3-3 3-3"/>
      </svg>
    ),
  },
  {
    id: 'reviewShield', name: 'Review Shield', cost: 70,
    desc: 'Delay the next decay alert by one review cycle',
    inventoryKey: 'reviewShield',
    color: '#38bdf8',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l7 4v5c0 5-3.4 8.7-7 10-3.6-1.3-7-5-7-10V7l7-4z"/>
        <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    id: 'recoveryPack', name: 'Recovery Pack', cost: 95,
    desc: 'Full heal now, plus 1 reroll pass for your next push',
    inventoryKey: 'taskReroll',
    color: '#fb7185',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fb7185" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="6" width="16" height="12" rx="3"/>
        <path d="M12 9v6M9 12h6" stroke="#fff" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    id: 'streakFreeze', name: 'Streak Freeze', cost: 50,
    desc: 'Protect your streak for 1 missed day',
    color: '#60A5FA',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z"/>
        <path d="M12 6v4M10 8h4" stroke="#fff" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    id: 'freezeBundle', name: 'Freeze Bundle', cost: 135,
    desc: 'Add 3 streak freezes to your inventory',
    color: '#93c5fd',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round">
        <path d="M8 4h8M12 4v16M5 9l14 6M19 9L5 15"/>
      </svg>
    ),
  },
  {
    id: 'xpBoost', name: 'Double XP', cost: 75,
    desc: '2x XP on all tasks for 15 minutes',
    color: '#FBBF24',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
  },
  {
    id: 'megaXpBoost', name: 'Mega XP Boost', cost: 160,
    desc: '2x XP on all tasks for 60 minutes',
    color: '#f59e0b',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        <path d="M4 4l16 16" stroke="#fff" strokeWidth="1.4"/>
      </svg>
    ),
  },
  {
    id: 'streakRepair', name: 'Streak Repair', cost: 200,
    desc: 'Restore a broken streak (within 24h)',
    color: '#F97316',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    ),
  },
  {
    id: 'themeOcean', name: 'Theme: Ocean', cost: 150,
    desc: 'Blue-themed path map', cosmetic: true,
    color: '#06d6e8',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#06d6e8" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
      </svg>
    ),
  },
  {
    id: 'themeSunset', name: 'Theme: Sunset', cost: 150,
    desc: 'Amber-themed path map', cosmetic: true,
    color: '#FB923C',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FB923C" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
      </svg>
    ),
  },
  {
    id: 'themeForest', name: 'Theme: Forest', cost: 165,
    desc: 'Emerald canopy dashboard and map', cosmetic: true,
    color: '#4ade80',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round">
        <path d="M12 3l5 7H7l5-7z"/><path d="M12 10l6 8H6l6-8z"/><path d="M12 18v3"/>
      </svg>
    ),
  },
  {
    id: 'themeMidnight', name: 'Theme: Midnight', cost: 175,
    desc: 'Indigo neon dashboard and map', cosmetic: true,
    color: '#a78bfa',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round">
        <path d="M20 15.5A7.5 7.5 0 0 1 10.5 6 8.5 8.5 0 1 0 20 15.5z"/><circle cx="16" cy="7" r="1.2" fill="#fff" stroke="none"/>
      </svg>
    ),
  },
  {
    id: 'themeRose', name: 'Theme: Rose', cost: 165,
    desc: 'Soft pink electric dashboard and map', cosmetic: true,
    color: '#f9a8d4',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f9a8d4" strokeWidth="2" strokeLinecap="round">
        <path d="M12 21s-6-3.35-6-9a3 3 0 0 1 6 0 3 3 0 0 1 6 0c0 5.65-6 9-6 9z"/><path d="M9 10h6" stroke="#fff" strokeWidth="1.4"/>
      </svg>
    ),
  },
  {
    id: 'themeAurora', name: 'Theme: Aurora', cost: 180,
    desc: 'Prismatic northern-lights dashboard and map', cosmetic: true,
    color: '#5eead4',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5eead4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 16c2-4 5-6 9-6s7 2 9 6"/>
        <path d="M5 11c2-2 4-3 7-3 4 0 6 2 7 3"/>
        <path d="M8 18h8"/>
      </svg>
    ),
  },
  {
    id: 'themeEmber', name: 'Theme: Ember', cost: 180,
    desc: 'Cinder studio dashboard and map', cosmetic: true,
    color: '#fb923c',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3c2 3 5 4.5 5 8a5 5 0 1 1-10 0c0-2.4 1.2-4.1 5-8z"/>
        <path d="M10 14c.7.8 1.3 1.2 2 1.2.8 0 1.5-.4 2-1.2"/>
      </svg>
    ),
  },
  {
    id: 'themeMonolith', name: 'Theme: Monolith', cost: 185,
    desc: 'Graphite studio dashboard and map', cosmetic: true,
    color: '#e5e7eb',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e5e7eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="7" y="3" width="10" height="18" rx="2"/>
        <path d="M10 8h4M10 12h4M10 16h4" stroke="#94a3b8" strokeWidth="1.4"/>
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

export default function GemShop({ user, goal, gems, goalId, activeTheme, maxHearts, inventoryCounts = {}, onPurchase }) {
  const [buying, setBuying]         = useState(null)
  const [confirm, setConfirm]       = useState(null)
  const [success, setSuccess]       = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [errorMsg, setErrorMsg]     = useState(null)
  const [ownedThemes, setOwnedThemes] = useState(() => {
    try {
      return getStoredOwnedThemes()
    } catch {
      return []
    }
  })

  async function handleBuy(item) {
    if (buying) return
    if (!goalId) {
      setErrorMsg('No active goal selected')
      setConfirm(null)
      return
    }
    setBuying(item.id)
    setErrorMsg(null)
    try {
      const data = await purchaseGemItem({
        user,
        goal: goal || (goalId ? { id: goalId } : null),
        itemId: item.id,
        clientGems: gems,
        clientMaxHearts: maxHearts,
      })
      if (!data.ok) {
        if (Array.isArray(data.ownedThemes)) {
          setStoredOwnedThemes(data.ownedThemes)
          setOwnedThemes(data.ownedThemes)
        }
        setErrorMsg(data.error || 'Purchase failed')
        setBuying(null)
        setConfirm(null)
        return
      }
      if (item.id.startsWith('theme')) {
        const themes = Array.isArray(data.ownedThemes) ? data.ownedThemes : unlockStoredTheme(item.id)
        setStoredOwnedThemes(themes)
        setOwnedThemes(themes)
        // Don't auto-apply — let user choose from the owned themes list
      }
      if (item.id === 'heartContainer' && data.maxHearts) {
        setStoredMaxHearts(data.maxHearts)
      }
      setSuccess(item.id)
      setSuccessMsg(data.effect || 'Purchase complete!')
      setTimeout(() => { setSuccess(null); setSuccessMsg(null) }, 3000)
      onPurchase?.(data)
    } catch {
      setErrorMsg('Network error')
    }
    setBuying(null)
    setConfirm(null)
  }

  return (
    <div style={{maxWidth:600,margin:'0 auto',padding:'20px 20px 0',fontFamily:font}}>
      {/* Header */}
      <div style={{marginBottom:20}}>
        <h2 style={{fontSize:22,fontWeight:800,color:'#F1F5F9',marginBottom:8}}>Gem Shop</h2>
        <div style={{
          display:'inline-flex',alignItems:'center',gap:8,
          padding:'8px 16px',
          background:'rgba(14,245,194,0.06)',
          border:'1px solid rgba(14,245,194,0.18)',
          borderRadius:14,
        }}>
          <GemIcon sz={18}/>
          <span style={{fontSize:20,fontWeight:900,color:'#0ef5c2',fontFamily:mono}}>{gems}</span>
          <span style={{fontSize:13,color:'#475569',fontWeight:600}}>gems available</span>
        </div>
      </div>

      {/* Error */}
      {errorMsg && (
        <div style={{
          marginBottom:12,padding:'10px 14px',
          background:'rgba(239,80,96,0.10)',border:'1px solid rgba(239,80,96,0.22)',
          borderRadius:12,fontSize:13,color:'#ef5060',
        }}>
          {errorMsg}
        </div>
      )}

      {/* Success toast */}
      {successMsg && (
        <div style={{
          marginBottom:12,padding:'12px 16px',
          background:'rgba(14,245,194,0.08)',border:'1px solid rgba(14,245,194,0.25)',
          borderRadius:12,fontSize:14,fontWeight:700,color:'#0ef5c2',
          display:'flex',alignItems:'center',gap:8,
          animation:'fadeUp 0.25s ease both',
        }}>
          <span style={{fontSize:18}}>&#10003;</span>
          {successMsg}
        </div>
      )}

      {/* Items */}
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {ITEMS.map(item => {
          const itemCost = GEM_SHOP_ITEMS[item.id]?.cost ?? item.cost
          const canAfford = gems >= itemCost
          const owned = item.cosmetic && ownedThemes.includes(item.id)
          const isActiveTheme = item.cosmetic && activeTheme === item.id
          const isMaxed = item.id === 'heartContainer' && maxHearts >= HEARTS_MAX_CAP
          const isSuccess = success === item.id
          const isBuying = buying === item.id
          const canBuy = canAfford && !isMaxed && !owned
          const inventoryCount = item.inventoryKey ? Number(inventoryCounts[item.inventoryKey]) || 0 : 0
          const itemDesc = item.id === 'heartRefill'
            ? `Restore all ${maxHearts} hearts instantly`
            : item.id === 'heartContainer'
            ? `Permanently increase your max hearts by 1 (${maxHearts}/${HEARTS_MAX_CAP})`
            : item.id === 'taskReroll'
            ? `${item.desc}${inventoryCount > 0 ? ` (${inventoryCount} ready)` : ''}`
            : item.id === 'reviewShield'
            ? `${item.desc}${inventoryCount > 0 ? ` (${inventoryCount} ready)` : ''}`
            : item.id === 'recoveryPack'
            ? `${item.desc}${inventoryCount > 0 ? ` (${inventoryCount} rerolls ready)` : ''}`
            : item.desc

          return (
            <div key={item.id} style={{
              background: isSuccess ? 'rgba(14,245,194,0.06)' : 'rgba(255,255,255,0.03)',
              border: `1.5px solid ${isSuccess ? 'rgba(14,245,194,0.30)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius:18,padding:'14px 16px',
              display:'flex',alignItems:'center',gap:14,
              transition:'all 0.25s',
            }}>
              {/* Icon */}
              <div style={{
                width:48,height:48,borderRadius:14,
                background:`${item.color}14`,
                border:`1px solid ${item.color}30`,
                display:'flex',alignItems:'center',justifyContent:'center',
                flexShrink:0,
              }}>
                {item.icon}
              </div>

              {/* Info */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:15,fontWeight:700,color:'#F1F5F9',marginBottom:2}}>{item.name}</div>
                <div style={{fontSize:12,color:'#475569',lineHeight:1.4}}>{itemDesc}</div>
                {item.inventoryKey && inventoryCount > 0 && (
                  <div style={{marginTop:6}}>
                    <span style={{
                      display:'inline-flex',alignItems:'center',gap:5,
                      padding:'4px 8px',borderRadius:9999,
                      background:'rgba(14,245,194,0.08)',border:'1px solid rgba(14,245,194,0.18)',
                      fontSize:10,fontWeight:800,color:'#0ef5c2',letterSpacing:'0.08em',textTransform:'uppercase',
                    }}>
                      {inventoryCount} in inventory
                    </span>
                  </div>
                )}
              </div>

              {/* Action */}
              <div style={{flexShrink:0}}>
                {owned ? (
                  <div style={{
                    padding:'8px 14px',borderRadius:10,
                    background:'rgba(14,245,194,0.06)',border:'1px solid rgba(14,245,194,0.18)',
                    fontSize:12,fontWeight:700,color:'#0ef5c2',
                  }}>
                    {isActiveTheme ? 'Applied' : 'Owned'}
                  </div>
                ) : isMaxed ? (
                  <div style={{
                    padding:'8px 14px',borderRadius:10,
                    background:'rgba(251,113,133,0.08)',border:'1px solid rgba(251,113,133,0.20)',
                    fontSize:12,fontWeight:700,color:'#fb7185',
                  }}>
                    Maxed
                  </div>
                ) : confirm === item.id ? (
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={() => setConfirm(null)} style={{
                      padding:'8px 12px',background:'rgba(255,255,255,0.05)',
                      border:'1px solid rgba(255,255,255,0.10)',borderRadius:10,
                      color:'#94A3B8',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:font,
                    }}>No</button>
                    <button onClick={() => handleBuy(item)} disabled={isBuying} style={{
                      padding:'8px 14px',
                      background:'linear-gradient(135deg,#0ef5c2,#00d4ff)',
                      border:'none',borderRadius:10,
                      color:'#06060f',fontSize:12,fontWeight:800,
                      cursor:isBuying?'default':'pointer',fontFamily:font,
                      display:'flex',alignItems:'center',justifyContent:'center',gap:4,
                    }}>
                      {isBuying ? (
                        <div style={{width:12,height:12,border:'2px solid rgba(0,0,0,0.1)',borderTopColor:'#06060f',borderRadius:'50%',animation:'spin 0.65s linear infinite'}}/>
                      ) : 'Buy'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => canBuy ? setConfirm(item.id) : null}
                    disabled={!canBuy}
                    style={{
                      padding:'8px 16px',borderRadius:10,
                      background: canBuy ? `${item.color}14` : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${canBuy ? `${item.color}30` : 'rgba(255,255,255,0.06)'}`,
                      color: canBuy ? item.color : '#334155',
                      fontSize:13,fontWeight:700,cursor:canBuy?'pointer':'default',
                      fontFamily:font,display:'flex',alignItems:'center',gap:5,
                      opacity: canBuy ? 1 : 0.5,
                      transition:'all 0.15s',
                    }}
                  >
                    <GemIcon sz={13}/>
                    {itemCost}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* How to earn */}
      <div style={{
        marginTop:20,padding:'14px 16px',
        background:'rgba(255,255,255,0.02)',
        border:'1px solid rgba(255,255,255,0.06)',
        borderRadius:16,
      }}>
        <div style={{fontSize:11,fontWeight:700,color:'#475569',textTransform:'uppercase',letterSpacing:'1px',marginBottom:10}}>
          How to earn gems
        </div>
        {[
          { label: 'Complete any task', amount: '+5' },
          { label: 'Complete all daily tasks', amount: '+15' },
          { label: 'Every 7-day streak milestone', amount: '+25' },
          { label: 'Treasure chests (random)', amount: '+5–50' },
          { label: 'Quests and weekly challenges', amount: 'Bonus' },
        ].map((r, i) => (
          <div key={i} style={{
            display:'flex',justifyContent:'space-between',alignItems:'center',
            padding:'6px 0',
            borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
          }}>
            <span style={{fontSize:13,color:'#94A3B8'}}>{r.label}</span>
            <span style={{fontSize:13,fontWeight:700,color:'#0ef5c2',fontFamily:mono}}>{r.amount}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
