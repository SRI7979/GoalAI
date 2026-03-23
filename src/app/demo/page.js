'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import LessonViewer from '@/components/LessonView'

const DEMO_LESSON = {
  slides: [
    {
      id: 'demo-1',
      type: 'intro',
      title: 'How AI Actually Works',
      content: 'Most modern AI systems are pattern engines. They look at many examples, find useful relationships inside that data, and then use those patterns to make a prediction.\n\nIn this short lesson, you will see the loop behind that process: data goes in, a model learns patterns, and those patterns shape the answer you get back.',
      diagram: {
        type: 'flow',
        nodes: [
          { label: 'Examples', color: 'teal' },
          { label: 'Model learns patterns', color: 'blue' },
          { label: 'Prediction', color: 'amber' },
        ],
        connections: [
          { from: 0, label: 'training' },
          { from: 1, label: 'inference' },
        ],
      },
      keyTakeaway: 'AI is usually not memorizing a perfect answer. It is learning a useful pattern from examples.',
    },
    {
      id: 'demo-2',
      type: 'concept',
      title: 'Models Learn Patterns, Not Truth',
      content: 'A calculator follows exact rules. An AI model is different: it estimates what is likely based on the data it has seen.\n\nThat means the quality of the output depends on the quality of the examples, the objective it was trained for, and whether the new prompt looks like something it has learned to handle.',
      diagram: {
        type: 'comparison',
        nodes: [
          { label: 'Rule-based system:\nexact steps', color: 'gray' },
          { label: 'AI model:\nprobable next answer', color: 'teal' },
          { label: 'Needs explicit logic', color: 'gray' },
          { label: 'Needs good training examples', color: 'amber' },
        ],
      },
      keyTakeaway: 'When AI seems smart, it is often because the pattern is strong and the data matched the task well.',
    },
    {
      id: 'demo-3',
      type: 'practice',
      title: 'Use the Learning Loop',
      content: 'When you see an AI output, ask three questions: what examples shaped it, what pattern is it using, and how confident should I be in that pattern for this task?\n\nThat simple loop helps you judge when AI is helpful, when it is guessing, and when you need human review.',
      diagram: {
        type: 'flow',
        nodes: [
          { label: 'What data shaped this?', color: 'teal' },
          { label: 'What pattern is it using?', color: 'blue' },
          { label: 'Should I trust this answer?', color: 'amber' },
        ],
        connections: [
          { from: 0, label: 'inspect' },
          { from: 1, label: 'evaluate' },
        ],
      },
      keyTakeaway: 'Strong AI users do not just accept outputs. They evaluate how the answer was likely produced.',
    },
  ],
  quiz: {
    question: 'Which statement best describes how most AI models work?',
    options: [
      'They store exact answers for every question they might be asked.',
      'They learn patterns from examples and use those patterns to predict an answer.',
      'They always reason from first principles like a human expert.',
      'They only work when the answer is already written inside the prompt.',
    ],
    correctIndex: 1,
    explanation: 'That is the core idea. Most AI systems learn useful statistical patterns from examples, then use those patterns to generate a likely response.',
  },
}

export default function DemoPage() {
  const router = useRouter()
  const [completed, setCompleted] = useState(false)

  const handleComplete = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('pathai.demo_xp_pending', '30')
    }
    setCompleted(true)
  }, [])

  if (completed) {
    return (
      <div style={{
        minHeight:'100vh',
        display:'grid',
        placeItems:'center',
        padding:'24px',
        background:'radial-gradient(circle at top, rgba(14,245,194,0.10), transparent 32%), #06060f',
        fontFamily:"'Plus Jakarta Sans','DM Sans',system-ui,sans-serif",
      }}>
        <div style={{
          width:'100%',
          maxWidth:520,
          padding:'32px 28px',
          borderRadius:28,
          background:'linear-gradient(145deg, rgba(255,255,255,0.14), rgba(255,255,255,0.05) 45%, rgba(110,170,255,0.08))',
          border:'1px solid rgba(255,255,255,0.18)',
          boxShadow:'inset 0 1px 0 rgba(255,255,255,0.24), 0 32px 64px rgba(0,0,0,0.40)',
          backdropFilter:'blur(40px) saturate(220%)',
          WebkitBackdropFilter:'blur(40px) saturate(220%)',
          textAlign:'center',
        }}>
          <div style={{ fontSize:56, marginBottom:12 }}>🎉</div>
          <div style={{ fontSize:30, fontWeight:900, color:'#f5f5f7', letterSpacing:'-0.9px', marginBottom:8 }}>
            Great job! You earned 30 XP
          </div>
          <p style={{ color:'#8e8e93', fontSize:15, lineHeight:1.7, marginBottom:24 }}>
            Create a free account to save your progress and unlock your personalized learning path.
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <button
              onClick={() => router.push('/login?mode=signup')}
              style={{
                padding:'15px 18px',
                border:'none',
                borderRadius:16,
                background:'linear-gradient(135deg,#0ef5c2,#00d4ff)',
                color:'#06060f',
                fontSize:15.5,
                fontWeight:800,
                cursor:'pointer',
                fontFamily:"'DM Sans', sans-serif",
                boxShadow:'0 0 36px rgba(14,245,194,0.24), inset 0 1px 0 rgba(255,255,255,0.44)',
              }}
            >
              Create Account
            </button>
            <button
              onClick={() => router.push('/')}
              style={{
                padding:'14px 18px',
                borderRadius:16,
                border:'1px solid rgba(255,255,255,0.12)',
                background:'rgba(255,255,255,0.05)',
                color:'#cfd4db',
                fontSize:14.5,
                fontWeight:700,
                cursor:'pointer',
                fontFamily:"'DM Sans', sans-serif",
              }}
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <LessonViewer
      concept="How AI Actually Works"
      taskTitle="Demo Lesson"
      goal="See PathAI in action"
      knowledge="No prior context needed."
      lessonKey="pathai-demo-how-ai-works"
      presetLesson={DEMO_LESSON}
      onClose={() => router.push('/')}
      onComplete={handleComplete}
    />
  )
}
