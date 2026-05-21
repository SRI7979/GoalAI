# PathAI — System Charter

> This file is the single source of truth for the PathAI system architecture. Read it in full at the start of every session before writing or modifying code. Update it at the end of every session to reflect what actually shipped (not what was planned).

---

## 1. Mission

PathAI is the **"learn anything" app**: any user can name any learning goal, and PathAI generates a personalized, adaptive, multi-day path that genuinely teaches them — ending in a verifiable proof that they learned the thing.

The product wins by being:
- **Truly adaptive** — every interaction updates a real model of what the learner knows
- **Pedagogically honest** — never assumes prior knowledge it didn't teach; cites sources for facts
- **Outcome-anchored** — every goal has a real "you proved it" target, not vague completion
- **Domain-agnostic** — handles 8+ fundamental learning modes (code, language, exam prep, etc.) with appropriate pedagogy for each

We are NOT building: a ChatGPT wrapper, a flashcard app, a course marketplace, or a glorified slideshow generator. We are building a **continuously-learning pedagogical system**.

---

## 2. Beachhead Niche (Phase 0 decision)

**Primary niche during build and initial launch:** Adults learning to code from scratch (web development as the entry path).

All design decisions during Phases 1-3 should be optimized for this niche. Other learning modes must be supported architecturally (the system is mode-agnostic) but quality-tuned only after the beachhead niche has product-market fit.

**Proof of mastery for beachhead:** Ship a working personal portfolio site they built themselves, deployed to a live URL, demonstrating use of the core concepts taught in their path.

> Update these two values if your beachhead changes. Every prompt downstream uses them as anchors.

---

## 3. The 12-Prompt Build Sequence

The architecture is built across 12 ordered prompts. Each prompt has a clear scope. **Do not build features that belong to a later prompt.** If the user requests something out of sequence, flag it and confirm before building.

| # | Prompt | What it adds | Status |
|---|--------|--------------|--------|
| 1 | Goal Decomposer + Mode Classification | Every goal gets classified into one of 8 learning modes; scope is estimated; top-level concepts identified | ✅ |
| 2 | Learner State Model | Persistent per-user knowledge state with mastery, confidence, decay, misconceptions per concept | ☐ |
| 3 | Topic Graph (per-goal DAG) | Concepts connected by prerequisites; replaces linear day sequencing | ☐ |
| 4 | Component Library Foundation | 6 core components (`concept_explainer`, `worked_example`, `multiple_choice_quiz`, `free_response`, `flashcard_drill`, `code_predictor`) with shared signal schema | ☐ |
| 5 | Daily Mission Assembler | Replaces single-prompt lesson generation; assembles missions as ordered component sequences from mode-specific recipes | ☐ |
| 6 | Expand Component Library | Adds ~14 mode-specific components (audio, roleplay, sandboxes, mock exams, image identify, etc.) | ☐ |
| 7 | Three-Loop Adaptive Engine | Within-lesson, within-day, cross-day adaptation; reads/writes Learner State | ☐ |
| 8 | Real Diagnostic + Calibration | Adaptive 3-4 question diagnostic at onboarding; populates initial Learner State; reusable for mid-path recalibration | ☐ |
| 9 | Source-Grounding Layer (Tier 2) | Lessons grounded in real sources (Wikipedia, docs, textbooks); every claim traceable | ☐ |
| 10 | Curated Core Slot System (Tier 1) | Schema + admin UI for human-authored expert cores; AI personalizes around them when present | ☐ |
| 11 | Proof of Mastery System | Mode-appropriate completion proof (artifact, mock exam, conversation, etc.); shown to user upfront | ☐ |
| 12 | Outcome Telemetry + Quality Loop | Per-lesson confusion/dropoff/retry tracking; "Hall of Shame" admin view; one-click prompt feedback loop | ☐ |

**When you finish a prompt, mark its status `✅` and append a 2-3 sentence note on what was actually built (and any deviations from the spec).**

**Prompt 1 shipped:** `/api/goals` now enforces decomposition at the API boundary, accepts bare `{ goalText }`, preserves precomputed decompositions when supplied, persists canonical decomposition fields, emits `goal_decomposed`, and soft-falls back to `knowledge_mastery` with `decompositionStatus: 'pending_retry'` when decomposition fails. The live Supabase database has the P1 goal columns, deferred rows were backfilled from `constraints`, and `analytics_events` exists so fallback telemetry persists with `fallback: true`. The schema-lag compatibility path remains in the route as a defensive fallback for unmigrated environments.

---

## 4. The Architecture Map

```
USER TYPES GOAL
       │
       ▼
┌──────────────────────────────┐
│  GOAL DECOMPOSER     [P1]    │
│  • Classify learning mode    │
│  • Estimate scope            │
│  • Build topic graph (P3)    │
│  • Diagnostic (P8)           │
│  • Define proof target (P11) │
└─────────────┬────────────────┘
              │
              ▼
┌──────────────────────────────┐
│  DAILY MISSION ASSEMBLER [P5]│
│  • Reads Learner State (P2)  │
│  • Picks next concepts (P3)  │
│  • Chooses component recipe  │
│    (based on learning mode)  │
│  • Generates each component  │
└─────────────┬────────────────┘
              │
              ▼
┌──────────────────────────────┐
│  COMPONENT LIBRARY  [P4, P6] │
│  ~20 modular pieces          │
│  Each emits ComponentSignal  │
└─────────────┬────────────────┘
              │ (signals)
              ▼
┌──────────────────────────────┐
│  ADAPTIVE ENGINE     [P7]    │
│  • Within-lesson adjust      │
│  • Within-day rebalance      │
│  • Cross-day strategy swap   │
│  • Updates Learner State     │
└─────────────┬────────────────┘
              │
              ▼
┌──────────────────────────────┐
│  PROOF OF MASTERY    [P11]   │
│  • Mode-appropriate evidence │
│  • Real artifact / score     │
└──────────────────────────────┘

      ↑                    ↑
      │                    │
┌──────────────────────────────────┐
│  KNOWLEDGE SOURCE LAYER          │
│  Tier 1: Expert cores      [P10] │
│  Tier 2: Source-grounded   [P9]  │
│  Tier 3: Pure generation         │
└──────────────────────────────────┘

      ↑
      │ (telemetry from every layer)
      │
┌──────────────────────────────────┐
│  TELEMETRY + QUALITY LOOP  [P12] │
└──────────────────────────────────┘
```

---

## 5. Core Data Contracts (PIN THESE — do not deviate)

These are the shapes every prompt reads from and writes to. **If a new prompt needs a field that doesn't exist here, add the field to this charter first, then implement.** Never invent a parallel data structure.

### `LearningMode` (enum, frozen)
```ts
type LearningMode =
  | 'skill_build'        // code, design, writing, music, art
  | 'knowledge_mastery'  // history, biology, philosophy
  | 'exam_prep'          // MCAT, bar, SAT, certifications
  | 'language'           // Spanish, Mandarin, ASL
  | 'procedural'         // cooking, fitness, photography
  | 'conceptual'         // "understand quantum mechanics"
  | 'performance'        // chess, public speaking, sports tactics
  | 'habit'              // meditation, journaling, fitness consistency
```

A goal may have a `primaryMode` and an optional `secondaryModes: LearningMode[]`. Composite goals like "become a data scientist" use both.

### `Goal` (extends current schema)
```ts
type Goal = {
  id: string
  user_id: string
  goal_text: string
  primaryMode: LearningMode               // [P1]
  secondaryModes: LearningMode[]          // [P1]
  estimatedDays: number                   // [P1]
  decomposition: GoalDecomposition        // [P1]
  decompositionStatus: 'ok' | 'pending_retry' // [P1]
  decompositionFailureReason: string | null   // [P1]
  topicGraphId: string                    // [P3]
  proofTarget: ProofTarget                // [P11]
  status: 'active' | 'paused' | 'completed'
  // ...existing fields preserved
}
```

`goal_text` preserves the learner's raw input. `decomposition.cleanedGoalText` stores the normalized version for downstream use. Pre-P1 goal rows may have null decomposition columns until a later backfill.

```ts
type GoalDecomposition = {
  primaryMode: LearningMode
  secondaryModes: LearningMode[]
  estimatedDays: number
  topLevelConcepts: string[]
  cleanedGoalText: string
  confidence: number
  reasoning: string
  decompositionStatus: 'ok' | 'pending_retry'
  failureReason: string | null
}
```

### `LearnerState` (new, [P2])
```ts
type LearnerState = {
  user_id: string
  goal_id: string
  knowledge: Record<ConceptId, ConceptMastery>
  pedagogicalProfile: PedagogicalProfile
  updatedAt: timestamp
}

type ConceptMastery = {
  mastery: number          // 0-1, Bayesian estimate
  confidence: number       // 0-1, learner-reported
  lastPracticed: timestamp
  decayRate: number        // per-concept forgetting rate
  misconceptions: string[] // wrong mental models held
  evidenceLog: EvidenceEvent[]
}

type EvidenceEvent = {
  timestamp: timestamp
  componentType: ComponentType
  signal: ComponentSignal
  conceptIds: ConceptId[]
}

type PedagogicalProfile = {
  optimalSessionMinutes: number
  prefersVisual: boolean
  difficultyPreference: 'easier' | 'balanced' | 'harder'
  strugglesWith: string[]   // patterns surfaced over time
  motivationDrivers: string[]
}
```

**Read via `getLearnerState(userId, goalId)`. Update only via signal events through `applyEvidence(state, event)` — never mutate directly.**

### `TopicGraph` (new, [P3])
```ts
type TopicGraph = {
  id: string
  goal_id: string
  nodes: TopicNode[]
  edges: TopicEdge[]
}

type TopicNode = {
  id: ConceptId
  label: string
  description: string
  difficulty: number       // 0-1
  estimatedMinutes: number
  proofType: ProofType
}

type TopicEdge = {
  from: ConceptId
  to: ConceptId
  type: 'prerequisite' | 'enables' | 'related'
  strength: number         // 0-1
}
```

`ConceptId` is a slug: lowercase, snake_case, deterministic from concept label. Same concept across goals = same ID where possible.

### `Mission` (replaces "lesson", [P5])
```ts
type Mission = {
  id: string
  user_id: string
  goal_id: string
  dayNumber: number
  conceptsTargeted: ConceptId[]
  components: ComponentInstance[]
  estimatedMinutes: number
  proofRequired: boolean
  status: 'pending' | 'in_progress' | 'completed'
}

type ComponentInstance = {
  componentType: ComponentType
  params: Record<string, any>     // type-specific, validated per component
  position: number
  signal?: ComponentSignal        // populated on completion
}
```

### `Component` (registry interface, [P4])
```ts
type ComponentType =
  // Phase 1B core (P4)
  | 'concept_explainer' | 'worked_example' | 'multiple_choice_quiz'
  | 'free_response' | 'flashcard_drill' | 'code_predictor'
  // Phase 1B expansion (P6)
  | 'code_sandbox' | 'code_debugger' | 'audio_listen' | 'audio_speak'
  | 'image_identify' | 'drag_match' | 'order_steps' | 'timed_problem_set'
  | 'roleplay_scenario' | 'case_study_analyze' | 'reflection_prompt'
  | 'do_in_real_world' | 'mock_exam' | 'concept_map_build'

type Component = {
  type: ComponentType
  paramsSchema: JSONSchema           // validates params at insert time
  generatorPrompt: string            // how to generate params from (concept, learner state)
  signalSchema: JSONSchema           // shape of the outcome signal
  render: React.Component            // the UI
}
```

**All components are registered in `src/components/library/index.ts`. The Mission Assembler picks types from this registry. Never instantiate a component type that isn't registered.**

### `ComponentSignal` (universal outcome, [P4])
```ts
type ComponentSignal = {
  componentType: ComponentType
  conceptIds: ConceptId[]
  correct: boolean | null            // null if open-ended
  confidence: number                 // 0-1, learner self-report or inferred
  hesitationMs: number               // time to first interaction
  totalMs: number                    // total time on component
  hintsUsed: number
  attempts: number
  rawResponse?: any                  // component-specific
}
```

Every component MUST emit a signal on completion. The Adaptive Engine consumes these. The Learner State updates from these.

### `ProofTarget` (new, [P11])
```ts
type ProofTarget = {
  mode: LearningMode
  description: string                // shown to user upfront
  evaluationType:
    | 'artifact_submission'          // code, writing, design
    | 'timed_mock_exam'              // exam prep
    | 'live_conversation'            // language
    | 'photo_video_proof'            // procedural
    | 'novel_application'            // conceptual
    | 'ranked_performance'           // performance
    | 'streak_maintained'            // habit
  passCriteria: string[]
  rubric: RubricItem[]
}
```

---

## 6. Naming + Convention Rules

These conventions are non-negotiable. Drift here causes integration breakage.

- **Concept IDs:** lowercase, snake_case, generated deterministically from labels (e.g. `"Variables and Scope"` → `variables_and_scope`). Reuse the same ID for the same concept across goals.
- **The thing the user does each day is a `Mission`,** never `Lesson`, `Day`, or `Slide`. (The current codebase uses `lesson` — Prompt 5 is responsible for the rename.)
- **Learner data is read via `getLearnerState()` and updated via `applyEvidence()`.** Never `setLearnerState()` directly.
- **Components live under `src/components/library/`** and are registered in `src/components/library/index.ts`. One file per component.
- **Mode-specific recipes live under `src/lib/missionRecipes/`,** one file per `LearningMode`.
- **All AI prompts live in `src/lib/prompts/`,** versioned (e.g. `goalDecomposer_v3.ts`). Never inline a prompt > 50 lines in a route handler.
- **Telemetry events use `track(eventName, props)` from `src/lib/analytics.ts`.** Event names are `snake_case`, namespaced by surface (e.g. `mission_component_completed`).
- **Database migrations are additive.** Never drop a column in the same migration that introduces its replacement; deprecate in one PR, drop in a later one.

---

## 7. What Currently Exists vs. What's Being Replaced

The current codebase has been built iteratively. Some of it stays, some gets replaced by the 12 prompts. **Do not extend deprecated systems.**

### Stays (build on top of)
- Authentication, user accounts, Supabase setup
- Dashboard shell, top bar, bottom tab bar (recently upgraded)
- Hearts, gems, badges, streaks, daily quests, weekly challenges (gamification loop)
- XP system, level progression
- Existing component shells: `MultiQuizView`, `FlashcardView`, `ChallengeView`, `ProjectView`, `GuidedPracticeView`, `BossChallengeView`, `AIInteractionView` — to be **migrated into the component library** (Prompt 4/6)
- The `Mascot` system and `pickMessage` utility
- The `PracticeRound` system

### Replaced (do not extend, will be deprecated)
- `lessonGenerator.js` single-shot generation → **replaced by Mission Assembler (P5)** which calls per-component generators
- The "lessons are slideshows" mental model → **replaced by component-assembled missions (P5)**
- `buildVisualConfig` and other generic-diagram fallbacks → **already removed**, do not reintroduce
- Linear day sequencing → **replaced by topic graph traversal (P3)**
- Current onboarding diagnostic → **replaced by adaptive diagnostic (P8)**
- Pure AI lesson generation without source citing → **replaced by source-grounding (P9)** for non-code factual topics
- Goal-as-text-only model → **goal carries `learningMode`, `topicGraphId`, `proofTarget` (P1, P3, P11)**

### Existing systems that will be evolved
- `lessonGate` interactions → become a special case of `ComponentSignal` flow
- `taughtPoints` → become `conceptIds` in the Topic Graph
- Domain adapters (`domainAdapter.js`) → continue to inform mode classification and recipe selection

---

## 8. Hard Rules — "Never Do This"

These are rules learned from past mistakes in this codebase. Violating them creates real bugs.

1. **Never assume knowledge not taught in the same lesson.** Every component generator must respect the `prerequisiteCeiling`: only reference concepts the learner has demonstrated mastery of (or that are taught in the current mission). This is enforced at prompt level.

2. **Never invent a new component type at the call site.** If a need arises, add it to the component registry first, then use it.

3. **Never write to `LearnerState` directly.** Only via `applyEvidence(state, event)`. Direct mutations break the evidence log and adaptive engine.

4. **Never bypass the Goal Decomposer when creating a goal.** Every goal must flow through `decomposeGoal()` before reaching the database.

5. **Never store learner-specific data in component-local React state across sessions.** Components are stateless renderers; all persistent state lives in `LearnerState`.

6. **Never inline an AI prompt over 50 lines in a route handler.** Move to `src/lib/prompts/` with a versioned filename.

7. **Never generate factual content without sourcing for non-trivial topics** (after P9 ships). Code, math, and procedural lessons may generate freely; biology, history, medicine, law, etc. require sources.

8. **Never break the optimistic UI patterns** in the current dashboard (task completion micro-animations, XP rise, streak flame, etc.). These are load-bearing for retention.

9. **Never add a new top-level dashboard tab without explicit approval.** The current 6-tab structure (Home, Cards, Shop, Stats, Path, More) is fixed.

10. **Never run the build with `--no-verify` or skip the typecheck.** If a build fails, fix the cause, don't bypass the check.

11. **Never write a feature without a way to measure whether it works.** Every new user-facing change ships with a telemetry event (P12 makes this rigorous; before then, use the existing `track()` utility).

---

## 9. Per-Session Workflow

Every session follows this protocol:

1. **Read this charter in full** before writing or modifying code.
2. **Identify which prompt this session is executing** (one of the 12, or a maintenance/bug-fix session). State it explicitly at the start.
3. **If the requested work is out of sequence** (e.g. user asks to build adaptive logic during Prompt 4), flag it and confirm before proceeding.
4. **If the requested work requires a new data field or contract not in this charter,** add it to Section 5 first, then implement.
5. **Build the change.** Use the existing data contracts. Wire to existing systems per Section 7.
6. **Test the integration.** Run the build. Fix any errors before declaring done.
7. **Update this charter at the end:**
    - Mark prompt status (`☐` → `🔧 in progress` → `✅`) in Section 3
    - Append a 2-3 sentence note under the prompt row describing what shipped and any deviations
    - If new contracts or rules emerged, add them to Sections 5/6/8

---

## 10. Quality Bar

Every shipped feature must satisfy:

- **Build passes:** `npx next build` clean, no errors, no new warnings introduced
- **Wired to telemetry:** at least one `track()` event for the new surface
- **Reads/writes through canonical APIs:** `getLearnerState`, `applyEvidence`, component registry, etc.
- **Doesn't extend deprecated systems** (Section 7)
- **Doesn't violate hard rules** (Section 8)
- **Charter updated** to reflect what shipped

---

## 11. Out of Scope (do not build until requested)

These are real product needs but explicitly NOT on the 12-prompt path. Do not build them speculatively.

- Multi-user / collaborative learning
- Social features (leaderboards beyond what exists, friends, sharing)
- Mobile native apps (iOS/Android — web-only for now)
- Offline mode
- Voice-driven onboarding
- Live human tutor handoff
- Marketplace for user-created paths
- Enterprise / B2B features
- Internationalization (English only at launch)
- Payment / Stripe integration (this is Phase 4, separate from the 12 prompts)

---

## 12. Glossary (use these terms consistently)

- **Goal** — what the user wants to learn (e.g. "Learn JavaScript")
- **Learning Mode** — one of 8 fundamental pedagogical categories
- **Topic Graph** — DAG of concepts with prerequisites for a goal
- **Concept** — a single learnable unit, identified by `ConceptId`
- **Mission** — what the user does in one day; an ordered sequence of components
- **Component** — one teaching primitive (explainer, quiz, sandbox, etc.) from the registry
- **Signal** — the structured outcome a component emits on completion
- **Learner State** — persistent per-user knowledge and pedagogical profile
- **Mastery** — Bayesian estimate (0-1) of how well the learner knows a concept
- **Proof of Mastery** — the verifiable evidence required to "complete" a goal
- **Curated Core** — human-authored expert lesson content for a top concept
- **Tier 1/2/3** — content sources: expert / source-grounded / pure-generated
- **Recipe** — the per-mode mix of component types and ratios used by the Mission Assembler

---

## 13. Charter Change Log

> Append a one-line entry every time this charter is updated. Most recent at the top.

- `[2026-05-20]` Prompt 1 live migration completed: Supabase goal decomposition columns and `analytics_events` were applied, deferred rows were backfilled, and raw/pre-decomposed/fallback `/api/goals` flows were verified against the live database.
- `[2026-05-18]` Hardened Prompt 1 verification fixes: schema-lag `/api/goals` responses now include canonical decomposition fields, and the pending additive migration now creates `analytics_events` with RLS and indexes; live Supabase migration still requires project-level DB access.
- `[2026-05-18]` Prompt 1 verification fixes shipped in code: `/api/goals` enforces decomposition and soft-fallback, fallback status fields were added to the Goal contract, and additive/backfill migration SQL was added; live Supabase migration remains pending project-level DB access.
- `[2026-05-16]` Corrected auth redirect/session handling: redirect flows read back persisted sessions, immediate-session signups enter onboarding directly, and tokenless onboarding redirects to login before launch.
- `[2026-05-16]` Hardened onboarding auth handoff by explicitly persisting redirect sessions and refreshing near-expired stored sessions before goal creation.
- `[2026-05-16]` Routed goal creation through an authenticated server endpoint so onboarding no longer depends on browser-side RLS inserts.
- `[2026-05-16]` Added Prompt 1 schema-lag compatibility: onboarding can continue against pre-migration goal tables while preserving deferred decomposition JSON in `constraints`.
- `[2026-05-16]` Prompt 1 shipped: added synchronous goal decomposition, persisted decomposition fields, local-goal coverage, and `goal_decomposed` telemetry.
- `[2026-05-15]` Charter initialized. Beachhead niche set to "Adults learning to code from scratch (web dev entry path)" with proof = "ship a deployed personal portfolio site." Awaiting Prompt 1 execution.

---

**End of charter. Read in full before every session. Update at end of every session.**
