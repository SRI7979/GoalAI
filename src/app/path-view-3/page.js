'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'modules', label: 'Modules' },
  { id: 'projects', label: 'Projects' },
  { id: 'stats', label: 'Progress' },
]

const modules = [
  {
    id: 'orientation',
    week: 'Week 1',
    title: 'Start thinking with AI',
    minutes: 42,
    lessons: [
      'Path setup and learning goals',
      'How to ask for useful reasoning',
      'Mini quiz: choose the better prompt',
    ],
  },
  {
    id: 'context',
    week: 'Week 2',
    title: 'Control context windows',
    minutes: 58,
    lessons: [
      'Chunk a messy problem',
      'Track assumptions and constraints',
      'Practice lab: context repair',
    ],
  },
  {
    id: 'proof',
    week: 'Week 3',
    title: 'Ship proof of work',
    minutes: 74,
    lessons: [
      'Turn answers into artifacts',
      'Review with a rubric',
      'Project: publish a reasoning note',
    ],
  },
]

const projects = [
  { title: 'Prompt teardown', type: 'Guided Project', level: 'Beginner', time: '35 min' },
  { title: 'Context rescue worksheet', type: 'Practice Lab', level: 'Intermediate', time: '50 min' },
  { title: 'Portfolio proof memo', type: 'Final Project', level: 'Intermediate', time: '1 hr' },
]

const statCards = [
  { label: 'Lessons done', value: '7', detail: '3 remaining this week' },
  { label: 'Current streak', value: '7d', detail: 'Daily learning rhythm' },
  { label: 'Course XP', value: '2,480', detail: 'PathAI placeholder total' },
  { label: 'Skill score', value: '82%', detail: 'Reasoning and proof' },
]

function CourseLogo() {
  return (
    <div className="pv3-logo" aria-hidden="true">
      P
    </div>
  )
}

function Stars() {
  return (
    <span className="pv3-stars" aria-label="4.8 rating">
      <span>Star</span>
      <span>Star</span>
      <span>Star</span>
      <span>Star</span>
      <span>Star</span>
    </span>
  )
}

function TopNav({ saved, toggleSaved }) {
  return (
    <header className="pv3-topnav">
      <Link className="pv3-brand" href="/dashboard">
        <CourseLogo />
        <span>PathAI</span>
      </Link>
      <nav aria-label="PathAI course navigation">
        <button type="button">Explore</button>
        <button type="button">My Learning</button>
        <button type="button">Career Path</button>
      </nav>
      <div className="pv3-search" aria-label="Search placeholder">
        <span>Search catalog</span>
      </div>
      <button className="pv3-save" type="button" onClick={toggleSaved}>
        {saved ? 'Saved' : 'Save'}
      </button>
    </header>
  )
}

function CourseHero({ enrolled, setEnrolled, saved, toggleSaved, completedCount, totalLessons }) {
  return (
    <section className="pv3-hero">
      <div className="pv3-hero-inner">
        <div className="pv3-breadcrumb">PathAI / AI Learning Skills / Course</div>
        <div className="pv3-hero-grid">
          <div className="pv3-hero-copy">
            <p className="pv3-kicker">PathAI Course</p>
            <h1>AI Thinking Foundations</h1>
            <p className="pv3-summary">
              Build practical habits for prompting, context control, review, and proof of work.
            </p>
            <div className="pv3-meta">
              <strong>PathAI Studio</strong>
              <span>Instructor-led placeholder</span>
              <span>Beginner friendly</span>
            </div>
            <div className="pv3-rating">
              <strong>4.8</strong>
              <Stars />
              <span>12,840 learners</span>
            </div>
            <div className="pv3-hero-actions">
              <button className="pv3-primary" type="button" onClick={() => setEnrolled(true)}>
                {enrolled ? 'Resume learning' : 'Enroll for free'}
              </button>
              <button className="pv3-secondary" type="button" onClick={toggleSaved}>
                {saved ? 'Saved to list' : 'Add to list'}
              </button>
            </div>
          </div>
          <aside className="pv3-course-card">
            <div className="pv3-preview">
              <span>PathAI</span>
            </div>
            <h2>Included with this path</h2>
            <ul>
              <li>{totalLessons} lessons and labs</li>
              <li>3 hands-on projects</li>
              <li>Shareable PathAI certificate</li>
            </ul>
            <div className="pv3-card-progress">
              <span>{completedCount}/{totalLessons} complete</span>
              <div><i style={{ width: `${Math.round((completedCount / totalLessons) * 100)}%` }} /></div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}

function TabBar({ activeTab, setActiveTab }) {
  return (
    <div className="pv3-tabs">
      <div>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? 'is-active' : ''}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function CourseSidebar({ enrolled, completedCount, totalLessons, setActiveTab }) {
  return (
    <aside className="pv3-sidebar-card">
      <h2>Your learning plan</h2>
      <div className="pv3-ring">
        <strong>{Math.round((completedCount / totalLessons) * 100)}%</strong>
        <span>complete</span>
      </div>
      <button className="pv3-primary" type="button" onClick={() => setActiveTab('modules')}>
        {enrolled ? 'Continue' : 'Preview modules'}
      </button>
      <div className="pv3-side-list">
        <p>Skills you will practice</p>
        <span>Prompt design</span>
        <span>Context planning</span>
        <span>Proof review</span>
      </div>
    </aside>
  )
}

function OverviewTab({ setActiveTab }) {
  return (
    <div className="pv3-main-copy">
      <section className="pv3-section">
        <h2>What you will learn</h2>
        <div className="pv3-outcomes">
          <div>Write prompts that create usable next steps.</div>
          <div>Turn vague goals into scoped learning tasks.</div>
          <div>Use reviews, rubrics, and proof notes to improve.</div>
          <div>Build a repeatable PathAI workflow.</div>
        </div>
      </section>

      <section className="pv3-section">
        <h2>About this course</h2>
        <p>
          This placeholder uses a course-platform layout for PathAI. It is intentionally static, but the page structure is ready for modules, projects, certificates, and learning progress.
        </p>
        <button className="pv3-link-button" type="button" onClick={() => setActiveTab('modules')}>
          View all modules
        </button>
      </section>

      <section className="pv3-section">
        <h2>PathAI certificate</h2>
        <div className="pv3-certificate">
          <CourseLogo />
          <div>
            <strong>Shareable certificate placeholder</strong>
            <span>Add this path to your portfolio once the real flow is wired.</span>
          </div>
        </div>
      </section>
    </div>
  )
}

function ModulesTab({ completed, toggleLesson }) {
  return (
    <div className="pv3-main-copy">
      <section className="pv3-section">
        <h2>Course modules</h2>
        <p>Move through the path one week at a time. Lesson checks are local placeholder state.</p>
        <div className="pv3-module-list">
          {modules.map((module) => (
            <article className="pv3-module" key={module.id}>
              <div className="pv3-module-head">
                <div>
                  <span>{module.week}</span>
                  <h3>{module.title}</h3>
                </div>
                <strong>{module.minutes} min</strong>
              </div>
              <div className="pv3-lessons">
                {module.lessons.map((lesson) => {
                  const key = `${module.id}:${lesson}`
                  return (
                    <label key={key}>
                      <input
                        type="checkbox"
                        checked={Boolean(completed[key])}
                        onChange={() => toggleLesson(key)}
                      />
                      <span />
                      <em>{lesson}</em>
                    </label>
                  )
                })}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function ProjectsTab() {
  return (
    <div className="pv3-main-copy">
      <section className="pv3-section">
        <h2>Hands-on projects</h2>
        <p>Practice cards styled like a course marketplace project list.</p>
        <div className="pv3-project-grid">
          {projects.map((project) => (
            <article key={project.title} className="pv3-project-card">
              <div className="pv3-project-art">{project.type}</div>
              <h3>{project.title}</h3>
              <p>{project.level} · {project.time}</p>
              <button type="button">Preview</button>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function StatsTab() {
  return (
    <div className="pv3-main-copy">
      <section className="pv3-section">
        <h2>Progress snapshot</h2>
        <div className="pv3-stat-grid">
          {statCards.map((card) => (
            <article key={card.label}>
              <p>{card.label}</p>
              <strong>{card.value}</strong>
              <span>{card.detail}</span>
            </article>
          ))}
        </div>
      </section>
      <section className="pv3-section">
        <h2>Weekly learning time</h2>
        <div className="pv3-bars">
          {[42, 60, 35, 82, 56, 70, 48].map((height, index) => (
            <span key={index} style={{ height: `${height}%` }} />
          ))}
        </div>
      </section>
    </div>
  )
}

export default function PathView3Page() {
  const initialCompleted = useMemo(() => ({
    'orientation:Path setup and learning goals': true,
    'orientation:How to ask for useful reasoning': true,
  }), [])
  const [activeTab, setActiveTab] = useState('overview')
  const [completed, setCompleted] = useState(initialCompleted)
  const [enrolled, setEnrolled] = useState(false)
  const [saved, setSaved] = useState(false)

  const totalLessons = modules.reduce((sum, module) => sum + module.lessons.length, 0)
  const completedCount = Object.values(completed).filter(Boolean).length

  function toggleLesson(key) {
    setCompleted((current) => ({ ...current, [key]: !current[key] }))
  }

  function toggleSaved() {
    setSaved((current) => !current)
  }

  return (
    <main className="pv3-shell">
      <style>{`
        .pv3-shell {
          min-height: 100vh;
          background: #f5f7fb;
          color: #1f1f1f;
          font-family: Arial, "Helvetica Neue", Helvetica, system-ui, sans-serif;
        }

        .pv3-shell *,
        .pv3-shell *::before,
        .pv3-shell *::after {
          box-sizing: border-box;
        }

        .pv3-shell button,
        .pv3-shell a {
          font: inherit;
        }

        .pv3-topnav {
          min-height: 64px;
          background: #fff;
          border-bottom: 1px solid #d8dce3;
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 0 28px;
          position: sticky;
          top: 0;
          z-index: 20;
        }

        .pv3-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #0056d2;
          text-decoration: none;
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.02em;
          flex-shrink: 0;
        }

        .pv3-logo {
          width: 34px;
          height: 34px;
          border-radius: 6px;
          background: #0056d2;
          color: #fff;
          display: grid;
          place-items: center;
          font-size: 19px;
          font-weight: 800;
        }

        .pv3-topnav nav {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .pv3-topnav nav button,
        .pv3-save,
        .pv3-topnav .pv3-search,
        .pv3-secondary,
        .pv3-link-button,
        .pv3-project-card button {
          border-radius: 4px;
        }

        .pv3-topnav nav button,
        .pv3-save {
          min-height: 38px;
          border: 0;
          background: transparent;
          color: #1f1f1f;
          padding: 0 12px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
        }

        .pv3-topnav nav button:hover,
        .pv3-save:hover {
          background: #f0f4fb;
        }

        .pv3-search {
          height: 38px;
          min-width: 250px;
          margin-left: auto;
          border: 1px solid #b7c2d8;
          background: #fff;
          color: #5b6780;
          display: flex;
          align-items: center;
          padding: 0 12px;
          font-size: 14px;
        }

        .pv3-save {
          border: 1px solid #0056d2;
          color: #0056d2;
          background: #fff;
        }

        .pv3-hero {
          background: #0f2b63;
          color: #fff;
          border-bottom: 1px solid #0a2455;
        }

        .pv3-hero-inner,
        .pv3-content,
        .pv3-tabs > div {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
        }

        .pv3-hero-inner {
          padding: 28px 0 34px;
        }

        .pv3-breadcrumb {
          color: #d7e4ff;
          font-size: 13px;
          margin-bottom: 22px;
        }

        .pv3-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 340px;
          gap: 34px;
          align-items: start;
        }

        .pv3-kicker {
          margin: 0 0 8px;
          color: #b8d3ff;
          font-size: 14px;
          font-weight: 700;
        }

        .pv3-hero h1 {
          margin: 0;
          max-width: 760px;
          font-size: 44px;
          line-height: 1.08;
          font-weight: 800;
          letter-spacing: -0.025em;
        }

        .pv3-summary {
          max-width: 700px;
          margin: 16px 0 0;
          color: #eff5ff;
          font-size: 18px;
          line-height: 1.55;
        }

        .pv3-meta,
        .pv3-rating,
        .pv3-hero-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .pv3-meta {
          margin-top: 18px;
          color: #d7e4ff;
          font-size: 14px;
        }

        .pv3-meta strong {
          color: #fff;
        }

        .pv3-rating {
          margin-top: 14px;
          color: #f6c54f;
          font-size: 14px;
          font-weight: 700;
        }

        .pv3-rating span:last-child {
          color: #d7e4ff;
          font-weight: 500;
        }

        .pv3-stars {
          display: inline-flex;
          gap: 2px;
        }

        .pv3-stars span {
          width: 12px;
          height: 12px;
          overflow: hidden;
          text-indent: -999px;
          background: #f6c54f;
          clip-path: polygon(50% 0, 61% 35%, 98% 35%, 68% 56%, 79% 91%, 50% 70%, 21% 91%, 32% 56%, 2% 35%, 39% 35%);
        }

        .pv3-hero-actions {
          margin-top: 24px;
        }

        .pv3-primary,
        .pv3-secondary,
        .pv3-link-button,
        .pv3-project-card button {
          min-height: 44px;
          padding: 0 20px;
          border: 1px solid #0056d2;
          cursor: pointer;
          font-weight: 700;
        }

        .pv3-primary {
          background: #0056d2;
          color: #fff;
        }

        .pv3-primary:hover {
          background: #0047b8;
        }

        .pv3-secondary,
        .pv3-link-button,
        .pv3-project-card button {
          background: #fff;
          color: #0056d2;
        }

        .pv3-secondary:hover,
        .pv3-link-button:hover,
        .pv3-project-card button:hover {
          background: #eef4ff;
        }

        .pv3-course-card {
          background: #fff;
          color: #1f1f1f;
          border: 1px solid #d8dce3;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.22);
        }

        .pv3-preview {
          height: 150px;
          background: linear-gradient(135deg, #0056d2, #79a9ff);
          display: grid;
          place-items: center;
          color: #fff;
          font-size: 30px;
          font-weight: 800;
        }

        .pv3-course-card h2 {
          margin: 18px 20px 10px;
          font-size: 18px;
        }

        .pv3-course-card ul {
          margin: 0;
          padding: 0 20px 0 38px;
          color: #333;
          line-height: 1.9;
          font-size: 14px;
        }

        .pv3-card-progress {
          margin: 18px 20px 20px;
          font-size: 13px;
          font-weight: 700;
        }

        .pv3-card-progress div {
          height: 8px;
          margin-top: 8px;
          background: #e5eaf4;
          overflow: hidden;
        }

        .pv3-card-progress i {
          display: block;
          height: 100%;
          background: #0056d2;
        }

        .pv3-tabs {
          position: sticky;
          top: 64px;
          z-index: 15;
          background: #fff;
          border-bottom: 1px solid #d8dce3;
        }

        .pv3-tabs > div {
          display: flex;
          align-items: center;
          gap: 28px;
          min-height: 54px;
        }

        .pv3-tabs button {
          align-self: stretch;
          border: 0;
          border-bottom: 4px solid transparent;
          background: transparent;
          color: #3f4a5f;
          padding: 0 2px;
          cursor: pointer;
          font-weight: 700;
        }

        .pv3-tabs button.is-active {
          color: #0056d2;
          border-bottom-color: #0056d2;
        }

        .pv3-content {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 300px;
          gap: 28px;
          align-items: start;
          padding: 30px 0 70px;
        }

        .pv3-section,
        .pv3-sidebar-card {
          background: #fff;
          border: 1px solid #d8dce3;
          padding: 24px;
        }

        .pv3-main-copy {
          display: grid;
          gap: 20px;
        }

        .pv3-section h2,
        .pv3-sidebar-card h2 {
          margin: 0 0 14px;
          color: #1f1f1f;
          font-size: 24px;
          line-height: 1.2;
        }

        .pv3-section p {
          margin: 0 0 16px;
          color: #4c5262;
          font-size: 15px;
          line-height: 1.65;
        }

        .pv3-outcomes,
        .pv3-stat-grid,
        .pv3-project-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .pv3-outcomes div {
          min-height: 74px;
          border: 1px solid #d8dce3;
          padding: 14px;
          color: #2f3440;
          font-weight: 700;
          line-height: 1.45;
        }

        .pv3-certificate {
          display: flex;
          align-items: center;
          gap: 14px;
          border: 1px solid #d8dce3;
          background: #f8fafd;
          padding: 16px;
        }

        .pv3-certificate strong,
        .pv3-certificate span {
          display: block;
        }

        .pv3-certificate span {
          margin-top: 4px;
          color: #5b6780;
          font-size: 14px;
        }

        .pv3-sidebar-card {
          position: sticky;
          top: 136px;
        }

        .pv3-ring {
          width: 132px;
          height: 132px;
          margin: 12px auto 18px;
          border: 12px solid #dbe8ff;
          border-top-color: #0056d2;
          border-radius: 50%;
          display: grid;
          place-items: center;
          text-align: center;
        }

        .pv3-ring strong,
        .pv3-ring span {
          display: block;
        }

        .pv3-ring strong {
          font-size: 28px;
          color: #0056d2;
        }

        .pv3-ring span {
          color: #5b6780;
          font-size: 13px;
          margin-top: -18px;
        }

        .pv3-sidebar-card .pv3-primary {
          width: 100%;
        }

        .pv3-side-list {
          margin-top: 18px;
          display: grid;
          gap: 8px;
        }

        .pv3-side-list p {
          margin: 0 0 4px;
          color: #5b6780;
          font-size: 13px;
          font-weight: 700;
        }

        .pv3-side-list span {
          border: 1px solid #d8dce3;
          padding: 8px 10px;
          color: #2f3440;
          font-size: 14px;
        }

        .pv3-module-list {
          display: grid;
          gap: 14px;
        }

        .pv3-module {
          border: 1px solid #d8dce3;
        }

        .pv3-module-head {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          padding: 18px;
          border-bottom: 1px solid #d8dce3;
          background: #f8fafd;
        }

        .pv3-module-head span {
          color: #0056d2;
          font-size: 13px;
          font-weight: 700;
        }

        .pv3-module-head h3 {
          margin: 6px 0 0;
          font-size: 19px;
          line-height: 1.25;
        }

        .pv3-module-head strong {
          color: #5b6780;
          font-size: 13px;
          white-space: nowrap;
        }

        .pv3-lessons {
          display: grid;
        }

        .pv3-lessons label {
          min-height: 48px;
          display: grid;
          grid-template-columns: 22px minmax(0, 1fr);
          align-items: center;
          gap: 10px;
          padding: 0 18px;
          border-top: 1px solid #eef1f6;
          cursor: pointer;
        }

        .pv3-lessons label:first-child {
          border-top: 0;
        }

        .pv3-lessons label:hover {
          background: #f8fafd;
        }

        .pv3-lessons input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .pv3-lessons label span {
          width: 18px;
          height: 18px;
          border: 1px solid #8995ad;
          border-radius: 50%;
        }

        .pv3-lessons input:checked + span {
          background: #0056d2;
          border-color: #0056d2;
          box-shadow: inset 0 0 0 4px #fff;
        }

        .pv3-lessons em {
          color: #2f3440;
          font-style: normal;
          font-size: 15px;
        }

        .pv3-project-card,
        .pv3-stat-grid article {
          border: 1px solid #d8dce3;
          background: #fff;
          overflow: hidden;
        }

        .pv3-project-art {
          height: 96px;
          background: #eaf1ff;
          color: #0056d2;
          display: grid;
          place-items: center;
          font-weight: 800;
        }

        .pv3-project-card h3 {
          margin: 16px 16px 8px;
          font-size: 18px;
        }

        .pv3-project-card p {
          margin: 0 16px 16px;
          color: #5b6780;
          font-size: 14px;
        }

        .pv3-project-card button {
          margin: 0 16px 16px;
        }

        .pv3-stat-grid article {
          padding: 18px;
        }

        .pv3-stat-grid p {
          margin: 0 0 8px;
          color: #5b6780;
          font-weight: 700;
          font-size: 13px;
        }

        .pv3-stat-grid strong {
          display: block;
          color: #0056d2;
          font-size: 30px;
          line-height: 1;
          margin-bottom: 8px;
        }

        .pv3-stat-grid span {
          color: #4c5262;
          font-size: 14px;
        }

        .pv3-bars {
          height: 180px;
          display: flex;
          align-items: end;
          gap: 12px;
          border-left: 1px solid #d8dce3;
          border-bottom: 1px solid #d8dce3;
          padding: 14px 12px 0;
        }

        .pv3-bars span {
          flex: 1;
          min-width: 24px;
          background: #0056d2;
        }

        @media (max-width: 980px) {
          .pv3-topnav {
            flex-wrap: wrap;
            padding: 12px 18px;
          }

          .pv3-topnav nav {
            order: 3;
            width: 100%;
            overflow-x: auto;
          }

          .pv3-search {
            min-width: 0;
            flex: 1;
          }

          .pv3-hero-grid,
          .pv3-content {
            grid-template-columns: 1fr;
          }

          .pv3-course-card,
          .pv3-sidebar-card {
            position: static;
          }
        }

        @media (max-width: 680px) {
          .pv3-hero-inner,
          .pv3-content,
          .pv3-tabs > div {
            width: min(100% - 28px, 640px);
          }

          .pv3-topnav nav button:nth-child(3),
          .pv3-search {
            display: none;
          }

          .pv3-hero h1 {
            font-size: 34px;
          }

          .pv3-summary {
            font-size: 16px;
          }

          .pv3-tabs {
            top: 94px;
          }

          .pv3-tabs > div {
            gap: 18px;
            overflow-x: auto;
          }

          .pv3-outcomes,
          .pv3-stat-grid,
          .pv3-project-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <TopNav saved={saved} toggleSaved={toggleSaved} />
      <CourseHero
        enrolled={enrolled}
        setEnrolled={setEnrolled}
        saved={saved}
        toggleSaved={toggleSaved}
        completedCount={completedCount}
        totalLessons={totalLessons}
      />
      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />

      <section className="pv3-content">
        {activeTab === 'overview' && <OverviewTab setActiveTab={setActiveTab} />}
        {activeTab === 'modules' && <ModulesTab completed={completed} toggleLesson={toggleLesson} />}
        {activeTab === 'projects' && <ProjectsTab />}
        {activeTab === 'stats' && <StatsTab />}
        <CourseSidebar
          enrolled={enrolled}
          completedCount={completedCount}
          totalLessons={totalLessons}
          setActiveTab={setActiveTab}
        />
      </section>
    </main>
  )
}
