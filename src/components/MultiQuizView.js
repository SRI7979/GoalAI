'use client'
import { useEffect, useRef, useState } from 'react'
import AIAssistant from './AIAssistant'
import ConfidenceSelector from './ConfidenceSelector'
import { getCanonicalTaskType } from '@/lib/taskTaxonomy'
import IconGlyph from '@/components/IconGlyph'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"

export default function MultiQuizView({ task, goal, knowledge, onClose, onComplete }) {
  const canonicalTaskType = getCanonicalTaskType(task?.type, task)
  const isCourseFinalExam = canonicalTaskType === 'final_exam' || Boolean(task?.isCourseFinalExam || task?._courseFinal)
  const isRecallMode = canonicalTaskType === 'recall' && !isCourseFinalExam
  const examMeta = task?._courseFinal || {}
  const attemptsUsed = Number(examMeta.attemptsUsed) || 0
  const maxAttempts = Number(examMeta.maxAttempts) || 3
  const attemptsRemaining = Math.max(0, maxAttempts - attemptsUsed)
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState(null)
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [results, setResults] = useState([]) // track per-question results
  const [done, setDone] = useState(false)
  const [showVignette, setShowVignette] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [assistantUsageCount, setAssistantUsageCount] = useState(0)
  const [confidenceLevel, setConfidenceLevel] = useState('')
  const startTimeRef = useRef(null)

  useEffect(() => {
    async function load() {
      startTimeRef.current = Date.now()
      setLoading(true)
      const cacheKey = `pathai.quiz.v1::${task.id || task.title}`
      try {
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          const data = JSON.parse(cached)
          if (data.questions) { setQuestions(data.questions); setLoading(false); return }
        }
      } catch {}
      try {
        const res = await fetch('/api/quiz-multi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            concept: task._concept || task.title,
            goal,
            knowledge,
            scope: isCourseFinalExam ? 'course_final' : 'standard',
            questionCount: isCourseFinalExam ? 12 : 5,
            coveredConcepts: isCourseFinalExam ? task?._courseTopics || [] : undefined,
            moduleTitles: isCourseFinalExam ? task?._courseModules || [] : undefined,
            examTitle: isCourseFinalExam ? task.title : undefined,
          }),
        })
        const data = await res.json()
        if (data.questions) {
          setQuestions(data.questions)
          try { localStorage.setItem(cacheKey, JSON.stringify(data)) } catch {}
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [task.id, task.title, goal, knowledge, task._concept, isCourseFinalExam, task?._courseTopics, task?._courseModules])

  function handleSelect(idx) {
    if (answered) return
    setSelected(idx)
    setAnswered(true)
    const correct = idx === questions[current].correctIndex
    setResults(prev => [...prev, { questionIdx: current, selectedIdx: idx, correct }])
    if (correct) {
      setScore(s => s + 1)
      setCombo(c => {
        const next = c + 1
        setBestCombo((best) => Math.max(best, next))
        return next
      })
    } else {
      setCombo(0)
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

  const handleComplete = () => {
    if (!confidenceLevel) return
    setCompleting(true)
    const totalQuestions = questions?.length || 0
    const correctCount = results.filter((entry) => entry.correct).length
    const incorrectCount = Math.max(0, totalQuestions - correctCount)
    const completionTimeSec = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current) / 1000)
      : 0
    onComplete({
      accuracy: totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0,
      correctCount,
      questionCount: totalQuestions,
      attempts: Math.max(1, incorrectCount + 1),
      confidenceLevel,
      assistantUsageCount,
      completionTimeSec,
      quizPerfect: totalQuestions > 0 && correctCount === totalQuestions,
      comboMax: bestCombo,
      quizScore: totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0,
    })
  }

  const q = questions?.[current]
  const accent = isCourseFinalExam ? '#FBBF24' : isRecallMode ? '#C084FC' : '#FF453A'
  const accentBg = isCourseFinalExam ? 'rgba(251,191,36,0.10)' : isRecallMode ? 'rgba(192,132,252,0.10)' : 'rgba(255,69,58,0.10)'
  const accentBorder = isCourseFinalExam ? 'rgba(251,191,36,0.25)' : isRecallMode ? 'rgba(192,132,252,0.25)' : 'rgba(255,69,58,0.25)'

  return (
    <>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes redVignette { 0%{opacity:0}20%{opacity:1}100%{opacity:0} }
        @keyframes popIn   { 0%{transform:scale(0.8);opacity:0}70%{transform:scale(1.05)}100%{transform:scale(1);opacity:1} }
        @keyframes comboPopIn { 0%{transform:scale(0.6);opacity:0}70%{transform:scale(1.15)}100%{transform:scale(1);opacity:1} }
        @keyframes greenFlash { 0%{box-shadow:0 0 0 0 rgba(14,245,194,0.4)}100%{box-shadow:0 0 0 12px rgba(14,245,194,0)} }
        @keyframes correctPulse { 0%{transform:scale(1)}50%{transform:scale(1.05)}100%{transform:scale(1)} }
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

          {/* Progress dots */}
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            {!loading && questions && !done && questions.map((_, i) => {
              const result = results.find(r => r.questionIdx === i)
              const isCurrent = i === current
              return (
                <div key={i} style={{
                  width: isCurrent ? 24 : 8, height: 8, borderRadius: 9999,
                  background: result ? (result.correct ? '#0ef5c2' : '#FF453A') : isCurrent ? 'rgba(255,69,58,0.5)' : 'rgba(255,255,255,0.08)',
                  transition: 'all 0.3s',
                }}/>
              )
            })}
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {!loading && questions && !done && (
              <span style={{ fontSize:12, fontWeight:700, color:accent }}>{current + 1}/{questions.length}</span>
            )}
            <div style={{ padding:'4px 12px', background:accentBg, border:`1px solid ${accentBorder}`, borderRadius:9999, fontSize:11, fontWeight:700, color:accent, textTransform:'uppercase', letterSpacing:'1px' }}>
              {isCourseFinalExam ? 'Final Exam' : isRecallMode ? 'Recall' : 'Quiz'}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex:1, overflow:'auto', padding:'20px 20px 120px' }}>
          <div style={{ maxWidth:640, margin:'0 auto' }}>

            {loading ? (
              <div style={{ textAlign:'center', paddingTop:80 }}>
                <div style={{ width:44, height:44, border:'3px solid rgba(255,255,255,0.06)', borderTopColor:accent, borderRadius:'50%', animation:'spin 0.65s linear infinite', margin:'0 auto 20px' }}/>
                <p style={{ color:'#636366', fontSize:14 }}>
                  {isCourseFinalExam ? 'Generating final exam…' : isRecallMode ? 'Building your recall set…' : 'Generating quiz…'}
                </p>
                <p style={{ color:'#475569', fontSize:12, marginTop:8 }}>
                  {isCourseFinalExam
                    ? 'Pulling questions from across the full course.'
                    : isRecallMode
                      ? 'Preparing quick retrieval prompts to strengthen memory.'
                    : 'Preparing questions that test real understanding'}
                </p>
              </div>
            ) : !questions ? (
              <div style={{ textAlign:'center', paddingTop:80 }}>
                <p style={{ color:'#636366', marginBottom:16 }}>
                  {isRecallMode ? 'Could not load recall prompts.' : 'Could not load quiz.'}
                </p>
                <button onClick={onClose} style={{ padding:'10px 24px', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:12, color:'#8e8e93', fontSize:14, cursor:'pointer', fontFamily:font }}>Go Back</button>
              </div>
            ) : done ? (
              <div style={{ animation:'popIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both', paddingTop:40 }}>
                {/* Score header */}
                <div style={{ textAlign:'center', marginBottom:32 }}>
                  <h2 style={{ fontSize:28, fontWeight:900, color:'#f5f5f7', marginBottom:8 }}>
                    {score}/{questions.length} correct
                  </h2>
                  <p style={{ fontSize:15, color:'#8e8e93' }}>
                    {isCourseFinalExam
                      ? score >= questions.length * 0.8
                        ? 'Strong final-exam performance. Submit it to finish the course.'
                        : 'This attempt only counts if you clear the course pass threshold.'
                      : score === questions.length
                        ? 'Perfect score — you\'ve mastered this!'
                        : score >= questions.length * 0.8
                          ? 'Excellent work! Almost perfect.'
                          : score >= questions.length * 0.6
                            ? 'Good effort. Review the ones below.'
                            : 'Keep studying and try again — you\'ll improve!'}
                  </p>
                  {isCourseFinalExam && (
                    <div style={{ marginTop: 14, display:'inline-flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:9999, background:accentBg, border:`1px solid ${accentBorder}`, color:accent, fontSize:12, fontWeight:800 }}>
                      Passing score: {examMeta.passScore || 80}% • Attempts used after submit: {Math.min(maxAttempts, attemptsUsed + 1)}/{maxAttempts}
                    </div>
                  )}
                </div>

                {/* Per-question breakdown */}
                <div style={{ fontSize:12, fontWeight:700, color:'#636366', textTransform:'uppercase', letterSpacing:'1px', marginBottom:12 }}>Review</div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {questions.map((qq, i) => {
                    const result = results.find(r => r.questionIdx === i)
                    const correct = result?.correct ?? false
                    return (
                      <div key={i} style={{ padding:'14px 16px', background: correct ? 'rgba(14,245,194,0.03)' : 'rgba(255,69,58,0.03)', border:`1px solid ${correct ? 'rgba(14,245,194,0.12)' : 'rgba(255,69,58,0.12)'}`, borderRadius:16 }}>
                        <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                          <div style={{ width:22, height:22, borderRadius:'50%', background: correct ? 'rgba(14,245,194,0.15)' : 'rgba(255,69,58,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                            {correct
                              ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0ef5c2" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                              : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FF453A" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            }
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:14, color:'#f5f5f7', fontWeight:600, marginBottom:6, lineHeight:1.4 }}>{qq.question}</div>
                            {!correct && (
                              <div style={{ fontSize:12, color:'#FF453A', marginBottom:4 }}>
                                Your answer: {qq.options[result?.selectedIdx ?? 0]}
                              </div>
                            )}
                            <div style={{ fontSize:12, color: correct ? '#34D399' : '#8e8e93', marginBottom:4 }}>
                              Correct: {qq.options[qq.correctIndex]}
                            </div>
                            <div style={{ fontSize:12, color:'#636366', lineHeight:1.5 }}>{qq.explanation}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div style={{ marginTop: 20 }}>
                  <ConfidenceSelector
                    value={confidenceLevel}
                    onChange={setConfidenceLevel}
                    accent={isCourseFinalExam ? '#FBBF24' : '#0ef5c2'}
                    borderColor={isCourseFinalExam ? 'rgba(251,191,36,0.22)' : 'rgba(14,245,194,0.22)'}
                    background={isCourseFinalExam ? 'rgba(251,191,36,0.05)' : 'rgba(14,245,194,0.05)'}
                    label={isCourseFinalExam
                      ? 'How confident are you in your course-wide understanding now?'
                      : 'How confident are you about this concept now?'}
                  />
                </div>
              </div>
            ) : (
              <div key={current} style={{ animation:'fadeIn 0.3s ease both' }}>
                {isCourseFinalExam && (
                  <div style={{
                    marginBottom: 18,
                    padding: '12px 14px',
                    borderRadius: 16,
                    background: 'rgba(251,191,36,0.08)',
                    border: '1px solid rgba(251,191,36,0.20)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase', color: '#FBBF24', marginBottom: 4 }}>
                        Course Finish
                      </div>
                      <div style={{ fontSize: 13, color: '#d4d4d8', lineHeight: 1.45 }}>
                        Pass with {examMeta.passScore || 80}% or better. You have {attemptsRemaining} of {maxAttempts} attempts remaining.
                      </div>
                    </div>
                    <div style={{ padding: '6px 10px', borderRadius: 9999, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#f5f5f7', fontSize: 11, fontWeight: 800 }}>
                      Best {Number(examMeta.bestScore) || 0}%
                    </div>
                  </div>
                )}
                {/* Score tracker */}
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
                  <span style={{ fontSize:12, color:'#636366', fontWeight:600, textTransform:'uppercase', letterSpacing:'1px' }}>
                    Question {current + 1} of {questions.length}
                  </span>
                  {combo >= 2 && (
                    <span key={combo} style={{
                      padding:'3px 10px', borderRadius:9999, fontSize:11, fontWeight:800,
                      background: combo >= 5 ? 'rgba(255,215,0,0.15)' : 'rgba(14,245,194,0.10)',
                      border: `1px solid ${combo >= 5 ? 'rgba(255,215,0,0.35)' : 'rgba(14,245,194,0.25)'}`,
                      color: combo >= 5 ? '#FFD700' : '#0ef5c2',
                      animation:'comboPopIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                    }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <IconGlyph name="target" size={12} strokeWidth={2.4} color={combo >= 5 ? '#FFD700' : '#0ef5c2'} />
                        Combo {combo}x
                      </span>
                    </span>
                  )}
                  {score > 0 && (
                    <span style={{ marginLeft:'auto', fontSize:12, fontWeight:700, color:'#0ef5c2', display:'flex', alignItems:'center', gap:4 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0ef5c2" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      {score} correct
                    </span>
                  )}
                </div>

                <h2 style={{ fontSize:20, fontWeight:800, color:'#f5f5f7', lineHeight:1.4, marginBottom:28, letterSpacing:'-0.3px' }}>
                  {q.question}
                </h2>

                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {q.options.map((opt, i) => {
                    const isCorrect = i === q.correctIndex
                    const isSelected = i === selected
                    let bg = 'rgba(255,255,255,0.04)'
                    let border = 'rgba(255,255,255,0.10)'
                    let color = '#f5f5f7'
                    let letterBg = 'rgba(255,255,255,0.06)'
                    let letterColor = '#636366'
                    if (answered) {
                      if (isCorrect) {
                        bg = 'rgba(14,245,194,0.08)'; border = 'rgba(14,245,194,0.35)'; color = '#0ef5c2'
                        letterBg = 'rgba(14,245,194,0.15)'; letterColor = '#0ef5c2'
                      } else if (isSelected && !isCorrect) {
                        bg = 'rgba(255,69,58,0.08)'; border = 'rgba(255,69,58,0.35)'; color = '#FF453A'
                        letterBg = 'rgba(255,69,58,0.15)'; letterColor = '#FF453A'
                      } else {
                        bg = 'rgba(255,255,255,0.02)'; color = '#636366'
                      }
                    }
                    return (
                      <button key={i} onClick={() => handleSelect(i)}
                        style={{
                          padding:'14px 16px', background:bg, border:`1.5px solid ${border}`,
                          borderRadius:14, cursor: answered ? 'default' : 'pointer',
                          textAlign:'left', color, fontSize:15, fontWeight:600,
                          fontFamily:font, transition:'all 0.18s',
                          display:'flex', gap:12, alignItems:'center',
                          animation: answered && isCorrect ? 'correctPulse 0.3s ease' : 'none',
                        }}
                        onMouseEnter={e => { if (!answered) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)' } }}
                        onMouseLeave={e => { if (!answered) { e.currentTarget.style.background = bg; e.currentTarget.style.borderColor = border } }}
                      >
                        <span style={{ width:28, height:28, borderRadius:8, background:letterBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, flexShrink:0, color:letterColor, transition:'all 0.18s' }}>
                          {answered && isCorrect ? <IconGlyph name="check" size={12} strokeWidth={2.8} color="#0ef5c2" /> : answered && isSelected && !isCorrect ? <IconGlyph name="x" size={12} strokeWidth={2.6} color="#FF453A" /> : ['A','B','C','D'][i]}
                        </span>
                        <span style={{ lineHeight:1.4 }}>{opt}</span>
                      </button>
                    )
                  })}
                </div>

                {answered && (
                  <div style={{
                    marginTop:20, padding:'16px 18px',
                    background: selected === q.correctIndex ? 'rgba(14,245,194,0.05)' : 'rgba(255,69,58,0.05)',
                    border:`1px solid ${selected === q.correctIndex ? 'rgba(14,245,194,0.18)' : 'rgba(255,69,58,0.18)'}`,
                    borderRadius:16, animation:'fadeIn 0.25s ease both',
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                      <div style={{ fontSize:12, fontWeight:800, color: selected === q.correctIndex ? '#0ef5c2' : '#FF453A', textTransform:'uppercase', letterSpacing:'1px' }}>
                        {selected === q.correctIndex ? 'Correct' : 'Incorrect'}
                      </div>
                    </div>
                    <p style={{ fontSize:14, color:'#9ca3af', margin:0, lineHeight:1.7 }}>{q.explanation}</p>
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
              <button onClick={handleComplete} disabled={completing || !confidenceLevel} style={{
                flex:1, padding:'14px',
                background: completing ? 'rgba(14,245,194,0.06)' : confidenceLevel ? 'linear-gradient(135deg,#0ef5c2,#00d4ff)' : 'rgba(255,255,255,0.04)',
                border: completing ? '1px solid rgba(14,245,194,0.22)' : confidenceLevel ? 'none' : '1px solid rgba(255,255,255,0.08)',
                borderRadius:16, color: completing ? '#0ef5c2' : confidenceLevel ? '#06060f' : '#636366',
                fontSize:16, fontWeight:700, cursor: completing ? 'default' : 'pointer', fontFamily:font,
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              }}>
                {completing ? (
                  <><div style={{width:14,height:14,border:'2px solid rgba(14,245,194,0.2)',borderTopColor:'#0ef5c2',borderRadius:'50%',animation:'spin 0.65s linear infinite'}}/>Saving…</>
                ) : confidenceLevel ? 'Complete' : 'Choose confidence to continue'}
              </button>
            ) : answered ? (
              <button onClick={handleNext} style={{
                flex:1, padding:'14px',
                background:'linear-gradient(135deg,#818CF8,#6366F1)',
                border:'none', borderRadius:16, color:'#fff',
                fontSize:16, fontWeight:700, cursor:'pointer', fontFamily:font,
                boxShadow:'0 0 20px rgba(129,140,248,0.25)',
              }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)'}}
              onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)'}}>
                {current + 1 >= (questions?.length || 0) ? 'See Results →' : 'Next Question →'}
              </button>
            ) : (
              <div style={{ flex:1, padding:'14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, color:'#636366', fontSize:15, fontWeight:600, textAlign:'center', fontFamily:font }}>
                Select an answer
              </div>
            )}
          </div>
        </div>
      </div>

      <AIAssistant
        concept={task._concept || task.title}
        goal={goal}
        mode={task._aiMode || 'hint'}
        onAsk={() => setAssistantUsageCount((count) => count + 1)}
        context={`Quiz Q${current + 1}: ${q?.question || task.title}`}
      />
    </>
  )
}
