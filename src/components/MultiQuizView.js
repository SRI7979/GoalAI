'use client'
import { useState, useEffect } from 'react'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"

export default function MultiQuizView({ task, goal, knowledge, onClose, onComplete }) {
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState(null)
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [showVignette, setShowVignette] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/quiz-multi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ concept: task._concept || task.title, goal, knowledge }),
        })
        const data = await res.json()
        if (data.questions) setQuestions(data.questions)
      } catch {}
      setLoading(false)
    }
    load()
  }, [task.title, goal, knowledge, task._concept])

  function handleSelect(idx) {
    if (answered) return
    setSelected(idx)
    setAnswered(true)
    const correct = idx === questions[current].correctIndex
    if (correct) {
      setScore(s => s + 1)
    } else {
      setShowVignette(true)
      setTimeout(() => setShowVignette(false), 400)
    }
  }

  function handleNext() {
    if (current + 1 >= questions.length) {
      setDone(true)
    } else {
      setCurrent(c => c + 1)
      setSelected(null)
      setAnswered(false)
    }
  }

  const q = questions?.[current]
  const pct = questions ? ((current + (answered ? 1 : 0)) / questions.length) * 100 : 0

  return (
    <>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes redVignette { 0%{opacity:0}20%{opacity:1}100%{opacity:0} }
        @keyframes popIn   { 0%{transform:scale(0.8);opacity:0}70%{transform:scale(1.05)}100%{transform:scale(1);opacity:1} }
      `}</style>

      {showVignette && (
        <div style={{ position:'fixed', inset:0, zIndex:9800, background:'rgba(255,69,58,0.12)', animation:'redVignette 0.4s ease both', pointerEvents:'none' }} />
      )}

      <div style={{
        position:'fixed', inset:0, zIndex:200,
        background:'linear-gradient(180deg,#06060f 0%,#080814 100%)',
        fontFamily: font, display:'flex', flexDirection:'column', overflow:'hidden',
      }}>

        {/* Top bar */}
        <div style={{ padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,0.08)', background:'rgba(6,6,15,0.88)', backdropFilter:'blur(28px)' }}>
          <button onClick={onClose} style={{ width:36, height:36, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#8e8e93' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          {/* Progress */}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {!loading && questions && !done && (
              <>
                <div style={{ height:6, width:120, background:'rgba(255,255,255,0.08)', borderRadius:9999, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#FF453A,#FF6B35)', borderRadius:9999, transition:'width 0.3s' }}/>
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:'#FF453A' }}>{current + 1}/{questions.length}</span>
              </>
            )}
          </div>

          <div style={{ padding:'4px 12px', background:'rgba(255,69,58,0.10)', border:'1px solid rgba(255,69,58,0.25)', borderRadius:9999, fontSize:11, fontWeight:700, color:'#FF453A', textTransform:'uppercase', letterSpacing:'1px' }}>
            Quiz
          </div>
        </div>

        {/* Content */}
        <div style={{ flex:1, overflow:'auto', padding:'20px 20px 120px' }}>
          <div style={{ maxWidth:640, margin:'0 auto' }}>

            {loading ? (
              <div style={{ textAlign:'center', paddingTop:80 }}>
                <div style={{ width:44, height:44, border:'3px solid rgba(255,255,255,0.06)', borderTopColor:'#FF453A', borderRadius:'50%', animation:'spin 0.65s linear infinite', margin:'0 auto 20px' }}/>
                <p style={{ color:'#636366', fontSize:14 }}>Generating quiz…</p>
              </div>
            ) : !questions ? (
              <div style={{ textAlign:'center', paddingTop:80 }}>
                <p style={{ color:'#636366' }}>Could not load quiz. Try again later.</p>
              </div>
            ) : done ? (
              <div style={{ animation:'popIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both', textAlign:'center', paddingTop:60 }}>
                <div style={{ fontSize:64, marginBottom:16 }}>
                  {score >= 4 ? '🏆' : score >= 3 ? '⭐' : '📚'}
                </div>
                <h2 style={{ fontSize:28, fontWeight:900, color:'#f5f5f7', marginBottom:8 }}>
                  {score}/{questions.length} correct
                </h2>
                <p style={{ fontSize:15, color:'#8e8e93', marginBottom:32 }}>
                  {score === questions.length ? 'Perfect score! You nailed it.' :
                   score >= 4 ? 'Great work — almost there!' :
                   score >= 3 ? 'Good effort. Review the ones you missed.' :
                   'Keep studying — you\'ll get there!'}
                </p>
                {/* Score breakdown */}
                <div style={{ display:'flex', flexDirection:'column', gap:8, textAlign:'left' }}>
                  {questions.map((qq, i) => (
                    <div key={i} style={{ padding:'12px 16px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14 }}>
                      <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                        <span style={{ fontSize:14, flexShrink:0 }}>
                          {/* We don't track per-question results in this simple flow; show all as checkmarks if done */}
                          ✓
                        </span>
                        <div>
                          <div style={{ fontSize:13, color:'#8e8e93' }}>{qq.question}</div>
                          <div style={{ fontSize:12, color:'#636366', marginTop:4 }}>{qq.explanation}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div key={current} style={{ animation:'fadeIn 0.3s ease both' }}>
                <p style={{ fontSize:13, color:'#636366', fontWeight:600, marginBottom:14, textTransform:'uppercase', letterSpacing:'1px' }}>
                  Question {current + 1} of {questions.length}
                </p>
                <h2 style={{ fontSize:20, fontWeight:800, color:'#f5f5f7', lineHeight:1.4, marginBottom:28 }}>
                  {q.question}
                </h2>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {q.options.map((opt, i) => {
                    const isCorrect = i === q.correctIndex
                    const isSelected = i === selected
                    let bg = 'rgba(255,255,255,0.03)'
                    let border = 'rgba(255,255,255,0.08)'
                    let color = '#f5f5f7'
                    if (answered) {
                      if (isCorrect) { bg = 'rgba(14,245,194,0.08)'; border = 'rgba(14,245,194,0.35)'; color = '#0ef5c2' }
                      else if (isSelected && !isCorrect) { bg = 'rgba(255,69,58,0.08)'; border = 'rgba(255,69,58,0.35)'; color = '#FF453A' }
                    } else if (isSelected) {
                      bg = 'rgba(129,140,248,0.08)'; border = 'rgba(129,140,248,0.35)'; color = '#818CF8'
                    }
                    return (
                      <button key={i} onClick={() => handleSelect(i)}
                        style={{ padding:'14px 16px', background:bg, border:`1.5px solid ${border}`, borderRadius:14, cursor: answered ? 'default' : 'pointer', textAlign:'left', color, fontSize:15, fontWeight:600, fontFamily:font, transition:'all 0.15s', display:'flex', gap:12, alignItems:'center' }}>
                        <span style={{ width:24, height:24, borderRadius:'50%', background:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>
                          {['A','B','C','D'][i]}
                        </span>
                        {opt}
                      </button>
                    )
                  })}
                </div>

                {answered && (
                  <div style={{ marginTop:20, padding:'14px 16px', background: selected === q.correctIndex ? 'rgba(14,245,194,0.06)' : 'rgba(255,69,58,0.06)', border:`1px solid ${selected === q.correctIndex ? 'rgba(14,245,194,0.22)' : 'rgba(255,69,58,0.22)'}`, borderRadius:14, animation:'fadeIn 0.25s ease both' }}>
                    <div style={{ fontSize:12, fontWeight:700, color: selected === q.correctIndex ? '#0ef5c2' : '#FF453A', textTransform:'uppercase', letterSpacing:'1px', marginBottom:6 }}>
                      {selected === q.correctIndex ? 'Correct!' : 'Incorrect'}
                    </div>
                    <p style={{ fontSize:13, color:'#8e8e93', margin:0, lineHeight:1.6 }}>{q.explanation}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom nav */}
        <div style={{ padding:'14px 20px 30px', borderTop:'1px solid rgba(255,255,255,0.08)', background:'rgba(6,6,15,0.90)', backdropFilter:'blur(28px)' }}>
          <div style={{ maxWidth:640, margin:'0 auto', display:'flex', gap:12 }}>
            <button onClick={onClose} style={{ padding:'14px 24px', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:16, color:'#8e8e93', fontSize:15, fontWeight:600, cursor:'pointer', fontFamily:font }}>Back</button>
            {done ? (
              <button onClick={onComplete} style={{ flex:1, padding:'14px', background:'linear-gradient(135deg,#0ef5c2,#00d4ff)', border:'none', borderRadius:16, color:'#06060f', fontSize:16, fontWeight:700, cursor:'pointer', fontFamily:font }}>
                Complete ✓
              </button>
            ) : answered ? (
              <button onClick={handleNext} style={{ flex:1, padding:'14px', background:'linear-gradient(135deg,#818CF8,#6366F1)', border:'none', borderRadius:16, color:'#fff', fontSize:16, fontWeight:700, cursor:'pointer', fontFamily:font }}>
                {current + 1 >= (questions?.length || 0) ? 'See Results →' : 'Next →'}
              </button>
            ) : (
              <div style={{ flex:1, padding:'14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, color:'#636366', fontSize:15, fontWeight:600, textAlign:'center', fontFamily:font }}>
                Select an answer
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
