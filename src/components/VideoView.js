'use client'
import { useState } from 'react'

function extractYouTubeId(url) {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes('youtube.com')) return parsed.searchParams.get('v')
    if (parsed.hostname === 'youtu.be') return parsed.pathname.slice(1).split('?')[0]
  } catch {}
  return null
}

export default function VideoView({ task, goal, onClose, onComplete }) {
  const [watched, setWatched] = useState(false)

  const ytId = extractYouTubeId(task.resourceUrl)
  const searchQuery = encodeURIComponent(`${task.title} ${goal} tutorial`)
  const ytSearchUrl = `https://www.youtube.com/results?search_query=${searchQuery}`
  const embedSrc = ytId ? `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1` : null

  const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"

  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin    { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{
        position:'fixed', inset:0, zIndex:200,
        background:'linear-gradient(180deg,#06060f 0%,#080814 100%)',
        fontFamily: font,
        display:'flex', flexDirection:'column',
        overflow:'hidden',
      }}>

        {/* Top bar */}
        <div style={{
          padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between',
          borderBottom:'1px solid rgba(255,255,255,0.08)',
          background:'rgba(6,6,15,0.88)', backdropFilter:'blur(28px)',
        }}>
          <button onClick={onClose} style={{
            width:36, height:36, background:'rgba(255,255,255,0.07)',
            border:'1px solid rgba(255,255,255,0.10)', borderRadius:10,
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', color:'#8e8e93',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ padding:'4px 12px', background:'rgba(251,191,36,0.10)', border:'1px solid rgba(251,191,36,0.25)', borderRadius:9999, fontSize:11, fontWeight:700, color:'#FBBF24', textTransform:'uppercase', letterSpacing:'1px' }}>
              Video
            </div>
          </div>
          <div style={{width:36}}/>
        </div>

        {/* Content */}
        <div style={{ flex:1, overflow:'auto', padding:'20px 20px 120px' }}>
          <div style={{ maxWidth:680, margin:'0 auto' }}>

            {/* Title */}
            <h1 style={{ fontSize:24, fontWeight:800, color:'#f5f5f7', letterSpacing:'-0.5px', marginBottom:8 }}>
              {task.title}
            </h1>
            {task.description && (
              <p style={{ fontSize:14, color:'#636366', lineHeight:1.6, marginBottom:20 }}>
                {task.description}
              </p>
            )}

            {/* Video */}
            {embedSrc ? (
              <div style={{ borderRadius:18, overflow:'hidden', border:'1px solid rgba(255,255,255,0.10)', marginBottom:20, boxShadow:'0 16px 48px rgba(0,0,0,0.40)', aspectRatio:'16/9', position:'relative' }}>
                <iframe
                  src={embedSrc}
                  title={task.title}
                  style={{ width:'100%', height:'100%', border:'none', display:'block' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  onLoad={() => setWatched(true)}
                />
              </div>
            ) : (
              <a href={task.resourceUrl || ytSearchUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration:'none' }}>
                <div style={{
                  borderRadius:18, overflow:'hidden', border:'1px solid rgba(251,191,36,0.20)',
                  marginBottom:20, background:'rgba(251,191,36,0.04)',
                  display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                  padding:'48px 24px', gap:16, cursor:'pointer',
                }}>
                  <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(251,191,36,0.10)', border:'1px solid rgba(251,191,36,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:15, fontWeight:700, color:'#FBBF24', marginBottom:4 }}>Watch on YouTube</div>
                    <div style={{ fontSize:13, color:'#636366' }}>"{task.title}"</div>
                  </div>
                </div>
              </a>
            )}

            {/* Key points callout */}
            <div style={{ padding:'16px 18px', background:'rgba(251,191,36,0.05)', border:'1px solid rgba(251,191,36,0.15)', borderRadius:16, marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#FBBF24', textTransform:'uppercase', letterSpacing:'1px', marginBottom:8 }}>
                What to look for
              </div>
              <ul style={{ margin:0, paddingLeft:18, color:'#8e8e93', fontSize:14, lineHeight:1.8 }}>
                <li>How the concept is introduced and defined</li>
                <li>Real-world examples or analogies used</li>
                <li>Any steps or formulas demonstrated</li>
                <li>Common mistakes the instructor mentions</li>
              </ul>
            </div>

          </div>
        </div>

        {/* Bottom nav */}
        <div style={{ padding:'14px 20px 30px', borderTop:'1px solid rgba(255,255,255,0.08)', background:'rgba(6,6,15,0.90)', backdropFilter:'blur(28px)' }}>
          <div style={{ maxWidth:680, margin:'0 auto', display:'flex', gap:12 }}>
            <button onClick={onClose} style={{ padding:'14px 24px', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:16, color:'#8e8e93', fontSize:15, fontWeight:600, cursor:'pointer', fontFamily:font }}>
              Back
            </button>
            <button onClick={() => { setWatched(true); onComplete() }} style={{
              flex:1, padding:'14px', background:'linear-gradient(135deg,#0ef5c2,#00d4ff)',
              border:'none', borderRadius:16, color:'#06060f', fontSize:16, fontWeight:700,
              cursor:'pointer', fontFamily:font, boxShadow:'0 0 32px rgba(14,245,194,0.28)',
            }}>
              {watched ? 'Complete ✓' : 'Mark as Watched'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
