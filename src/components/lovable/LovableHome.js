'use client'

// Today's lessons home. Gamification (XP / levels / streaks / gems / weekly chest /
// daily quests) has been removed — this surface is now just the mission hero,
// an energy check-in, and the task list.

import { useState } from 'react'
import {
  Check, Clock, Target, ChevronRight, Sparkles,
  Battery, BatteryMedium, BatteryLow, Zap,
} from 'lucide-react'

const accent = {
  primary: 'var(--color-primary)',
  mint: 'var(--color-mint)',
  coral: 'var(--color-coral)',
  violet: 'var(--color-violet)',
  amber: 'var(--color-amber)',
}

const shadowFor = {
  primary: 'var(--color-primary-shadow)',
  mint: 'oklch(0.5 0.14 165)',
  coral: 'oklch(0.45 0.18 25)',
  violet: 'oklch(0.4 0.17 295)',
  amber: 'oklch(0.55 0.14 80)',
}

const TASK_ACCENTS = ['primary', 'primary', 'coral', 'violet', 'amber']

function ChunkyButton({ variant = 'primary', children, onClick }) {
  const style = variant === 'ghost'
    ? {
        padding: '16px 32px',
        background: 'var(--color-surface)',
        color: 'var(--color-foreground)',
        border: '2px solid var(--color-border)',
        boxShadow: '0 6px 0 0 color-mix(in oklab, var(--color-background) 55%, oklch(0 0 0))',
      }
    : {
        padding: '16px 32px',
        background: 'var(--color-primary)',
        color: 'var(--color-primary-foreground)',
        boxShadow: '0 6px 0 0 var(--color-primary-shadow), 0 12px 24px -8px color-mix(in oklab, var(--color-primary) 55%, transparent)',
      }
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative inline-flex items-center justify-center gap-2 rounded-2xl font-display font-extrabold uppercase tracking-wider select-none transition-all duration-75 ease-out active:translate-y-1 hover:brightness-110 hover:-translate-y-0.5 text-base"
      style={style}
    >
      {children}
    </button>
  )
}

function Chip({ children, icon }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full text-xs font-extrabold border-2"
      style={{ padding: '6px 12px', background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      {icon}
      {children}
    </span>
  )
}

function TaskBrick({ task, index, onClick }) {
  const c = accent[task.accent] ?? accent.primary
  const s = shadowFor[task.accent] ?? shadowFor.primary
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      className="relative overflow-hidden rounded-[20px] border-2 transition-all hover:-translate-y-0.5 active:translate-y-1 group cursor-pointer"
      style={{
        padding: 16,
        background: 'var(--color-surface)',
        borderColor: task.done ? 'color-mix(in oklab, var(--color-mint) 45%, transparent)' : `color-mix(in oklab, ${c} 35%, var(--color-border))`,
        boxShadow: `0 5px 0 0 ${task.done ? 'oklch(0.5 0.14 165)' : s}`,
      }}
    >
      <div className="absolute -right-12 -top-12 size-40 rounded-full blur-3xl opacity-25 group-hover:opacity-40 transition-opacity" style={{ background: task.done ? 'var(--color-mint)' : c }} />
      <div className="relative flex items-center gap-4">
        <div
          className="size-14 md:size-16 grid place-items-center shrink-0 border-2 relative"
          style={{
            borderRadius: 18,
            background: task.done ? 'color-mix(in oklab, var(--color-mint) 24%, transparent)' : `color-mix(in oklab, ${c} 24%, transparent)`,
            borderColor: task.done ? 'color-mix(in oklab, var(--color-mint) 50%, transparent)' : `color-mix(in oklab, ${c} 50%, transparent)`,
            color: task.done ? 'var(--color-mint)' : c,
            boxShadow: `0 3px 0 0 ${task.done ? 'oklch(0.5 0.14 165)' : s}`,
          }}
        >
          {task.done ? <Check className="size-7" strokeWidth={3} /> : <span className="font-display font-extrabold text-xl tabular-nums">{index + 1}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
            <span
              className="text-[10px] uppercase tracking-widest font-extrabold rounded-full border"
              style={{ padding: '2px 8px', background: `color-mix(in oklab, ${c} 16%, transparent)`, borderColor: `color-mix(in oklab, ${c} 38%, transparent)`, color: c }}
            >
              {task.kind}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-semibold">
              <Clock className="size-3" /> {task.minutes}m
            </span>
          </div>
          <h3 className="font-display font-extrabold text-base md:text-lg leading-snug" style={task.done ? { color: 'var(--color-mint)' } : undefined}>{task.title}</h3>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          {task.done ? (
            <span
              className="text-[11px] font-extrabold uppercase tracking-widest rounded-full border-2"
              style={{ padding: '4px 10px', color: 'var(--color-mint)', borderColor: 'color-mix(in oklab, var(--color-mint) 50%, transparent)', background: 'color-mix(in oklab, var(--color-mint) 16%, transparent)' }}
            >
              Done
            </span>
          ) : (
            <ChevronRight className="size-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          )}
        </div>
      </div>
    </div>
  )
}

function splitTitle(title) {
  const words = String(title || 'Today’s mission').trim().split(/\s+/)
  if (words.length <= 2) return { head: '', tail: words.join(' ') }
  return { head: words.slice(0, words.length - 2).join(' '), tail: words.slice(-2).join(' ') }
}

export default function LovableHome({
  goalTitle = 'Master Advanced Python',
  missionTitle,
  tasks = [],
  onContinue,
  onViewPath,
  onTaskClick,
}) {
  const [energy, setEnergy] = useState('good')

  const mappedTasks = (tasks.length ? tasks : [
    { kind: 'GENERATED LESSON', title: 'Understand Python Decorators', minutes: 8, done: false },
    { kind: 'COMPOSITION CANVAS', title: 'Practice: Write a @timer Decorator', minutes: 9, done: false },
    { kind: 'CRITIQUE BOARD', title: 'Check: Recognize Decorator Patterns', minutes: 8, done: false },
    { kind: 'DOMAIN TASK', title: 'Reflect on How Decorators Power Frameworks', minutes: 5, done: false },
  ]).map((t, i) => ({
    kind: (t.kind || t.domainTaskLabel || t.type || 'LESSON').toString().toUpperCase().slice(0, 22),
    title: t.title || 'Today’s task',
    minutes: Number(t.minutes || t.estimatedTimeMin || t.durationMin) || 8,
    done: Boolean(t.done ?? t.completed),
    accent: t.done || t.completed ? 'mint' : TASK_ACCENTS[i % TASK_ACCENTS.length],
    raw: t.raw ?? t,
  }))

  const total = mappedTasks.length || 4
  const totalMin = mappedTasks.reduce((s, t) => s + t.minutes, 0)
  const firstOpen = mappedTasks.find((t) => !t.done)
  const heroTitle = missionTitle || firstOpen?.title || goalTitle
  const { head, tail } = splitTitle(heroTitle)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%', minWidth: 0 }} className="animate-fade-in">
      {/* ===== HERO ===== */}
      <section
        className="relative overflow-hidden rounded-[28px] border-2 shine-overlay"
        style={{
          padding: 32,
          borderColor: 'var(--color-border)',
          background: 'linear-gradient(135deg, color-mix(in oklab, var(--color-primary) 22%, var(--color-surface)) 0%, color-mix(in oklab, var(--color-violet) 18%, var(--color-surface)) 100%)',
          boxShadow: '0 8px 0 0 color-mix(in oklab, var(--color-background) 55%, oklch(0 0 0)), 0 40px 80px -30px oklch(0 0 0 / 0.55)',
        }}
      >
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, color-mix(in oklab, var(--color-primary) 30%, transparent) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
        />
        <div className="relative" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <span className="text-[11px] uppercase tracking-widest font-extrabold" style={{ color: 'var(--color-primary)' }}>Today’s mission</span>

          <h1 className="text-3xl md:text-5xl font-display font-extrabold leading-[1.05] tracking-tight">
            {head ? <>{head}{' '}</> : null}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg, var(--color-primary), var(--color-cyan-glow), var(--color-mint))' }}>{tail}</span>
          </h1>

          <div className="flex flex-wrap gap-2">
            <Chip icon={<Clock className="size-3.5" />}>~{totalMin} min</Chip>
            <Chip icon={<Target className="size-3.5" />}>{total} tasks</Chip>
          </div>

          <div className="flex flex-wrap gap-3">
            <ChunkyButton onClick={onContinue}>Continue mission <ChevronRight className="size-4" /></ChunkyButton>
            <ChunkyButton variant="ghost" onClick={onViewPath}>View path</ChunkyButton>
          </div>
        </div>
      </section>

      {/* ===== ENERGY ===== */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingLeft: 4 }}>
          <div className="rounded-full" style={{ width: 6, height: 20, background: 'var(--color-primary)' }} />
          <h2 className="font-display font-extrabold text-base uppercase tracking-widest">How&apos;s your energy?</h2>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {[
            { id: 'energized', label: 'Energized', icon: Zap, color: 'amber' },
            { id: 'good', label: 'Good', icon: Sparkles, color: 'mint' },
            { id: 'okay', label: 'Okay', icon: Battery, color: 'primary' },
            { id: 'tired', label: 'Tired', icon: BatteryMedium, color: 'violet' },
            { id: 'drained', label: 'Drained', icon: BatteryLow, color: 'coral' },
          ].map((e) => {
            const Icon = e.icon
            const active = energy === e.id
            const c = accent[e.color]
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => setEnergy(e.id)}
                className="inline-flex items-center gap-2 rounded-2xl border-2 text-sm font-extrabold transition-all active:translate-y-0.5"
                style={{
                  padding: '10px 16px',
                  background: active ? `color-mix(in oklab, ${c} 22%, transparent)` : 'var(--color-surface)',
                  borderColor: active ? `color-mix(in oklab, ${c} 55%, transparent)` : 'var(--color-border)',
                  color: active ? c : 'var(--color-foreground)',
                  boxShadow: active ? `0 4px 0 0 ${shadowFor[e.color]}` : '0 4px 0 0 color-mix(in oklab, var(--color-background) 55%, oklch(0 0 0))',
                }}
              >
                <Icon className="size-4" /> {e.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* ===== TASKS ===== */}
      <section>
        <div className="flex items-center" style={{ marginBottom: 12, paddingLeft: 4, gap: 8 }}>
          <div className="rounded-full" style={{ width: 6, height: 20, background: 'var(--color-primary)' }} />
          <h2 className="font-display font-extrabold text-base uppercase tracking-widest">Today&apos;s tasks</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mappedTasks.map((t, i) => (
            <TaskBrick key={`${t.title}-${i}`} task={t} index={i} onClick={() => onTaskClick?.(t.raw, i)} />
          ))}
        </div>
      </section>
    </div>
  )
}
