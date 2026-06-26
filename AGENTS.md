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
| 2 | Learner State Model | Persistent per-user knowledge state with mastery, confidence, decay, misconceptions per concept | ✅ |
| 3 | Topic Graph (per-goal DAG) | Concepts connected by prerequisites; replaces linear day sequencing | ✅ |
| 4 | Component Library Foundation | 6 core components (`concept_explainer`, `worked_example`, `multiple_choice_quiz`, `free_response`, `flashcard_drill`, `code_predictor`) with shared signal schema | ✅ |
| 5 | Daily Mission Assembler | Replaces single-prompt lesson generation; assembles missions as ordered component sequences from mode-specific recipes | ✅ |
| 5.5 | Dynamic Diagram System | Adds the `dynamic_diagram` component with a 3-tier rendering pipeline (structured renderers → Mermaid → sandboxed AI-generated SVG). Quality multiplier: any other component can embed a diagram. Built before P6 so the expansion components can lean on it from day one. | ✅ |
| 5.7 | Coding Domain Renderers + Full AI SVG Lab | Adds coding-focused structured diagram renderers (`code_execution`, `equation_plot`, `algorithm_step`) and a dev-only pure AI SVG experiment surface for comparing unconstrained AI visuals against smart routing | ✅ |
| 5.8 | AI-SVG Standardization | Retires the noisy SVG quality-toggle lab and singles the dev surface down to one standard, domain-aware SVG generator with deterministic helpers across circuits, chess, math, physics, biology, chemistry, and systems | ✅ |
| 5.9 | AI-routed Template SVG Generation | Reintroduces templates as server-side layout engines selected by AI structured output, with freeform SVG preserved for custom spatial diagrams. No regex routing. | ✅ |
| 6 | Expand Component Library | Adds ~14 mode-specific components (audio, roleplay, sandboxes, mock exams, image identify, etc.) | ✅ |
| 7 | Three-Loop Adaptive Engine | Within-lesson, within-day, cross-day adaptation; reads/writes Learner State | ✅ |
| 8 | Real Diagnostic + Calibration | Adaptive 3-4 question diagnostic at onboarding; populates initial Learner State; reusable for mid-path recalibration | ✅ |
| 9 | Source-Grounding Layer (Tier 2) | Lessons grounded in real sources (Wikipedia, docs, textbooks); every claim traceable | ⏸ DEFERRED — POST-LAUNCH |
| 10 | Curated Core Slot System (Tier 1) | Schema + admin UI for human-authored expert cores; AI personalizes around them when present | ⏸ DEFERRED — POST-LAUNCH |
| 11 | Proof of Mastery System | Mode-appropriate completion proof (artifact, mock exam, conversation, etc.); shown to user upfront | ✅ |
| 12 | Outcome Telemetry + Quality Loop | Per-lesson confusion/dropoff/retry tracking; "Hall of Shame" admin view; one-click prompt feedback loop | ✅ |

**When you finish a prompt, mark its status `✅` and append a 2-3 sentence note on what was actually built (and any deviations from the spec).**

### Pre-launch build sequence (revised 2026-05-24)

Prompts **9 and 10 are deferred until post-launch.** The pre-launch build sequence is:

**1 → 2 → 3 → 4 → 5 → 5.5 → 5.7 → 5.8 → 5.9 → 6 → 7 → 8 → 11 → 12**

Reasoning:
- **Prompt 5.5 (Dynamic Diagram System)** is an inserted prompt, not part of the original 12. It lives between P5 and P6 because the P6 expansion components (worked_example, case_study_analyze, concept_explainer enhancements, etc.) are dramatically more powerful when they can embed real diagrams. Building it before P6 means every subsequent component is built knowing diagrams exist. Building it after P6 means retrofitting.
- **Prompt 5.7 (Coding Domain Renderers + Full AI SVG Lab)** is a second inserted prompt for the coding beachhead. It adds deterministic structured renderers for code execution, equation plotting, and algorithm step-throughs, plus a dev-only pure AI SVG lab to evaluate whether unconstrained SVG generation is worth productizing later.
- **Prompt 5.8 (AI-SVG Standardization)** is a dev-lab cleanup prompt, not a production routing change. It removes the high-variance quality-toggle experiment from the active UI and standardizes diagram generation around one reliable path: deterministic static SVG diagrams for common learning domains, then a stronger validated AI SVG fallback for everything else.
- **Prompt 5.9 (AI-routed Template SVG Generation)** keeps P5.8's arbitrary-input goal but makes common layouts cheap and tidy again. The AI chooses a structured template via strict JSON; server-side renderers do the layout, and only genuinely custom visuals fall back to freeform SVG.
- **Prompt 9 (Source Grounding)** matters for fact-heavy academic topics (biology, history, medicine, law). The beachhead niche (adults learning to code from scratch) does not need it — code is self-verifying and AI generates it reliably. Revisit when expanding into fact-heavy domains post-launch.
- **Prompt 10 (Curated Cores)** requires real budget ($5-10k+) to pay experts to author content. Pre-revenue, this is the wrong investment. Quality lever pre-launch is prompt tuning driven by Prompt 12 telemetry. Revisit once revenue exists and the top-vertical concept list is data-informed.

These are deferred, not cancelled. Do not build them speculatively. Do not let scope creep from later prompts pull P9/P10 features back in.

**Prompt 1 shipped:** `/api/goals` now enforces decomposition at the API boundary, accepts bare `{ goalText }`, preserves precomputed decompositions when supplied, persists canonical decomposition fields, emits `goal_decomposed`, and soft-falls back to `knowledge_mastery` with `decompositionStatus: 'pending_retry'` when decomposition fails. The live Supabase database has the P1 goal columns, deferred rows were backfilled from `constraints`, and `analytics_events` exists so fallback telemetry persists with `fallback: true`. The schema-lag compatibility path remains in the route as a defensive fallback for unmigrated environments.

**Prompt 2 shipped:** Added the server-only `src/lib/learnerState.js` canonical read/write path, live Supabase `learner_state` and `pending_evidence` tables, v1 EMA mastery updates, and `/api/complete` evidence writes for server-backed task completions. Evidence updates persist immediately through `applyEvidence()`, failures queue recoverable rows in `pending_evidence`, and `learner_state_updated` / `learner_state_write_failed` telemetry events are wired. Concept IDs are slugged from existing task metadata for now; P3's Topic Graph is expected to reconcile these with canonical concept IDs.

**Prompt 3 shipped:** Added live Supabase `topic_graphs` storage, nullable `goals.topic_graph_id`, server-only topic graph generation/traversal in `src/lib/topicGraph.js`, and strict schema-prompted graph generation in `src/lib/prompts/topicGraph_v1.js`. New goal creation now synchronously generates and persists one immutable per-goal graph, validates references/cycles/disconnected orphan islands with one AI retry, falls back to `pending_retry` empty graphs when generation fails, and emits `topic_graph_generated` plus collision telemetry. Existing pre-P3 goals are not backfilled and continue using the current linear generation path until later prompts consume the graph.

**Prompt 4 shipped:** Added the parallel component library foundation under `src/components/library/` with a JS/JSDoc registry, strict params/signal validation, shared `ComponentShell`, `ComponentRenderer`, and the six core registered components. Added one versioned generator prompt per component plus dev-only generation/evaluation API routes and `/dev/component-library` for isolated dogfooding; existing dashboard task views were left untouched. Follow-up verification fixes added service-role persistence for `component_rendered` / `component_completed`, language-aware `code_predictor` generation with one retry/fallback, and a shared shell loading state used by `free_response`.

**Prompt 5 shipped:** Added live Supabase `missions` storage, `goals.mission_flow_version`, eight mode-specific recipes, the server-only Daily Mission Assembler, mission API routes, and `MissionRunner` rendering P4 components in sequence. New P5-marked goals use `/api/missions/today` to assemble 4-7 component missions from the Topic Graph and Learner State, while pre-P5 goals return the legacy fallback path; component signals write through `applyEvidence()` and mission telemetry/rewards are wired. Follow-up verification fixes made the feature flag a true kill switch by always generating dormant legacy `daily_tasks`, persisted `mission_started` immediately through analytics, and added the live `missions.user_id` foreign key.

**Prompt 5.5 shipped:** Added the registered `dynamic_diagram` component, 10 shared structured SVG renderers, lazy Mermaid rendering, sanitized SVG rendering, the async `/api/dynamic-diagram/generate` endpoint, `EmbeddedDiagram`, and dev-page dogfooding controls. Live Supabase now has `dynamic_diagrams` storage (using nullable text `concept_id` until a canonical concepts table exists), generated diagrams persist with `dynamic_diagram_generated` telemetry, and the required 10-concept smoke test covered structured, Mermaid, and SVG tiers successfully. Follow-up verification fixes added strict per-type Tier 1 structured validation, routed invalid structured data to the key-concept fallback card, and forced `dynamic_diagram_rendered` / `dynamic_diagram_failed` telemetry to persist promptly through analytics.

**Prompt 5.7 shipped:** Added three coding-domain Tier 1 diagram renderers (`code_execution`, `equation_plot`, `algorithm_step`) with strict schemas, deterministic smart-routing for obvious coding concepts, lazy uPlot/KaTeX plotting support, and no integration changes to existing P4/P5 components. Added the dev-only "FULL AI SVG" experiment surface, `/api/dynamic-diagram/full-svg`, `fullAiSvg_v1`, live `full_ai_svg_experiments` storage, compare-against-smart-routing UI, sanitizer reuse with a 200kb cap, malformed-model-JSON SVG recovery, and `full_ai_svg_generated` telemetry. Verification covered the three smart-routing samples, real full-SVG generation/persistence/telemetry paths, and a clean production build; the full five-concept SVG gallery remains a tuning exercise for the dev lab rather than a product dependency.

**Prompt 5.8 shipped:** The diagram dev surface was simplified from many experimental add-ons into one standard component-library generator focused on consistent accuracy. `/api/dynamic-diagram/generate` and `/api/dynamic-diagram/full-svg` now share a strict dynamic SVG generator that calls the configured `fullAiSvg` OpenAI model for each typed concept, validates the output, sanitizes it, and returns it without saving/reuse. Historical experiment tables and older deterministic helper functions may still exist in the codebase because migrations/cleanup are additive, but the active dev path is AI-generated rather than template-routed.

Follow-up maintenance made arbitrary typed concepts first-class: every input now uses grounded AI SVG generation by default instead of a generic concept map or broad regex template. The response validation exposes a concept-grounding check, the dev page removed preset sample chips so the input box is the real test surface, and a static fallback is only available behind an explicit emergency env flag.
The active `fullAiSvg` default is now `gpt-4.1`, chosen as a stronger instruction-following model than the old `gpt-4o` default while staying cheaper on token pricing. The SVG prompt now explicitly enforces PathAI theming, rounded panels/callouts, layout margins, leader lines, and non-overlapping labels.
Diagram layout validation now reports common readability failures before a diagram reaches the dev surface: text outside the canvas, labels closer than 24px, long unwrapped labels, visual clutter, crowded captions, and overlapping small callout boxes. These checks drive repair attempts and best-output selection without deleting accurate content just to satisfy a heuristic.
The normal SVG path no longer falls back to the generic concept-map renderer when generation or validation fails; it repairs with AI up to three attempts, auto-fits SVG content into the canvas, and then surfaces a real error rather than showing a misleading fake diagram. The bounds validator now understands the transform wrapper used by auto-fit, so repaired diagrams are checked against what the browser actually renders.

**Prompt 5.9 shipped:** `/api/dynamic-diagram/full-svg` now uses one AI structured-output call to choose between deterministic SVG template layout engines and the existing freeform SVG path. Added pure server-side renderers for reused diagram types plus new full-SVG-only templates (`venn`, `number_line`, `table`, `state_machine`, `bar_chart`), with template/freeform telemetry surfaced in the route response and dev page. Old deterministic helper functions may still exist historically, but the active path does not route by regex or keyword matching.

**Prompt 5.9 follow-up shipped:** Added a devtool-only lesson visual planner for the `New Lesson slideshow` so all diagram slots can be planned in one context-aware call before rendering. The active `/ui-devtool/cs-python` preview now uses that lesson-aware AI SVG plan inside a premium full-screen lesson player, hides learner-facing dev metadata, and keeps latency lower by generating all lesson visuals in one contextual request.

**Prompt 6 shipped:** Added the 14 P6 expansion components to the component library registry with strict params schemas, versioned prompt wrappers, renderer implementations, fallback params, and universal `ComponentSignal` emission through `ComponentShell`. The mission recipes now use the expanded component set directly instead of P5 substitution placeholders, so future missions can include sandboxes, debuggers, audio tasks, image identification, ordering, matching, mock exams, roleplay, case studies, reflections, real-world tasks, and concept-map building. Also cleaned the component shell/diagram React purity issues so `npx eslint` and `npx next build` both pass clean.

**Prompt 7 shipped:** Added `src/lib/adaptiveEngine.js` with cross-day recipe biasing, within-lesson recovery decisions, adaptive component insertion, and `adaptive_decision_made` telemetry. `MissionRunner` now accepts server-returned adaptive inserts after a component signal, and `applyEvidence()` updates the pedagogical profile through the adaptive engine instead of only touching concept mastery. V1 remains intentionally conservative: it inserts short recovery explainers/worked examples and adjusts recipe weights rather than doing full real-time mission reassembly.

**Prompt 8 shipped:** Added server-only diagnostic calibration at `src/lib/diagnosticCalibration.js`, versioned diagnostic prompts, reusable `/api/diagnostic/start` and `/api/diagnostic/submit` endpoints, and onboarding calibration persistence through `/api/diagnostic/calibrate`. Onboarding now converts the learner's goal-specific calibration answers into canonical evidence after the goal and topic graph exist, seeding initial concept mastery and pedagogical profile through `applyEvidence()` rather than direct learner-state writes.

**Prompt 11 shipped:** Added mode-aware proof target generation at goal creation, persisted upfront proof targets on goals, and created `proof_submissions` storage for learner evidence and AI evaluation. Added `/api/proof-target` and `/api/proof-submit`, proof telemetry, proof evidence writes through `applyEvidence()`, goal-completion marking on passed proof, and dashboard/portfolio surfaces for proof visibility. The v1 submission UI is API-first; richer learner-facing proof submission flows can be layered on top without changing the contract.

**Prompt 12 shipped:** Added durable outcome quality tracking with live `quality_issues` and `prompt_feedback_items` tables, automatic issue extraction from analytics events, component confusion/dropoff telemetry, and `/api/quality/issues`. Added a gated `/dev/quality` Hall of Shame view that syncs recent telemetry, ranks issues by severity, maps failures back to prompt files, and queues one-click prompt feedback. This is the v1 quality loop: it stores actionable feedback and telemetry, but applying prompt edits remains a human/developer step.

**Primary learner surface maintenance status:** The chunk-1 default-mission rollout was reverted. Mission flow is again opt-in: `PATHAI_MISSIONS_ENABLED=true` plus `mission_flow_version='p5'`; graph-backed goals without that marker use the legacy `daily_tasks` dashboard flow. The read-only `/api/learning-status` bridge remains available for status/adaptation summaries, but it should not force mission UI on graph-only goals.

### Prompt 6 acceptance check (pass/fail)

> Hand this section to Codex after P6 implementation is complete. Codex must mark each item PASS or FAIL with a one-line evidence note (file path, grep result, or command output). All items must PASS before flipping the §3 P6 status from ☐ to ✅.

**The 14 P6 component types** (per §5 `ComponentType` union):
`code_sandbox`, `code_debugger`, `audio_listen`, `audio_speak`, `image_identify`, `drag_match`, `order_steps`, `timed_problem_set`, `roleplay_scenario`, `case_study_analyze`, `reflection_prompt`, `do_in_real_world`, `mock_exam`, `concept_map_build`.

**Per-component checks** (run all 8 for each of the 14 component types):

1. **File**: `src/components/library/<componentType>.js` exists and has a default export.
2. **Registry**: The component is registered in `src/components/library/index.js` / `registry.js`. `getComponent('<componentType>')` returns the registered object.
3. **Shape**: The registered object has all 5 fields per the §5 `Component` contract: `type`, `paramsSchema`, `signalSchema`, `generatorPrompt`, `render`.
4. **Params schema**: A strict JSON schema for the component's params is defined and exported from `src/components/library/schemas.js`, and is the same object referenced by the component's `paramsSchema` field.
5. **Generator prompt**: A versioned generator prompt file exists at `src/lib/prompts/components/<componentName>_v<N>.js`, exporting a `build<ComponentName>Prompt` function and a `*_RESPONSE_FORMAT` json_schema constant.
6. **Generator wiring**: The component's generator entry exists in `src/lib/componentGenerator.js` `COMPONENT_GENERATORS`, and `generateComponentParams({ componentType: '<componentType>', ... })` returns schema-valid params (with `fallback: true` permitted).
7. **Fallback params**: `buildFallbackComponentParams('<componentType>', concept)` returns an object that passes `validateGeneratedParams('<componentType>', params)` with `ok: true`.
8. **Signal emission**: The `render` component calls `emitSignal` on completion with the full §5 `ComponentSignal` shape (`correct`, `confidence`, `hesitationMs`, `totalMs`, `hintsUsed`, `attempts`). Components that route signal capture through `ComponentShell` satisfy this automatically.

**Cross-cutting checks** (single PASS/FAIL each):

9. **Recipes**: At least one mission recipe under `src/lib/missionRecipes/` references each new component type in its `componentMix` (any non-zero weight is sufficient). No charter-mode is left with zero P6 components in its mix.
10. **MissionRunner renders**: For every new component type, `MissionRunner` → `ComponentRenderer` resolves the component without falling through to the "Unknown component" error path.
11. **No deprecated extensions**: `git diff main` shows no new code added to `src/lib/lessonGenerator.js`, `src/components/LessonView.js`, `src/lib/conceptSlideshow.js`, or any `src/app/path-view*` directory. No `src/app/path-view-4*` created (per §8 hard rule #12).
12. **No inline AI prompts**: No file under `src/app/api/` contains an inline AI prompt longer than 50 lines. All P6 prompts live under `src/lib/prompts/components/`.
13. **No direct LearnerState writes**: Grep across `src/` shows no new direct writes to `learner_state` outside `applyEvidence()` (per §8 hard rule #3).
14. **Telemetry**: Each new component fires `component_rendered` and `component_completed` (handled by `ComponentShell` — verify no new component bypasses the shell).
15. **No new dashboard tabs**: The 6-tab dashboard structure (Home, Cards, Shop, Stats, Path, More) is unchanged.
16. **Build clean**: `npx next build` exits 0 with no errors and no new warnings vs. `main`.
17. **Lint clean**: `npx eslint` exits 0.
18. **Charter updated**: §3 P6 row marked ✅ with a 2-3 sentence shipped note. §5 `ComponentType` union unchanged (the 14 types were already declared). §13 has a dated changelog line.

**Output format Codex must produce**:

| # | Check | Component | Result | Evidence |
|---|---|---|---|---|
| 1 | File exists | code_sandbox | PASS | `src/components/library/code_sandbox.js` |
| … | … | … | … | … |
| 16 | Build clean | — | PASS | `npx next build` exit 0 |

Any FAIL keeps §3 P6 at ☐ or 🔧 in progress. Do not flip to ✅ until every row is PASS.

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
  topicGraphId: string | null             // [P3]
  missionFlowVersion: 'p5' | null          // [P5] null/absent means legacy daily_tasks flow
  proofTarget: ProofTarget                // [P11]
  proofTargetStatus: 'ok' | 'pending_retry' | 'failed' // [P11]
  proofTargetFailureReason: string | null  // [P11]
  status: 'active' | 'paused' | 'completed'
  // ...existing fields preserved
}
```

`goal_text` preserves the learner's raw input. `decomposition.cleanedGoalText` stores the normalized version for downstream use. Pre-P1 goal rows may have null decomposition columns until a later backfill.
`topicGraphId` is nullable for pre-P3 goals and any graph-generation fallback environments.

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
  mastery: number          // 0-1, v1 EMA estimate; tuned later in P7
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

type PendingEvidence = {
  id: string
  user_id: string
  goal_id: string
  event: EvidenceEvent
  failureReason: string
  source: string
  status: 'pending' | 'processed' | 'failed'
  createdAt: timestamp
  processedAt: timestamp | null
}
```

**Read via `getLearnerState(userId, goalId)`. Update only via signal events through `applyEvidence(state, event)` — never mutate directly.**

### `DiagnosticCalibration` (new, [P8])
```ts
type DiagnosticCalibration = {
  id: string
  goalId: string
  source: 'ai' | 'fallback'
  version: string
  questions: DiagnosticQuestion[]
  estimatedMinutes: number
}

type DiagnosticQuestion = {
  id: string
  conceptId: ConceptId
  prompt: string
  options: string[]
  correctIndex: number
  difficulty: number
  explanation: string
}

type DiagnosticResponse = {
  questionId: string
  selectedIndex: number
  selectedOption?: string
  hesitationMs?: number
  totalMs?: number
}
```

Diagnostics are reusable calibration surfaces. Start them through `/api/diagnostic/start`, submit them through `/api/diagnostic/submit`, and convert onboarding calibration answers through `/api/diagnostic/calibrate`. All diagnostic writes become `ComponentSignal` evidence and flow through `applyEvidence()`; diagnostics never mutate `LearnerState` directly.

### `TopicGraph` (new, [P3])
```ts
type TopicGraph = {
  id: string
  goal_id: string
  nodes: TopicNode[]
  edges: TopicEdge[]
  generationStatus: 'ok' | 'pending_retry' | 'failed'
  generationFailureReason: string | null
  createdAt: timestamp
  updatedAt: timestamp
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
Topic graphs are generated once at goal creation and are immutable in v1. Pre-P3 goals are not backfilled; code must gracefully handle goals with no graph.

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
  status: 'pending' | 'in_progress' | 'completed' | 'abandoned'
  generationStatus: 'ok' | 'pending_retry' | 'failed'
  generationFailureReason: string | null
  createdAt: timestamp
  updatedAt: timestamp
  completedAt: timestamp | null
}

type ComponentInstance = {
  componentType: ComponentType
  conceptIds?: ConceptId[]           // [P5] concepts this component writes evidence for
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
  // Phase 1B visual insert (P5.5)
  | 'dynamic_diagram'
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

**All components are registered in `src/components/library/index.js` in this JS codebase. The Mission Assembler picks types from this registry. Never instantiate a component type that isn't registered.**

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

### `DynamicDiagram` (new, [P5.5])
```ts
type DynamicDiagramParams =
  | { tier: 'structured', diagramType: StructuredDiagramType, data: Record<string, any>, title: string, fallbackText: string }
  | { tier: 'mermaid', code: string, title: string, fallbackText: string }
  | { tier: 'svg', svg: string, title: string, fallbackText: string }
  | { tier: 'none', reason: string, title: string, fallbackText: string }

type StructuredDiagramType =
  | 'flowchart' | 'hierarchy' | 'comparison' | 'timeline' | 'cycle'
  | 'layered_stack' | 'quadrant' | 'network' | 'equation_breakdown'
  | 'annotated_callouts'
  | 'code_execution' | 'equation_plot' | 'algorithm_step' // [P5.7] coding-domain structured renderers
```

Dynamic diagrams are generated through `/api/dynamic-diagram/generate` and rendered by the registered `dynamic_diagram` component or the reusable `<EmbeddedDiagram />` helper. The current dev-first visual generator returns sanitized static SVG payloads without saving/reusing diagrams; older `dynamic_diagrams` storage may still exist historically. Tier 3 SVG must be sanitized before rendering; any tier failure falls back to a key-concept card and emits `dynamic_diagram_failed`.

```ts
type StandardVisualDiagram = {
  title: string
  svg: string              // sanitized before rendering
  visualKind: string       // e.g. ai_svg, template_flowchart, template_table
  source: 'deterministic' | 'ai' | 'fallback'
  modelUsed: string
  templateKind?: StandardVisualKind
  templatePath?: 'template' | 'freeform'
  sizeKb: number
  validationReport: { passed: boolean, checks: any[] }
}

type StandardVisualKind =
  | 'flowchart' | 'cycle' | 'hierarchy' | 'timeline' | 'comparison'
  | 'layered_stack' | 'quadrant' | 'network' | 'equation_breakdown'
  | 'annotated_callouts' | 'code_execution' | 'algorithm_step'
  | 'venn' | 'number_line' | 'table' | 'state_machine' | 'bar_chart'
  | 'freeform'

type StandardVisualGenerationResponse =
  | { kind: 'freeform', title: string, svg: string } // all template payload keys are null in the OpenAI strict envelope
  | { kind: Exclude<StandardVisualKind, 'freeform'>, title: string } // matching payload key is populated; `svg` and unused keys are null
```

Standard visual diagrams are dev-only for now and generated through `/api/dynamic-diagram/generate` (component payload) or `/api/dynamic-diagram/full-svg` (raw inspector). The active full-SVG path is AI-routed: the model returns either a structured template payload or `kind: 'freeform'`; server-side SVG template renderers handle common layouts deterministically, and freeform SVG remains the escape hatch for chess, circuits, anatomy, molecules, and custom spatial diagrams. There is no regex/keyword routing in the active path; outputs are validated, sanitized, and emit template/freeform telemetry.

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
  generationStatus: 'ok' | 'pending_retry' | 'failed'
  generationFailureReason: string | null
}

type ProofSubmission = {
  id: string
  user_id: string
  goal_id: string
  proofTarget: ProofTarget
  submission: Record<string, any>
  evaluation: {
    passed: boolean
    score: number
    feedback: string
    rubricResults: { id: string, score: number, passed: boolean, feedback: string }[]
    strengths: string[]
    gaps: string[]
    nextSteps: string[]
  }
  score: number
  passed: boolean
  status: 'submitted' | 'needs_revision' | 'passed' | 'failed'
  createdAt: timestamp
  updatedAt: timestamp
  evaluatedAt: timestamp | null
}
```

Proof targets are generated when a goal is created and may soft-fallback with `generationStatus: 'pending_retry'` without blocking goal creation. Proof submissions are evaluated through `/api/proof-submit`; passed proofs write canonical evidence through `applyEvidence()` and mark the goal completed.

### `QualityIssue` and `PromptFeedbackItem` (new, [P12])
```ts
type QualityIssue = {
  id: string
  sourceEventId: string | null
  eventName: string | null
  userId: string | null
  goalId: string | null
  missionId: string | null
  componentType: ComponentType | null
  conceptIds: ConceptId[]
  issueType:
    | 'confusion'
    | 'dropoff'
    | 'retry'
    | 'low_confidence'
    | 'incorrect'
    | 'generation_failed'
    | 'evidence_write_failed'
    | 'mission_underperformed'
    | 'proof_failed'
    | 'manual'
  severity: 1 | 2 | 3 | 4 | 5
  title: string
  evidence: Record<string, any>
  status: 'open' | 'feedback_queued' | 'fixed' | 'dismissed'
  promptKey: string | null
  promptFile: string | null
  suggestedFeedback: string | null
  createdAt: timestamp
  updatedAt: timestamp
  resolvedAt: timestamp | null
}

type PromptFeedbackItem = {
  id: string
  qualityIssueId: string
  promptKey: string | null
  promptFile: string | null
  feedback: string
  status: 'queued' | 'applied' | 'dismissed'
  createdAt: timestamp
  updatedAt: timestamp
}
```

Quality issues are derived from `analytics_events` by `src/lib/outcomeQuality.js` and are viewed through `/dev/quality`. Prompt feedback is queued, not auto-applied; a developer still reviews the issue and edits the relevant prompt intentionally.

---

## 6. Naming + Convention Rules

These conventions are non-negotiable. Drift here causes integration breakage.

- **Concept IDs:** lowercase, snake_case, generated deterministically from labels (e.g. `"Variables and Scope"` → `variables_and_scope`). Reuse the same ID for the same concept across goals.
- **Topic graph concept ID collisions:** within one graph, duplicate slug IDs are resolved by appending numeric suffixes (`foo`, `foo_2`, `foo_3`) and emitting `topic_graph_id_collision`.
- **Prompt 2 concept IDs are provisional:** until P3 ships the Topic Graph, task completions derive concept IDs from existing `conceptIds`, `taughtPoints`, `covered_topics`, or title fallback. P3 is responsible for reconciling these against canonical graph IDs.
- **The thing the user does each day is a `Mission`,** never `Lesson`, `Day`, or `Slide`. (The current codebase uses `lesson` — Prompt 5 is responsible for the rename.)
- **P5 rollout marker:** only goals with `mission_flow_version = 'p5'` use the Mission Assembler. Goals with null/absent `mission_flow_version` keep the legacy `daily_tasks` flow even if they have a Topic Graph.
- **Learner data is read via `getLearnerState()` and updated via `applyEvidence()`.** Never `setLearnerState()` directly.
- **Components live under `src/components/library/`** and are registered in `src/components/library/index.js`. One file per component.
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

### Dead surfaces — do not extend, scheduled for removal
These exist in the codebase but are not part of the live product. Do not add features to them. They will be deleted in a dedicated cleanup pass.
- `src/app/path-view/`, `src/app/path-view-2/`, `src/app/path-view-3/` — three abandoned path-visualization experiments. The active path surface is the `ConceptHeatMap` component on the dashboard. If a new path visualization is needed, extend the heatmap or replace it cleanly — do not add `path-view-4`.
- `src/app/practice-gallery/` — empty skeleton, never wired.
- `src/app/uiDevtool/` — internal UI playground, not user-facing.
- `src/app/demo/` — demo routes, not production.
- `DiscussionView`, `VideoView`, `ReadingView` — implemented components that are imported but rarely rendered. Do not extend; flag for removal during the cleanup pass.

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

7. **Never generate factual content without sourcing for non-trivial topics** (after P9 ships). Code, math, and procedural lessons may generate freely; biology, history, medicine, law, etc. require sources. **Pre-launch:** P9 is deferred, so the system is restricted to topics where pure AI generation is acceptable (coding-focused beachhead). Do not invite users into fact-heavy domains until P9 ships post-launch.

8. **Never break the optimistic UI patterns** in the current dashboard (task completion micro-animations, XP rise, streak flame, etc.). These are load-bearing for retention.

9. **Never add a new top-level dashboard tab without explicit approval.** The current 6-tab structure (Home, Cards, Shop, Stats, Path, More) is fixed.

10. **Never run the build with `--no-verify` or skip the typecheck.** If a build fails, fix the cause, don't bypass the check.

11. **Never write a feature without a way to measure whether it works.** Every new user-facing change ships with a telemetry event (P12 makes this rigorous; before then, use the existing `track()` utility).

12. **Never create a new top-level page or directory for what could be a variant of an existing surface.** The codebase already has three abandoned `path-view*` directories — do not add a fourth. If an existing surface needs to evolve, extend it or replace it cleanly in place. Parallel "v2" surfaces always become dead code and never get cleaned up.

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
- **Mastery** — v1 EMA estimate (0-1) of how well the learner knows a concept; P7 may tune the model
- **Proof of Mastery** — the verifiable evidence required to "complete" a goal
- **Curated Core** — human-authored expert lesson content for a top concept
- **Tier 1/2/3** — content sources: expert / source-grounded / pure-generated
- **Recipe** — the per-mode mix of component types and ratios used by the Mission Assembler

---

## 13. Charter Change Log

> Append a one-line entry every time this charter is updated. Most recent at the top.

- `[2026-06-21]` Dashboard cleanup: removed the learner-facing energy selector and Daily quests card from the dashboard home surface, leaving the core mission/task flow visible without the extra clutter.
- `[2026-06-21]` Dashboard bug sweep: cleared generated Next/cache artifacts after disk exhaustion caused dev-server 500s, made `/api/course-outline-recover` fail softly instead of surfacing dashboard 500s, and added a visible/Escape close path to the dashboard task preview.
- `[2026-06-21]` Login maintenance: `/api/auth/login` now uses the Supabase server auth client directly and returns structured JSON errors instead of raw 500 responses, restoring sign-in feedback and preventing the login page from falling back to a generic failure.
- `[2026-06-13]` Dashboard Lovable exact-composition pass: tightened the authenticated dashboard toward the supplied Lovable reference with reference-sized shell/rail/hero geometry, league/day hero badges, task-title hero copy, stronger cyan game-card styling, and Playwright screenshot setup for visual QA.
- `[2026-06-12]` Lovable dashboard reference pass: mapped the learner dashboard to the Lovable preview token system (Sora/Inter, deep navy surfaces, cyan primary, chunky card-glow borders, compact rail, and game-like stat/task cards) while preserving existing dashboard behavior and the no-mascot direction.
- `[2026-06-12]` Appearance palette engine maintenance: added a learner-facing `/appearance` page, storage-compatible app-wide palette persistence through `pathai:palette`, three additional popular palettes, shadcn-compatible runtime token aliases, and a More-tab entry without changing the fixed dashboard tab structure.
- `[2026-06-12]` Dashboard UI/UX revamp: expanded the learner-facing dashboard into a cohesive Duolingo/Brilliant-inspired surface with a stronger Today Quest stage, premium mission/task cards, polished support panels, improved side rail, and cleaner energy/quest/reward hierarchy without changing learning flow logic.
- `[2026-06-12]` UI/UX theme maintenance: expanded the learner palette library, made More-tab palette switching app-wide through runtime theme hydration and legacy token aliases, hid dashboard developer shortcuts behind an env flag, and made premium frames/component shells respect selected palettes.
- `[2026-06-06]` Reverted chunk-1 mission rollout behavior: missions are no longer default-on for every graph-backed goal; dashboard and `/api/missions/today` now require explicit `mission_flow_version='p5'` with `PATHAI_MISSIONS_ENABLED=true`.
- `[2026-06-01]` Primary learner surface maintenance: missions are the default learner flow for graph-backed goals, mission components can include diagrams, the mission/player UI was polished, and the dashboard now surfaces mastery/proof/adaptation status via `/api/learning-status`.
- `[2026-06-01]` Prompt 12 shipped: added quality issue extraction from telemetry, component confusion/dropoff tracking, live quality-loop tables, `/api/quality/issues`, `/dev/quality` Hall of Shame, and queued prompt feedback items.
- `[2026-06-01]` Prompt 11 shipped: added upfront proof targets, proof submission/evaluation APIs, live `proof_submissions` storage, canonical proof evidence writes, dashboard/portfolio proof visibility, and proof telemetry.
- `[2026-06-01]` Prompt 8 shipped: added reusable diagnostic start/submit APIs and onboarding calibration writes that seed Learner State through canonical evidence events.
- `[2026-06-01]` Prompt 7 shipped: added the adaptive engine for cross-day recipe biasing, within-lesson recovery inserts, pedagogical profile updates, and adaptive decision telemetry.
- `[2026-05-31]` Prompt 6 shipped: added all 14 expansion components with strict schemas, versioned prompt wrappers, registry entries, fallback params, dev-page coverage, recipe usage, and clean lint/build verification.
- `[2026-05-31]` New Lesson slideshow AI visual polish: `/ui-devtool/cs-python` now uses the lesson-aware AI SVG planner inside the premium full-screen player, renders planned diagrams without developer metadata, and keeps all diagram generation to one contextual request for the slideshow.
- `[2026-05-31]` Prompt 5.9 follow-up: added devtool-only lesson-aware diagram planning for the New Lesson slideshow, with one context-rich planner call, direct planned SVG rendering, template/freeform metadata, and local fallback-only failure behavior.
- `[2026-05-31]` Prompt 5.9 shipped: added AI-routed template SVG generation with strict structured outputs, pure server-side template renderers, five new full-SVG-only templates, freeform fallback, and template/freeform telemetry with no regex routing.
- `[2026-05-30]` AI SVG text/diagram overlap tuning: strengthened the active SVG prompt to reserve label-safe zones before routing wires/arrows/curves and added advisory text-connector overlap detection so repair attempts improve premium layout without turning overlap into a hard rejection.
- `[2026-05-30]` AI SVG exact graph recipe tuning: the active SVG prompt now gives coordinate-level construction guidance for gradient descent/loss-curve diagrams, including fixed plot bounds, callout box positions, leader-line behavior, and valley orientation to improve first-attempt formatting without adding new rejection gates.
- `[2026-05-30]` AI SVG first-pass layout tuning: updated the active SVG prompt to reserve label lanes before drawing, keep graph callouts out of plotted geometry, and handle gradient-descent/loss-curve diagrams with correct U-shaped valley orientation without adding stricter rejection rules.
- `[2026-05-30]` AI SVG grounding validator fix: concept grounding now extracts the actual requested subject from full user diagram prompts and ignores formatting boilerplate like "create one clean static educational SVG" so valid diagrams are not rejected for missing instruction words.
- `[2026-05-30]` AI SVG rate-limit hardening: dynamic diagram endpoints now return explicit 429/rate-limit responses with retry guidance, default repair attempts were reduced, embedded diagrams gained retry UI, and the UI devtool lesson preview has relevant local diagram backups so rate limits do not blank the lesson demo.
- `[2026-05-30]` Diagram SVG cleanup tuning: tightened the active SVG prompt around a single clean frame, restrained labels, fewer nested boxes, plain axis labels, caption zones, and added advisory visual-clutter/caption-zone validation for repair scoring.
- `[2026-05-30]` UI devtool preview update: added a temporary `New Lesson slideshow` demo to `/ui-devtool/cs-python` that shows a static Python-variable lesson with embedded dynamic SVG diagrams in the lesson flow.
- `[2026-05-30]` Diagram repair hardening: removed the normal deterministic concept-map fallback on SVG generation failure, added transform-aware bounds validation for auto-fitted SVGs, and strengthened the prompt to choose one clean layout template before drawing.
- `[2026-05-29]` Diagram SVG quality tuning: shifted layout rules from hard rejection to advisory repair feedback, strengthened accuracy/layout planning in the SVG prompt, and lowered `fullAiSvg` generation temperature for cleaner, more consistent diagrams.
- `[2026-05-28]` Diagram layout validation tightened: added prompt and validator enforcement for no overlapping boxes, no off-canvas text, 24px label spacing, label minimization, and wrapped/captioned long text.
- `[2026-05-28]` Diagram generator template-routing fix: removed deterministic template routing from the active `/api/dynamic-diagram/*` path so every typed concept now generates a fresh AI SVG via the configured `fullAiSvg` model, with static fallback gated behind an explicit emergency env flag.
- `[2026-05-28]` Diagram quality/model update: changed the `fullAiSvg` fallback model to `gpt-4.1` and tightened the SVG prompt around PathAI colors, rounded UI shapes, margins, callout labels, and non-overlapping text.
- `[2026-05-28]` Diagram generator arbitrary-input fix: enabled grounded AI SVG fallback by default for unrecognized typed concepts, added a deterministic number-line/inequality renderer, surfaced concept-grounding validation, and removed preset chips from the component-library diagram test UI.
- `[2026-05-28]` Diagram generator cleanup: replaced persisted/full-SVG experiment behavior with one no-save static SVG visual router used by both `/api/dynamic-diagram/generate` and `/api/dynamic-diagram/full-svg`, with deterministic renderers across common learning domains and strict AI fallback validation.
- `[2026-05-26]` Prompt 5.8 cleanup: retired the FULL AI SVG quality-toggle/gold-library experiment from active runtime and standardized `/api/dynamic-diagram/full-svg` around deterministic circuit/chess/math/physics SVGs plus one validated AI fallback path.
- `[2026-05-26]` Prompt 5.7 fix: hardened `/api/dynamic-diagram/full-svg` against malformed model JSON by extracting complete SVG payloads from raw responses, sanitizing them, and returning recovered diagrams instead of surfacing parser internals in the dev lab.
- `[2026-05-26]` Prompt 5.7 shipped: added coding-domain structured diagram renderers (`code_execution`, `equation_plot`, `algorithm_step`), deterministic smart routing for matching concepts, the dev-only FULL AI SVG lab with compare-both UI, `/api/dynamic-diagram/full-svg`, live `full_ai_svg_experiments` storage, and `full_ai_svg_generated` telemetry.
- `[2026-05-25]` Prompt 5.5 shipped: added the registered `dynamic_diagram` component, 10 structured renderers, lazy Mermaid and sanitized SVG tiers, `/api/dynamic-diagram/generate`, `EmbeddedDiagram`, live `dynamic_diagrams` storage, dev-page dogfooding, and generated/fallback telemetry; verified the required 10 concepts across structured/Mermaid/SVG tiers.
- `[2026-05-25]` Prompt 5.5 verification fixes shipped: added strict per-type Tier 1 schemas, invalid-structured-data fallback wiring, and persisted rendered/failed dynamic diagram telemetry.
- `[2026-05-25]` Prompt 5 verification fixes shipped: `/api/generate` now always creates legacy `daily_tasks` as a kill-switch backup for P5 goals, `mission_started` telemetry flushes immediately, and live Supabase now enforces `missions.user_id -> auth.users(id)` with cascade delete.
- `[2026-05-25]` Prompt 5 shipped: added the live `missions` table, `mission_flow_version` rollout marker, server-only Daily Mission Assembler, mode recipes, mission APIs, MissionRunner, P5 dashboard cutover, learner-state evidence writes, and mission telemetry/rewards while preserving legacy daily_tasks for old goals.
- `[2026-05-24]` Inserted Prompt 5.5 (Dynamic Diagram System) between P5 and P6. Adds a `dynamic_diagram` component with a 3-tier rendering pipeline (structured renderers → Mermaid → sandboxed AI-generated SVG) so any component in P6+ can embed real diagrams. Pre-launch sequence was revised here and later revised again by P5.7; current sequence lives in Section 3.
- `[2026-05-24]` Prompt 4 verification fixes shipped: component telemetry now persists through `/api/analytics`, `code_predictor` enforces explicit language hints with retry/fallback, and `ComponentShell` exposes a shared loading state used by `free_response`.
- `[2026-05-24]` Prompt 4 shipped: added the JS component-library registry, six core component renderers, strict params/signal validation, per-component generator prompts, dev-only dogfood page/API routes, and component render/completion telemetry.
- `[2026-05-23]` Prompt 3 validation fix: `validateTopicGraph()` now rejects disconnected orphan islands by treating all graph edges as undirected for connected-component validation while preserving single-node graph validity.
- `[2026-05-23]` Charter updated from codebase audit: added "Dead surfaces" subsection in Section 7 explicitly naming the three abandoned `path-view*` directories, `practice-gallery`, `uiDevtool`, `demo`, and unused `DiscussionView`/`VideoView`/`ReadingView` components. Added Hard Rule #12 forbidding parallel "v2" surfaces. No contract or sequence changes.
- `[2026-05-23]` Prompt 3 shipped: live `topic_graphs` storage and `goals.topic_graph_id` were applied, server-only topic graph generation/traversal landed, `/api/goals` now creates immutable per-goal DAGs with soft fallback, and topic-graph telemetry was verified on three real goal creations.
- `[2026-05-23]` Pre-launch build sequence revised: Prompts 9 (Source Grounding) and 10 (Curated Cores) deferred until post-launch. Pre-launch sequence is now 1→2→3→4→5→6→7→8→11→12. Rationale: P9 not needed for coding-focused beachhead, P10 requires pre-revenue spend that doesn't exist. Both remain part of the long-term architecture; do not build them speculatively.
- `[2026-05-22]` Prompt 2 shipped: live `learner_state` and `pending_evidence` tables were applied, server-only `getLearnerState()` / `applyEvidence()` landed, `/api/complete` now records evidence with v1 EMA mastery updates, and learner-state telemetry was verified.
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
