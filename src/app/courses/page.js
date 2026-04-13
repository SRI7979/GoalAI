'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import IconGlyph from '@/components/IconGlyph'
import AtmosphericBackdrop from '@/components/premium/AtmosphericBackdrop'
import { COURSES, getCoursesByCategory } from '@/lib/courses'
import { getSafeSupabaseUser } from '@/lib/supabase'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"

const CATEGORY_COPY = {
  Programming: 'Build real software skills through tiny wins and practical projects.',
  'Data Science': 'Turn messy information into clear models, queries, and decisions.',
  'Computer Science': 'Learn the ideas underneath strong problem solving.',
  Technology: 'Understand the systems shaping modern digital work.',
  Math: 'Build intuition before formulas take over.',
}

function difficultyColor(difficulty) {
  if (difficulty === 'advanced') return '#FF453A'
  if (difficulty === 'intermediate') return '#FBBF24'
  return '#0ef5c2'
}

function CourseIcon({ course }) {
  return (
    <svg width="54" height="54" viewBox="0 0 24 24" fill="white" aria-hidden="true">
      <path d={course.iconPath} />
    </svg>
  )
}

function CourseCard({ course, onStart }) {
  const badgeColor = difficultyColor(course.difficulty)
  return (
    <button
      type="button"
      onClick={() => onStart(course)}
      className="course-card"
      style={{ '--course-color': course.color, fontFamily: font }}
    >
      <div className="course-card-art">
        <CourseIcon course={course} />
        {course.featured && <span className="course-featured">Featured</span>}
      </div>
      <div className="course-card-body">
        <h3>{course.title}</h3>
        <p>{course.lessonCount} lessons · {course.estimatedDays} days</p>
        <span style={{ color: badgeColor, borderColor: `${badgeColor}55`, background: `${badgeColor}16` }}>
          {course.difficulty}
        </span>
      </div>
    </button>
  )
}

export default function CoursesPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { user } = await getSafeSupabaseUser()
      if (!cancelled) setLoggedIn(Boolean(user))
    })()
    return () => { cancelled = true }
  }, [])

  const filteredCourses = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return COURSES
    return COURSES.filter((course) => (
      course.title.toLowerCase().includes(needle)
      || course.subtitle.toLowerCase().includes(needle)
      || course.category.toLowerCase().includes(needle)
      || course.concepts.some((concept) => concept.toLowerCase().includes(needle))
    ))
  }, [query])

  const groups = useMemo(() => {
    const grouped = getCoursesByCategory()
    return Object.fromEntries(
      Object.entries(grouped).map(([category, courses]) => [
        category,
        courses.filter((course) => filteredCourses.some((candidate) => candidate.id === course.id)),
      ]),
    )
  }, [filteredCourses])

  function handleStart(course) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('pathai-course-intent', JSON.stringify({
        id: course.id,
        goalText: course.goalText,
        title: course.title,
        concepts: course.concepts,
        createdAt: Date.now(),
      }))
      const startedCourse = window.localStorage.getItem('pathai-free-course-started')
      if (!startedCourse) {
        window.localStorage.setItem('pathai-free-course-started', course.id)
      }
    }
    router.push(loggedIn ? `/onboarding?course=${course.id}` : `/login?course=${course.id}`)
  }

  return (
    <>
      <style>{`
        .courses-page {
          min-height: 100vh;
          position: relative;
          overflow: clip;
          background:
            radial-gradient(circle at 10% -10%, rgba(14,245,194,0.16), transparent 34%),
            radial-gradient(circle at 90% 0%, rgba(132,163,255,0.18), transparent 36%),
            #06060f;
          font-family: ${font};
        }
        .courses-shell {
          position: relative;
          z-index: 1;
          width: min(1180px, 100%);
          margin: 0 auto;
          padding: calc(env(safe-area-inset-top, 0px) + 24px) 20px 104px;
        }
        .courses-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 30px;
        }
        .courses-back {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.05);
          color: #d8e4ef;
          display: grid;
          place-items: center;
          cursor: pointer;
        }
        .courses-hero {
          display: grid;
          gap: 14px;
          max-width: 720px;
          margin-bottom: 28px;
        }
        .courses-eyebrow {
          width: fit-content;
          padding: 8px 13px;
          border-radius: 999px;
          color: #0ef5c2;
          background: rgba(14,245,194,0.08);
          border: 1px solid rgba(14,245,194,0.22);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .courses-hero h1 {
          color: #f5f5f7;
          font-size: clamp(2.4rem, 7vw, 5.6rem);
          line-height: 0.94;
          letter-spacing: -0.06em;
          margin: 0;
        }
        .courses-hero p {
          color: #aeb8c7;
          font-size: 16px;
          line-height: 1.7;
          margin: 0;
        }
        .courses-search {
          width: min(620px, 100%);
          height: 54px;
          border-radius: 18px;
          border: 1px solid rgba(14,245,194,0.18);
          background: rgba(12,16,24,0.78);
          color: #f5f5f7;
          font-size: 15px;
          padding: 0 18px;
          outline: none;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        }
        .courses-search:focus {
          border-color: rgba(14,245,194,0.55);
          box-shadow: 0 0 0 4px rgba(14,245,194,0.08);
        }
        .course-category {
          margin-top: 34px;
        }
        .course-category h2 {
          color: #f5f5f7;
          font-size: 18px;
          font-weight: 900;
          margin: 0 0 4px;
        }
        .course-category p {
          color: #7f8b99;
          font-size: 13px;
          margin: 0 0 14px;
        }
        .course-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
        }
        .course-card {
          height: 220px;
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 24px;
          overflow: hidden;
          background: rgba(255,255,255,0.04);
          text-align: left;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
          box-shadow: 0 18px 44px rgba(0,0,0,0.24);
        }
        .course-card:hover {
          transform: translateY(-3px);
          border-color: color-mix(in srgb, var(--course-color) 45%, transparent);
          box-shadow: 0 24px 60px rgba(0,0,0,0.32), 0 0 34px color-mix(in srgb, var(--course-color) 14%, transparent);
        }
        .course-card-art {
          height: 55%;
          position: relative;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at 30% 20%, rgba(255,255,255,0.26), transparent 30%),
            linear-gradient(145deg, var(--course-color), color-mix(in srgb, var(--course-color) 72%, #050608));
        }
        .course-featured {
          position: absolute;
          top: 10px;
          left: 10px;
          padding: 5px 8px;
          border-radius: 999px;
          background: rgba(5,6,8,0.42);
          color: white;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .course-card-body {
          height: 45%;
          padding: 13px 14px;
          background: rgba(9,12,20,0.96);
        }
        .course-card-body h3 {
          color: #f5f5f7;
          font-size: 14px;
          line-height: 1.2;
          margin: 0 0 6px;
          font-weight: 900;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .course-card-body p {
          color: #7f8b99;
          font-size: 11px;
          margin: 0 0 9px;
          font-weight: 700;
        }
        .course-card-body span {
          display: inline-flex;
          align-items: center;
          height: 22px;
          padding: 0 8px;
          border: 1px solid;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        @media (max-width: 560px) {
          .courses-shell { padding-inline: 16px; }
          .course-grid {
            display: flex;
            gap: 14px;
            overflow-x: auto;
            padding-bottom: 6px;
            scroll-snap-type: x mandatory;
          }
          .course-card {
            width: 160px;
            height: 200px;
            min-width: 160px;
            scroll-snap-align: start;
          }
        }
      `}</style>

      <main className="courses-page">
        <AtmosphericBackdrop variant="onboarding" />
        <div className="courses-shell">
          <div className="courses-top">
            <button className="courses-back" onClick={() => router.push('/dashboard')} aria-label="Back to dashboard">
              <IconGlyph name="arrowLeft" size={18} strokeWidth={2.4} />
            </button>
            <button className="courses-back" onClick={() => router.push('/pricing')} aria-label="View pricing">
              <IconGlyph name="sparkles" size={18} strokeWidth={2.2} />
            </button>
          </div>

          <section className="courses-hero">
            <div className="courses-eyebrow">Learning Paths</div>
            <h1>Step-by-step paths to mastery.</h1>
            <p>
              Pick a polished starting route, then PathAI turns it into your daily mission system with lessons, practice, proof, and rewards.
            </p>
            <input
              className="courses-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="What do you want to learn?"
            />
          </section>

          {Object.entries(groups).map(([category, courses]) => {
            if (courses.length === 0) return null
            return (
              <section className="course-category" key={category}>
                <h2>{category}</h2>
                <p>{CATEGORY_COPY[category] || 'Focused courses that turn intention into daily progress.'}</p>
                <div className="course-grid">
                  {courses.map((course) => (
                    <CourseCard key={course.id} course={course} onStart={handleStart} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </main>
    </>
  )
}
