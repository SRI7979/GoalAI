// Dashboard — Daily Mission Hub
'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getLocalGoalBundleWithRepairs, isLocalAccessUser } from '@/lib/localGoalStore'
import { clearStoredSupabaseSession, getSafeSupabaseSession, getSafeSupabaseUser, supabaseData } from '@/lib/supabase'
import {
  claimDailyReward,
  claimModuleReward,
  completeLearningTask,
  generateNextLearningDay,
  rerollLearningTask,
} from '@/lib/progressionClient'
import LessonViewer from '@/components/LessonView'
import ProjectView from '@/components/ProjectView'
import MultiQuizView from '@/components/MultiQuizView'
import FlashcardView from '@/components/FlashcardView'
import ChallengeView from '@/components/ChallengeView'
import ProjectViewer from '@/components/ProjectViewer'
import DomainTaskBase from '@/components/domainTasks'
import GuidedPracticeView from '@/components/GuidedPracticeView'
import ReflectionView from '@/components/ReflectionView'
import BossChallengeView from '@/components/BossChallengeView'
import AIInteractionView from '@/components/AIInteractionView'
import PracticeRound from '@/components/PracticeRound'
import MissionRunner from '@/components/MissionRunner'
import LovableHome from '@/components/lovable/LovableHome'
import HeartBar from '@/components/HeartBar'
import NoHeartsOverlay from '@/components/NoHeartsOverlay'
import GemShop from '@/components/GemShop'
import TreasureChest from '@/components/TreasureChest'
import ConceptHeatMap from '@/components/ConceptHeatMap'
import IconGlyph from '@/components/IconGlyph'
import Skeleton from '@/components/Skeleton'
import { BADGES, RARITY_COLORS } from '@/lib/badges'
import StreakFlame from '@/components/StreakFlame'
import BadgeShowcase from '@/components/BadgeShowcase'
import { getLevelProgress, xpForTask, missionXpReward, computeTotalXpFromRows } from '@/lib/xp'
import { track, EVENTS } from '@/lib/analytics'
import { needsSequenceDayRepair } from '@/lib/learningPlan'
import { buildPathOutlineTracker, courseOutlineNeedsRecovery } from '@/lib/pathOutline.js'
import { hydrateGoalCourseOutline } from '@/lib/courseOutlineStore'
import {
  filterRowsForCourseWindow,
  isCourseFinalExamTask,
} from '@/lib/courseCompletion'
import {
  APP_THEMES,
  getDashboardThemeVars,
  getStoredActiveTheme,
  getStoredOwnedThemes,
  setStoredActiveTheme,
  setStoredOwnedThemes,
} from '@/lib/appThemes'
import {
  buildInventoryCountsFromTransactions,
  getClaimedModuleRewardIds,
} from '@/lib/shopInventory'
import { getStoredMaxHearts, setStoredMaxHearts } from '@/lib/shopStorage'
import { HEARTS_BASE, HEARTS_MAX_CAP } from '@/lib/tokens'
import { generateDailyQuests } from '@/lib/quests'
import {
  getCanonicalTaskType,
  getTaskDisplayConfig,
  normalizeLearningTask,
  normalizeLearningTasks,
  normalizeTaskRows,
} from '@/lib/taskTaxonomy'
import { isBrokenTaskRow } from '@/lib/taskQuality'
import {
  CODE_DOMAIN_TASK_TYPES,
  buildDomainConfig,
  getDomainAssignmentType,
  getDomainGamification,
  getDomainTaskLabel,
  resolvePracticeDomainForGoal,
  resolveGoalDomain,
  setStoredLearningDomain,
} from '@/lib/domainAdapter'

// ─── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:           'var(--theme-bg)',
  chrome:       'var(--theme-chrome)',
  shell:        'var(--theme-shell)',
  surface:      'var(--theme-surface)',
  border:       'var(--theme-border)',
  borderAlt:    'var(--theme-border-alt)',
  teal:         'var(--theme-primary)',
  tealDim:      'var(--theme-primary-dim)',
  tealBorder:   'var(--theme-primary-border)',
  blue:         'var(--theme-secondary)',
  flame:        'var(--theme-warm)',
  flameDim:     'var(--theme-warm-dim)',
  flameBorder:  'var(--theme-warm-border)',
  amber:        'var(--theme-highlight)',
  mastery:      'var(--theme-mastery)',
  masteryDim:   'var(--theme-mastery-dim)',
  masteryBorder:'var(--theme-mastery-border)',
  text:         'var(--theme-text)',
  textSec:      'var(--theme-text-sec)',
  textMuted:    'var(--theme-text-muted)',
  textDead:     'var(--theme-text-dead)',
  red:          'var(--theme-red)',
  ink:          'var(--theme-ink)',
  primaryGradient:'linear-gradient(135deg,var(--theme-primary),var(--theme-secondary))',
  primaryGradientSoft:'linear-gradient(90deg,var(--theme-primary),var(--theme-secondary))',
  masteryGradient:'linear-gradient(135deg,var(--theme-mastery),var(--theme-mastery-strong))',
  masteryGradientSoft:'linear-gradient(90deg,var(--theme-mastery),var(--theme-mastery-strong))',
  highlightGradient:'linear-gradient(90deg,var(--theme-highlight),var(--theme-primary))',
  font:         "'Inter','DM Sans',system-ui,sans-serif",
  fontMono:     "'JetBrains Mono','Fira Code',Menlo,monospace",
}

function ProofTargetCard({ proofTarget }) {
  if (!proofTarget?.description) return null
  const criteria = Array.isArray(proofTarget.passCriteria) ? proofTarget.passCriteria.slice(0, 3) : []
  const rubric = Array.isArray(proofTarget.rubric) ? proofTarget.rubric.slice(0, 3) : []
  const typeLabel = String(proofTarget.evaluationType || 'proof')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())

  return (
    <div className="dashboard-proof-target-card" style={{maxWidth:600,margin:'12px auto 0',padding:'0 20px'}}>
      <div style={{
        background:'linear-gradient(145deg,rgba(14,245,194,0.08),rgba(59,130,246,0.05))',
        border:`1px solid ${T.tealBorder}`,
        borderRadius:22,
        padding:'18px 20px',
        boxShadow:'inset 0 1px 0 rgba(255,255,255,0.06)',
      }}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:14,marginBottom:10}}>
          <div style={{display:'flex',alignItems:'center',gap:10,minWidth:0}}>
            <div style={{
              width:34,height:34,borderRadius:12,
              background:'rgba(14,245,194,0.10)',
              border:`1px solid ${T.tealBorder}`,
              display:'flex',alignItems:'center',justifyContent:'center',
              color:T.teal,flexShrink:0,
            }}>
              <IconGlyph name="shield_check" size={17} strokeWidth={2.4} color={T.teal}/>
            </div>
            <div style={{minWidth:0}}>
              <div style={{fontSize:10,fontWeight:900,letterSpacing:'0.14em',textTransform:'uppercase',color:T.teal,marginBottom:3}}>
                Proof of mastery
              </div>
              <div style={{fontSize:15,fontWeight:900,color:T.text,lineHeight:1.25}}>
                Your finish line is visible from day one
              </div>
            </div>
          </div>
          <span style={{
            padding:'5px 9px',
            borderRadius:9999,
            background:'rgba(255,255,255,0.05)',
            border:`1px solid ${T.border}`,
            fontSize:10,
            fontWeight:800,
            color:T.textSec,
            whiteSpace:'nowrap',
          }}>
            {typeLabel}
          </span>
        </div>

        <div style={{fontSize:13,lineHeight:1.65,color:T.textSec,marginBottom:12}}>
          {proofTarget.description}
        </div>

        {criteria.length > 0 && (
          <div style={{display:'flex',flexDirection:'column',gap:7,marginBottom:12}}>
            {criteria.map((criterion, index) => (
              <div key={`${criterion}-${index}`} style={{display:'flex',gap:8,alignItems:'flex-start'}}>
                <span style={{
                  width:18,height:18,borderRadius:7,flexShrink:0,
                  background:'rgba(14,245,194,0.10)',
                  color:T.teal,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:10,fontWeight:900,
                }}>
                  {index + 1}
                </span>
                <span style={{fontSize:12,lineHeight:1.45,color:T.text}}>{criterion}</span>
              </div>
            ))}
          </div>
        )}

        {rubric.length > 0 && (
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {rubric.map((item) => (
              <span key={item.id || item.label} style={{
                padding:'4px 8px',
                borderRadius:9999,
                background:'rgba(255,255,255,0.04)',
                border:`1px solid ${T.border}`,
                fontSize:10,
                fontWeight:800,
                color:T.textMuted,
              }}>
                {item.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function LearningStatusCard({ status, loading, missionCapable }) {
  if (!missionCapable) return null

  const progress = status?.graphProgress || {}
  const learner = status?.learner || {}
  const proof = status?.proof || {}
  const profile = learner?.pedagogicalProfile || {}
  const focusConcepts = Array.isArray(learner?.focusConcepts) ? learner.focusConcepts.slice(0, 3) : []
  const strongestConcepts = Array.isArray(learner?.strongestConcepts) ? learner.strongestConcepts.slice(0, 2) : []
  const openIssueCount = Number(status?.quality?.openIssueCount) || 0
  const progressPercent = Math.max(0, Math.min(100, Number(progress.percentComplete) || 0))
  const proofPercent = Math.max(0, Math.min(100, Number(proof.readinessPercent) || 0))
  const practicedConcepts = Number(learner?.practicedConcepts) || 0
  const sessionMinutes = Number(profile?.optimalSessionMinutes) || 15
  const difficultyLabel = String(profile?.difficultyPreference || 'balanced').replace(/_/g, ' ')

  const statItems = [
    { label: 'Path learned', value: `${progressPercent}%` },
    { label: 'Concepts practiced', value: practicedConcepts || (progress.totalConcepts ? `${progress.mastered || 0}/${progress.totalConcepts}` : '0') },
    { label: 'Proof readiness', value: `${proofPercent}%` },
  ]

  return (
    <div className="dashboard-learning-status-card" style={{maxWidth:760,margin:'12px auto 0',padding:'0 20px'}}>
      <div style={{
        background:'linear-gradient(145deg,rgba(15,23,42,0.78),rgba(8,19,32,0.82))',
        border:`1px solid ${T.border}`,
        borderRadius:24,
        padding:'18px 20px',
        boxShadow:'0 18px 60px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16,marginBottom:14}}>
          <div style={{display:'flex',gap:12,alignItems:'flex-start',minWidth:0}}>
            <div style={{
              width:38,height:38,borderRadius:14,flexShrink:0,
              background:'linear-gradient(135deg,rgba(14,245,194,0.16),rgba(125,211,252,0.10))',
              border:`1px solid ${T.tealBorder}`,
              display:'flex',alignItems:'center',justifyContent:'center',
              color:T.teal,
            }}>
              <IconGlyph name="sparkles" size={18} strokeWidth={2.35} color={T.teal}/>
            </div>
            <div style={{minWidth:0}}>
              <div style={{fontSize:10,fontWeight:900,letterSpacing:'0.16em',textTransform:'uppercase',color:T.teal,marginBottom:4}}>
                Adaptive path
              </div>
              <div style={{fontSize:16,fontWeight:950,color:T.text,lineHeight:1.25}}>
                PathAI is tuning today&apos;s mission from your real progress
              </div>
            </div>
          </div>
          <span style={{
            padding:'6px 10px',
            borderRadius:9999,
            background:proof.ready ? 'rgba(20,241,201,0.12)' : 'rgba(255,255,255,0.05)',
            border:`1px solid ${proof.ready ? T.tealBorder : T.border}`,
            color:proof.ready ? T.teal : T.textMuted,
            fontSize:10,
            fontWeight:900,
            whiteSpace:'nowrap',
          }}>
            {proof.ready ? 'Proof ready soon' : `${sessionMinutes} min rhythm`}
          </span>
        </div>

        {loading ? (
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:8}}>
            {[0, 1, 2].map((index) => (
              <div key={index} style={{
                height:58,
                borderRadius:16,
                border:`1px solid ${T.border}`,
                background:'linear-gradient(90deg,rgba(255,255,255,0.04),rgba(255,255,255,0.08),rgba(255,255,255,0.04))',
                backgroundSize:'220% 100%',
                animation:'questShimmer 1.8s linear infinite',
              }}/>
            ))}
          </div>
        ) : (
          <>
            <div style={{
              height:8,
              borderRadius:999,
              background:'rgba(255,255,255,0.07)',
              overflow:'hidden',
              marginBottom:14,
            }}>
              <div style={{
                width:`${Math.max(4, progressPercent)}%`,
                height:'100%',
                borderRadius:999,
                background:T.primaryGradientSoft,
                boxShadow:'0 0 18px rgba(14,245,194,0.35)',
              }}/>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:8,marginBottom:14}}>
              {statItems.map((item) => (
                <div key={item.label} style={{
                  border:`1px solid ${T.border}`,
                  borderRadius:16,
                  padding:'12px 12px',
                  background:'rgba(255,255,255,0.035)',
                }}>
                  <div style={{fontSize:10,fontWeight:850,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.09em',marginBottom:5}}>
                    {item.label}
                  </div>
                  <div style={{fontSize:18,fontWeight:950,color:T.text,lineHeight:1}}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <div style={{display:'grid',gridTemplateColumns:'minmax(0,1.25fr) minmax(0,1fr)',gap:10}}>
              <div style={{
                border:`1px solid ${T.border}`,
                borderRadius:16,
                padding:'12px 14px',
                background:'rgba(14,245,194,0.045)',
              }}>
                <div style={{fontSize:11,fontWeight:900,color:T.teal,letterSpacing:'0.10em',textTransform:'uppercase',marginBottom:8}}>
                  Next focus
                </div>
                <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
                  {(focusConcepts.length > 0 ? focusConcepts : strongestConcepts).map((concept) => (
                    <span key={concept.conceptId} style={{
                      padding:'6px 9px',
                      borderRadius:999,
                      border:`1px solid ${T.tealBorder}`,
                      background:'rgba(14,245,194,0.08)',
                      color:T.text,
                      fontSize:11,
                      fontWeight:850,
                    }}>
                      {concept.label}
                    </span>
                  ))}
                  {focusConcepts.length === 0 && strongestConcepts.length === 0 && (
                    <span style={{fontSize:12,color:T.textSec,lineHeight:1.5}}>
                      Complete today&apos;s first mission and this will become personal.
                    </span>
                  )}
                </div>
              </div>

              <div style={{
                border:`1px solid ${T.border}`,
                borderRadius:16,
                padding:'12px 14px',
                background:'rgba(255,255,255,0.035)',
              }}>
                <div style={{fontSize:11,fontWeight:900,color:T.textMuted,letterSpacing:'0.10em',textTransform:'uppercase',marginBottom:8}}>
                  Lesson tuning
                </div>
                <div style={{fontSize:12,color:T.textSec,lineHeight:1.55,fontWeight:750}}>
                  {profile?.prefersVisual ? 'Visual examples are prioritized.' : 'Text-first explanations are prioritized.'}
                  {' '}Difficulty is set to {difficultyLabel}.
                  {openIssueCount > 0 ? ' PathAI noticed friction and will keep the next step gentler.' : ''}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const THEME_REASON_TO_ID = {
  shop_themeOcean: 'themeOcean',
  shop_themeSunset: 'themeSunset',
  shop_themeForest: 'themeForest',
  shop_themeMidnight: 'themeMidnight',
  shop_themeRose: 'themeRose',
  shop_themeAurora: 'themeAurora',
  shop_themeEmber: 'themeEmber',
  shop_themeMonolith: 'themeMonolith',
}

const THEME_TRANSACTION_REASONS = Object.keys(THEME_REASON_TO_ID)

// ─── Keyframes ─────────────────────────────────────────────────────────────────
const KEYFRAMES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  ::-webkit-scrollbar{display:none}
  @keyframes spin      {to{transform:rotate(360deg)}}
  @keyframes fadeUp    {from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes xpRise    {0%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}
                        70%{opacity:1;transform:translateX(-50%) translateY(-52px) scale(1.20)}
                        100%{opacity:0;transform:translateX(-50%) translateY(-72px) scale(0.85)}}
  @keyframes checkPop  {0%{transform:scale(0.5)}70%{transform:scale(1.18)}100%{transform:scale(1)}}
  @keyframes pulseFlame{0%,100%{text-shadow:0 0 12px rgba(255,107,53,0.40)}
                        50%{text-shadow:0 0 28px rgba(255,107,53,0.75)}}
  @keyframes pulseActive{0%,100%{box-shadow:0 0 0 0 rgba(14,245,194,0.20)}
                         50%{box-shadow:0 0 0 10px rgba(14,245,194,0.00)}}
  @keyframes xpBarGlow {0%,100%{box-shadow:0 0 8px rgba(14,245,194,0.30)}
                        50%{box-shadow:0 0 20px rgba(14,245,194,0.60)}}
  @keyframes levelPop  {0%{transform:translateX(-50%) scale(0.7);opacity:0}
                        65%{transform:translateX(-50%) scale(1.06)}
                        100%{transform:translateX(-50%) scale(1);opacity:1}}
  @keyframes slideInLeft{from{transform:translateX(-100%)}to{transform:translateX(0)}}
  @keyframes fadeInBg   {from{opacity:0}to{opacity:1}}
  @keyframes slideUpPreview{from{transform:translateY(100%)}to{transform:translateY(0)}}
  @keyframes gemPulse{0%{transform:scale(1)}50%{transform:scale(1.22)}100%{transform:scale(1)}}
  @keyframes gemFloat{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-36px)}}
  @keyframes nextDayProgress{0%{transform:translateX(-120%)}100%{transform:translateX(240%)}}
  @keyframes missionBorderSpin{to{transform:rotate(360deg)}}
  @keyframes confettiFall {
    0% { opacity: 0; transform: translateY(-18px) rotate(0deg); }
    12% { opacity: 1; }
    100% { opacity: 0; transform: translateY(110vh) rotate(540deg); }
  }
  @property --chal-angle{syntax:'<angle>';initial-value:0deg;inherits:false}
  @keyframes chalBorderSpin{to{--chal-angle:360deg}}
  @keyframes questShimmer{0%{background-position:200% center}100%{background-position:-200% center}}
  @keyframes pathSlideUp{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}
  @keyframes pathSlideDown{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(100%)}}
  @keyframes nodeFloat{0%,100%{transform:translateY(0px)}50%{transform:translateY(-5px)}}
  @keyframes nodeGlow{0%,100%{box-shadow:0 0 0 0 rgba(14,245,194,0.0),0 8px 24px rgba(0,0,0,0.55),inset 0 1px 0 rgba(255,255,255,0.18)}
                      50%{box-shadow:0 0 0 12px rgba(14,245,194,0.12),0 8px 24px rgba(0,0,0,0.55),inset 0 1px 0 rgba(255,255,255,0.18)}}
  @keyframes discSpin{0%{transform:rotateY(0deg)}100%{transform:rotateY(360deg)}}
  @keyframes sheetUp{from{opacity:0;transform:translateY(40px) scale(0.96)}to{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes pathNodeIn{from{opacity:0;transform:scale(0.5) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
  @keyframes pathLineDraw{from{height:0}to{height:100%}}
  @keyframes pathTogglePop{0%{transform:scale(0.8);opacity:0}70%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
  @keyframes shimmerSlide{0%{background-position:-200% 0}100%{background-position:200% 0}}
  @keyframes popIn{0%{transform:scale(0.5);opacity:0}70%{transform:scale(1.2)}100%{transform:scale(1);opacity:1}}
  @keyframes badgeSlideIn{from{opacity:0;transform:translateY(-16px) scale(0.92)}to{opacity:1;transform:translateY(0) scale(1)}}
  .dashboard-top-inner{
    width:min(1320px,calc(100vw - 32px));
    margin:0 auto;
  }
  .dashboard-main-shell{
    width:min(1360px,calc(100vw - 32px));
    margin:0 auto;
    padding:18px 0 34px;
    display:grid;
    grid-template-columns:236px minmax(0,1fr);
    gap:24px;
    align-items:start;
  }
  .dashboard-main-content{
    min-width:0;
    width:100%;
  }
  .dashboard-left-rail{
    position:sticky;
    top:78px;
    display:grid;
    gap:12px;
    min-width:0;
  }
  .dashboard-rail-card{
    border:1px solid var(--theme-border);
    background:linear-gradient(145deg,rgba(255,255,255,0.075),rgba(255,255,255,0.028));
    border-radius:22px;
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.07),0 18px 44px rgba(0,0,0,0.18);
    backdrop-filter:blur(24px);
    -webkit-backdrop-filter:blur(24px);
  }
  .dashboard-rail-kicker{
    font-size:10px;
    font-weight:900;
    color:var(--theme-text-muted);
    letter-spacing:.14em;
    text-transform:uppercase;
  }
  .dashboard-rail-nav{
    display:grid;
    gap:6px;
    padding:8px;
  }
  .dashboard-rail-nav-button{
    width:100%;
    min-height:44px;
    border:1px solid transparent;
    border-radius:14px;
    background:transparent;
    color:var(--theme-text-sec);
    font-family:inherit;
    cursor:pointer;
    display:flex;
    align-items:center;
    gap:10px;
    padding:9px 10px;
    text-align:left;
    transition:background .18s ease,border-color .18s ease,color .18s ease,transform .18s ease;
  }
  .dashboard-rail-nav-button:hover{
    background:rgba(255,255,255,0.055);
    border-color:var(--theme-border-alt);
    color:var(--theme-text);
    transform:translateX(1px);
  }
  .dashboard-rail-nav-button.is-active{
    background:linear-gradient(135deg,var(--theme-primary-dim),rgba(0,212,255,0.07));
    border-color:var(--theme-primary-border);
    color:var(--theme-primary);
  }
  .dashboard-command-trigger{
    flex:1;
    min-width:210px;
    max-width:390px;
    min-height:42px;
    border:1px solid var(--theme-border);
    border-radius:14px;
    background:rgba(255,255,255,0.045);
    color:var(--theme-text-sec);
    display:flex;
    align-items:center;
    gap:10px;
    padding:0 12px;
    font-family:inherit;
    cursor:pointer;
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.06);
    transition:background .18s ease,border-color .18s ease,color .18s ease;
  }
  .dashboard-command-trigger:hover{
    background:rgba(255,255,255,0.075);
    border-color:var(--theme-primary-border);
    color:var(--theme-text);
  }
  .dashboard-command-overlay{
    position:fixed;
    inset:0;
    z-index:9998;
    background:rgba(3,5,9,0.66);
    backdrop-filter:blur(18px);
    -webkit-backdrop-filter:blur(18px);
    display:flex;
    align-items:flex-start;
    justify-content:center;
    padding:82px 18px 24px;
    animation:fadeInBg .16s ease both;
  }
  .dashboard-command-panel{
    width:min(680px,100%);
    max-height:min(72vh,720px);
    overflow:hidden;
    border-radius:24px;
    border:1px solid rgba(255,255,255,0.13);
    background:linear-gradient(180deg,rgba(20,22,32,0.98),rgba(8,10,17,0.98));
    box-shadow:0 34px 90px rgba(0,0,0,0.42),inset 0 1px 0 rgba(255,255,255,0.10);
  }
  .dashboard-command-search{
    width:100%;
    min-height:64px;
    border:0;
    border-bottom:1px solid rgba(255,255,255,0.08);
    background:transparent;
    color:var(--theme-text);
    font:800 17px/1 var(--theme-font, 'Plus Jakarta Sans', system-ui, sans-serif);
    padding:0 22px;
    outline:none;
  }
  .dashboard-command-search::placeholder{color:var(--theme-text-muted)}
  .dashboard-command-list{
    max-height:calc(72vh - 64px);
    overflow:auto;
    padding:10px;
  }
  .dashboard-command-group{padding:6px 0 8px}
  .dashboard-command-group-title{
    padding:7px 10px;
    font-size:10px;
    font-weight:900;
    color:var(--theme-text-muted);
    text-transform:uppercase;
    letter-spacing:.13em;
  }
  .dashboard-command-item{
    width:100%;
    min-height:54px;
    border:1px solid transparent;
    border-radius:15px;
    background:transparent;
    color:var(--theme-text);
    font-family:inherit;
    cursor:pointer;
    display:flex;
    align-items:center;
    gap:12px;
    padding:9px 10px;
    text-align:left;
  }
  .dashboard-command-item.is-selected,.dashboard-command-item:hover{
    background:rgba(255,255,255,0.07);
    border-color:rgba(255,255,255,0.10);
  }
  .dashboard-command-icon{
    width:34px;
    height:34px;
    border-radius:12px;
    display:flex;
    align-items:center;
    justify-content:center;
    flex-shrink:0;
    background:rgba(255,255,255,0.055);
    border:1px solid rgba(255,255,255,0.08);
  }
  .dashboard-command-meta{font-size:12px;color:var(--theme-text-muted);line-height:1.35;margin-top:2px}
  .dashboard-command-pill{
    margin-left:auto;
    flex-shrink:0;
    font-size:10px;
    font-weight:900;
    color:var(--theme-primary);
    padding:4px 8px;
    border-radius:9999px;
    background:var(--theme-primary-dim);
    border:1px solid var(--theme-primary-border);
  }
  .dashboard-command-empty{
    padding:34px 14px 38px;
    text-align:center;
    color:var(--theme-text-muted);
    font-size:14px;
  }
  .dashboard-quick-actions{display:none!important}
  .dashboard-bottom-nav{display:none}
  @media (max-width:1120px){
    .dashboard-main-shell{
      display:block;
      width:100%;
      padding:0 0 90px;
    }
    .dashboard-left-rail{display:none}
    .dashboard-command-trigger{display:none}
    .dashboard-top-inner{width:100%;max-width:600px}
    .dashboard-quick-actions{display:flex!important}
    .dashboard-bottom-nav{display:block}
  }
  @media (max-width:760px){
    .dashboard-command-overlay{padding-top:68px}
    .dashboard-command-panel{border-radius:20px}
  }
  @media (prefers-reduced-motion:reduce){
    @keyframes fadeUp    {from{opacity:0}to{opacity:1}}
    @keyframes xpRise    {to{opacity:0}}
    @keyframes checkPop  {to{}}
    @keyframes pulseFlame{to{}}
    @keyframes pulseActive{to{}}
    @keyframes xpBarGlow {to{}}
    @keyframes levelPop  {from{opacity:0}to{opacity:1}}
    @keyframes missionBorderSpin{to{}}
  }
`

// ─── Task type config ──────────────────────────────────────────────────────────
const TASK_STYLE = {
  concept:          {color:'var(--theme-primary)',bg:'var(--theme-primary-dim)',  border:'var(--theme-primary-border)',  label:'CONCEPT'   },
  guided_practice:  {color:'#00d4ff',bg:'rgba(0,212,255,0.10)',   border:'rgba(0,212,255,0.22)',   label:'PRACTICE'  },
  challenge:        {color:'#F59E0B',bg:'rgba(245,158,11,0.10)',  border:'rgba(245,158,11,0.22)',  label:'CHALLENGE' },
  explain:          {color:'#818CF8',bg:'rgba(129,140,248,0.10)', border:'rgba(129,140,248,0.22)', label:'EXPLAIN'   },
  quiz:             {color:'#FF453A',bg:'rgba(255,69,58,0.10)',   border:'rgba(255,69,58,0.22)',   label:'QUIZ'      },
  recall:           {color:'#C084FC',bg:'rgba(192,132,252,0.10)', border:'rgba(192,132,252,0.22)', label:'RECALL'    },
  reflect:          {color:'#A78BFA',bg:'rgba(167,139,250,0.10)', border:'rgba(167,139,250,0.22)', label:'REFLECT'   },
  boss:             {color:'#EC4899',bg:'rgba(236,72,153,0.12)',  border:'rgba(236,72,153,0.30)',  label:'BOSS'      },
  project:          {color:'#EC4899',bg:'rgba(236,72,153,0.10)',  border:'rgba(236,72,153,0.22)',  label:'PROJECT'   },
  final_exam:       {color:'#FBBF24',bg:'rgba(251,191,36,0.12)',  border:'rgba(251,191,36,0.24)',  label:'FINAL EXAM'},
}
const taskStyle = (taskOrType) => TASK_STYLE[getCanonicalTaskType(
  typeof taskOrType === 'string' ? taskOrType : taskOrType?.type,
  typeof taskOrType === 'string' ? null : taskOrType,
)] || TASK_STYLE.concept

// Helper: current week's Monday as YYYY-MM-DD
function getWeekStartStr() {
  const d = new Date()
  const day = d.getDay()
  const off = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(d.getDate() + off)
  return mon.toISOString().split('T')[0]
}

// Reward calendar day gems (Mon-Sun)
const CAL_REWARDS = [5, 8, 10, 12, 15, 20, 30]
const CAL_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

// ─── SVG icons ─────────────────────────────────────────────────────────────────
const BoltIcon     = ({sz=13}) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
const ArrowRight   = ({sz=14}) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
const ClockIcon    = ({sz=12}) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
const PlayIcon     = ({sz=13}) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
const HomeIcon     = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
const PathIcon     = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
const StatsIcon    = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
const SettingsIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
const ShopIcon     = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 7v13a2 2 0 002 2h14a2 2 0 002-2V7l-3-5H6z"/><line x1="3" y1="7" x2="21" y2="7"/><path d="M16 11a4 4 0 01-8 0"/></svg>
const BadgesIcon   = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
const PathBoltLogo = ({ size = 28 }) => (
  <div style={{
    width:size,height:size,borderRadius:'28%',
    background:'linear-gradient(135deg,var(--theme-primary),var(--theme-secondary))',
    display:'flex',alignItems:'center',justifyContent:'center',
    boxShadow:'0 0 20px rgba(14,245,194,0.20), inset 0 1px 0 rgba(255,255,255,0.35)',
    flexShrink:0,
  }}>
    <svg width={Math.round(size * 0.48)} height={Math.round(size * 0.48)} viewBox="0 0 24 24" fill="none" stroke="#050608" strokeWidth="2.5" strokeLinecap="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  </div>
)

function MiniProgressRing({ size = 38, value = 0, total = 1, stroke = 'var(--theme-primary)', track = 'rgba(255,255,255,0.08)', label, labelColor = T.text, textSize = 11 }) {
  const safeTotal = Math.max(total, 1)
  const ratio = Math.max(0, Math.min(1, value / safeTotal))
  const strokeWidth = size <= 28 ? 3 : 4
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={track} strokeWidth={strokeWidth}/>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          style={{ transition:'stroke-dashoffset 0.45s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:textSize, fontWeight:900, color:labelColor }}>
        {label ?? value}
      </div>
    </div>
  )
}

function StaggerBlock({ index = 0, children }) {
  return (
    <div style={{
      animation:'fadeUp 0.4s ease-out both',
      animationDelay:`${index * 0.05}s`,
    }}>
      {children}
    </div>
  )
}

// ─── XP toast ──────────────────────────────────────────────────────────────────
function XPToast({ id, amount, x, y, onDone }) {
  useEffect(() => { const t = setTimeout(() => onDone(id), 1400); return () => clearTimeout(t) }, [id, onDone])
  return (
    <div style={{
      position:'fixed', left:x, top:y, zIndex:9999,
      fontSize:15, fontWeight:900, color:'#FBBF24',
      fontFamily:T.font, pointerEvents:'none',
      animation:'xpRise 1.4s ease-out forwards',
      textShadow:'0 0 16px rgba(251,191,36,0.70)',
      whiteSpace:'nowrap', userSelect:'none',
    }}>+{amount} XP</div>
  )
}

// ─── Level-up banner ───────────────────────────────────────────────────────────
function LevelUpBanner({ data, onDismiss }) {
  useEffect(() => { const t = setTimeout(onDismiss, 4500); return () => clearTimeout(t) }, [onDismiss])
  if (!data) return null
  return (
    <div onClick={onDismiss} style={{
      position:'fixed', top:72, left:'50%', zIndex:9990,
      background:'linear-gradient(135deg,var(--theme-mastery-dim),rgba(99,102,241,0.14))',
      border:`1px solid ${T.masteryBorder}`, borderRadius:14,
      padding:'12px 20px', display:'flex', alignItems:'center', gap:12,
      boxShadow:'0 8px 32px rgba(129,140,248,0.22)',
      backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
      animation:'levelPop 0.50s cubic-bezier(0.34,1.3,0.64,1)',
      cursor:'pointer', userSelect:'none', whiteSpace:'nowrap',
    }}>
      <div style={{
        width:34, height:34, borderRadius:'50%',
        background:T.masteryGradient,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontWeight:900, fontSize:15, color:'#fff',
      }}>{data.toLevel}</div>
      <div>
        <div style={{fontSize:13,fontWeight:800,color:T.mastery}}>Level up — {data.title}</div>
        <div style={{fontSize:11,color:T.textMuted}}>Level {data.fromLevel} → {data.toLevel}</div>
      </div>
    </div>
  )
}

function CourseCompleteOverlay({ data, onDismiss, onOpenPortfolio }) {
  useEffect(() => {
    if (!data) return undefined
    const timer = setTimeout(() => onDismiss(), 9000)
    return () => clearTimeout(timer)
  }, [data, onDismiss])

  if (!data) return null

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9950,
      background:'rgba(5,6,8,0.78)',
      backdropFilter:'blur(22px)', WebkitBackdropFilter:'blur(22px)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:'24px',
    }}>
      {[...Array(22)].map((_, index) => (
        <div key={index} style={{
          position:'absolute',
          left:`${8 + ((index * 13) % 84)}%`,
          top:`${-8 + ((index * 7) % 24)}%`,
          width:6 + (index % 4),
          height:10 + (index % 5),
          borderRadius:index % 3 === 0 ? 9999 : 4,
          background:[T.teal, T.blue, T.mastery, T.amber][index % 4],
          animation:`confettiFall ${1.8 + ((index % 5) * 0.18)}s ${(index % 6) * 0.06}s ease-in both`,
          opacity:0.95,
          transform:`rotate(${index * 17}deg)`,
          pointerEvents:'none',
        }}/>
      ))}

      <div style={{
        width:'100%', maxWidth:540,
        borderRadius:28,
        border:`1px solid ${T.tealBorder}`,
        background:'linear-gradient(150deg, rgba(14,245,194,0.12), rgba(255,255,255,0.04))',
        boxShadow:'0 30px 90px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.10)',
        padding:'28px 24px',
        position:'relative',
        overflow:'hidden',
      }}>
        <div style={{
          position:'absolute', inset:'auto -80px -100px auto',
          width:220, height:220, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(14,245,194,0.18) 0%, transparent 72%)',
          filter:'blur(10px)',
        }}/>

        <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'7px 12px',borderRadius:9999,background:'rgba(14,245,194,0.10)',border:`1px solid ${T.tealBorder}`,marginBottom:14}}>
          <IconGlyph name="award" size={14} strokeWidth={2.4} color={T.teal}/>
          <span style={{fontSize:10,fontWeight:900,letterSpacing:'0.16em',textTransform:'uppercase',color:T.teal}}>Course Complete</span>
        </div>

        <div style={{fontSize:30,fontWeight:900,color:T.text,letterSpacing:'-0.05em',lineHeight:1.05,marginBottom:10}}>
          {data.goalText}
        </div>
        <div style={{fontSize:14,color:T.textSec,lineHeight:1.7,marginBottom:18}}>
          You finished the full course and cleared the comprehensive final exam. This completion is now saved in your portfolio.
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(132px,1fr))',gap:10,marginBottom:18}}>
          {[
            { label:'Final exam', value:`${data.examScore}%`, icon:'check_circle', tone:T.teal },
            { label:'Grade', value:data.grade, icon:'badge', tone:T.amber },
            { label:'Reward', value:`+${data.rewardXp} XP`, icon:'sparkles', tone:T.mastery },
            { label:'Gems', value:`+${data.rewardGems}`, icon:'diamond', tone:T.blue },
          ].map((stat) => (
            <div key={stat.label} style={{borderRadius:18,border:`1px solid ${T.border}`,background:'rgba(255,255,255,0.04)',padding:'14px 12px'}}>
              <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:8}}>
                <IconGlyph name={stat.icon} size={14} strokeWidth={2.3} color={stat.tone}/>
                <span style={{fontSize:11,color:T.textMuted,fontWeight:700}}>{stat.label}</span>
              </div>
              <div style={{fontSize:18,fontWeight:900,color:stat.tone}}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
          <div style={{fontSize:12,color:T.textMuted}}>
            Final exam passed in {data.attemptsUsed} attempt{data.attemptsUsed === 1 ? '' : 's'}
          </div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            <button onClick={onDismiss} className="interactive-secondary" style={{
              padding:'12px 16px', borderRadius:16, border:`1px solid ${T.border}`, background:'rgba(255,255,255,0.05)',
              color:T.textSec, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:T.font,
            }}>
              Close
            </button>
            <button onClick={onOpenPortfolio} className="interactive-primary" style={{
              padding:'12px 16px', borderRadius:16, border:'none', background:T.primaryGradient, color:T.ink,
              fontSize:14, fontWeight:900, cursor:'pointer', fontFamily:T.font,
              boxShadow:'0 18px 40px rgba(14,245,194,0.18)',
            }}>
              View Portfolio
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MissionConfettiBurst({ active }) {
  if (!active) return null

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9940, pointerEvents:'none', overflow:'hidden' }}>
      {[...Array(24)].map((_, index) => (
        <div
          key={index}
          style={{
            position:'absolute',
            left:`${6 + ((index * 17) % 88)}%`,
            top:`${-6 + ((index * 5) % 18)}%`,
            width:6 + (index % 5),
            height:10 + (index % 4),
            borderRadius:index % 3 === 0 ? 9999 : 4,
            background:[T.teal, T.blue, T.mastery, T.amber][index % 4],
            animation:`confettiFall ${1.6 + ((index % 4) * 0.18)}s ${(index % 6) * 0.05}s ease-in both`,
            opacity:0.92,
            transform:`rotate(${index * 19}deg)`,
          }}
        />
      ))}
    </div>
  )
}

// ─── XP Level Bar ──────────────────────────────────────────────────────────────
function XPLevelBar({ level, title, xpInLevel, xpForLevel, pct, animating }) {
  return (
    <div className="dashboard-xp-shell" style={{maxWidth:1040,margin:'0 auto',padding:'12px 20px 0'}}>
      <div className="dashboard-xp-card" style={{
        background:'linear-gradient(145deg, rgba(129,140,248,0.14), rgba(255,255,255,0.04))',
        border:'1px solid rgba(129,140,248,0.20)', borderRadius:24,
        padding:'15px 18px', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
        display:'flex', alignItems:'center', gap:14,
        boxShadow:'inset 0 1px 0 rgba(255,255,255,0.08), 0 12px 34px rgba(0,0,0,0.22)',
      }}>
        <div style={{
          width:48, height:48, borderRadius:16, flexShrink:0,
          display:'flex', alignItems:'center', justifyContent:'center',
          background:'rgba(129,140,248,0.14)', border:'1px solid rgba(129,140,248,0.26)',
          position:'relative',
        }}>
          <MiniProgressRing
            size={48}
            value={xpInLevel}
            total={xpForLevel}
            stroke="var(--theme-mastery)"
            track="rgba(129,140,248,0.10)"
            label={level}
            labelColor="#fff"
            textSize={13}
          />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,marginBottom:8}}>
            <div style={{fontSize:15,fontWeight:900,color:T.text,lineHeight:1.1}}>
              Level {level}
              <span style={{fontSize:13,fontWeight:700,color:T.textSec,marginLeft:8}}>{title}</span>
            </div>
            <span style={{
              fontSize:12,color:'#C7D2FE',fontWeight:900,whiteSpace:'nowrap',
              background:'rgba(129,140,248,0.14)',padding:'4px 10px',borderRadius:9999,
            }}>
              {xpInLevel.toLocaleString()} XP
            </span>
          </div>
          <div className="progress-track" style={{height:8,background:'rgba(255,255,255,0.08)',borderRadius:9999,overflow:'hidden'}}>
            <div className="progress-fill" style={{
              height:'100%', width:`${Math.round(pct*100)}%`,
              background:T.masteryGradientSoft, borderRadius:9999,
              transition: animating ? 'width 0.65s cubic-bezier(0.16,1,0.3,1)' : 'none',
              boxShadow: animating ? '0 0 16px rgba(129,140,248,0.60)' : '0 0 8px rgba(129,140,248,0.22)',
              animation: animating ? 'xpBarGlow 1.2s ease' : 'none',
              position:'relative', overflow:'hidden',
            }}>
              <div style={{
                position:'absolute', inset:0,
                background:'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.24) 50%,transparent 100%)',
                backgroundSize:'200% 100%',
                animation:'shimmerSlide 2s ease-in-out infinite',
              }}/>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Mission Hero Card ─────────────────────────────────────────────────────────
function MissionHeroCard({ todayRow, tasks, dayNumber }) {
  if (!todayRow) return null
  const total     = tasks.length
  const completed = tasks.filter(t => t.completed).length
  const pct       = total > 0 ? completed / total : 0
  const allDone   = completed === total && total > 0
  const reward    = missionXpReward(tasks)
  const totalMin  = tasks.reduce((s, t) => s + (Number(t.estimatedTimeMin || t.durationMin) || 0), 0)
  const concept   = todayRow.covered_topics?.[0] || `Day ${dayNumber}`

  return (
    <div className="dashboard-mission-shell" style={{maxWidth:920,margin:'0 auto',padding:'0 18px'}}>
      <div className={`dashboard-mission-card${allDone ? ' is-complete' : ''}`} style={{
        position:'relative',
        background: allDone
          ? 'linear-gradient(155deg,rgba(14,245,194,0.26) 0%,rgba(0,212,255,0.16) 60%,rgba(129,140,248,0.10) 100%)'
          : 'linear-gradient(155deg,rgba(14,245,194,0.13) 0%,rgba(129,140,248,0.07) 55%,rgba(255,255,255,0.04) 100%)',
        border:`1.5px solid ${allDone ? 'rgba(14,245,194,0.46)' : 'rgba(14,245,194,0.22)'}`,
        borderRadius:36, padding:'36px 30px 30px',
        backdropFilter:'blur(36px) saturate(180%)', WebkitBackdropFilter:'blur(36px) saturate(180%)',
        boxShadow: allDone
          ? 'inset 0 2px 0 rgba(255,255,255,0.20),inset 0 -4px 0 rgba(0,212,255,0.16),0 0 80px rgba(14,245,194,0.18),0 36px 90px rgba(0,0,0,0.40)'
          : 'inset 0 2px 0 rgba(255,255,255,0.16),inset 0 -4px 0 rgba(14,245,194,0.12),0 0 50px rgba(14,245,194,0.08),0 36px 90px rgba(0,0,0,0.40)',
        overflow:'hidden',
      }}>
        {/* Rotating gradient border */}
        <div style={{
          position:'absolute', inset:-1, borderRadius:36, padding:1,
          background:'conic-gradient(from 0deg, rgba(14,245,194,0.00), rgba(14,245,194,0.55), rgba(0,212,255,0.40), rgba(129,140,248,0.30), rgba(14,245,194,0.00))',
          animation:'missionBorderSpin 10s linear infinite',
          pointerEvents:'none',
          opacity:allDone ? 0.45 : 0.75,
        }}>
          <div style={{ width:'100%', height:'100%', borderRadius:35, background:'transparent' }}/>
        </div>

        {/* Brilliant-style ambient glow blob — top-right */}
        <div style={{
          position:'absolute', top:-60, right:-60,
          width:280, height:280, borderRadius:'50%',
          background: allDone
            ? 'radial-gradient(circle,rgba(14,245,194,0.28),transparent 70%)'
            : 'radial-gradient(circle,rgba(14,245,194,0.16),transparent 70%)',
          filter:'blur(8px)',
          pointerEvents:'none',
        }}/>

        {/* Duolingo-style accent blob — bottom-left mascot zone */}
        <div style={{
          position:'absolute', bottom:-50, left:-50,
          width:220, height:220, borderRadius:'50%',
          background:'radial-gradient(circle,rgba(129,140,248,0.18),transparent 65%)',
          filter:'blur(10px)',
          pointerEvents:'none',
        }}/>

        {/* Top row: label + ring */}
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14,position:'relative'}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
              <span className="display-eyebrow" style={{ color: allDone ? T.teal : T.textSec }}>
                Day {dayNumber} · Mission
              </span>
              {allDone && (
                <span style={{
                  fontSize:11,fontWeight:900,color:T.ink,
                  background:T.teal,padding:'4px 12px',borderRadius:9999,
                  letterSpacing:'0.5px',
                }}>Complete ✓</span>
              )}
            </div>
            <h1 className="display-mega" style={{ margin: 0, position: 'relative' }}>
              {concept}
            </h1>
          </div>
          <MiniProgressRing
            size={56}
            value={completed}
            total={Math.max(total, 1)}
            stroke="var(--theme-primary)"
            track="rgba(255,255,255,0.07)"
            label={`${completed}/${total}`}
            labelColor={allDone ? T.teal : T.textSec}
            textSize={12}
          />
        </div>

        {/* Meta pills */}
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:18,position:'relative',flexWrap:'wrap'}}>
          {totalMin > 0 && (
            <span className="meta-pill is-time">
              <ClockIcon />~{totalMin} min
            </span>
          )}
          <span className="meta-pill is-xp">
            <BoltIcon />+{reward} XP
          </span>
          <span className="meta-pill">
            {total} tasks
          </span>
        </div>

        {/* Progress bar */}
        <div style={{position:'relative'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:7}}>
            <span style={{fontSize:12,fontWeight:800,color:T.textSec}}>
              {allDone ? 'All done!' : `${completed} of ${total} complete`}
            </span>
            <span style={{fontSize:13,fontWeight:900,color:allDone?T.teal:T.text}}>
              {Math.round(pct*100)}%
            </span>
          </div>
          <div className="progress-track" style={{height:10,background:'rgba(255,255,255,0.06)',borderRadius:9999,overflow:'hidden'}}>
            <div className="progress-fill" style={{
              height:'100%', width:`${Math.round(pct*100)}%`,
              background:allDone?'linear-gradient(90deg,#0ef5c2,#00d4ff)':T.primaryGradientSoft,
              borderRadius:9999,
              transition:'width 0.60s cubic-bezier(0.16,1,0.3,1)',
              boxShadow: pct>0 ? '0 0 14px rgba(14,245,194,0.55)' : 'none',
              position:'relative', overflow:'hidden',
            }}>
              {pct > 0 && pct < 1 && (
                <div style={{
                  position:'absolute', inset:0,
                  background:'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.32) 50%,transparent 100%)',
                  backgroundSize:'200% 100%',
                  animation:'shimmerSlide 1.5s ease-in-out infinite',
                }}/>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TodayQuestHero({
  goal,
  todayRow,
  tasks,
  visibleTasks,
  dayNumber,
  focusProgress,
  showMissionSurface,
  missionLoading,
  onContinue,
  onOpenPath,
}) {
  const safeTasks = Array.isArray(visibleTasks) && visibleTasks.length > 0
    ? visibleTasks
    : (Array.isArray(tasks) ? tasks : [])
  const nextTask = safeTasks.find((task) => !task.completed && !task._locked) || safeTasks.find((task) => !task.completed) || safeTasks[0]
  const completed = focusProgress?.completed || 0
  const total = focusProgress?.total || safeTasks.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const totalMinutes = safeTasks.reduce((sum, task) => sum + (Number(task.estimatedTimeMin || task.durationMin) || 0), 0)
  const rewardXp = safeTasks.reduce((sum, task) => sum + (Number(task.xp_reward || task.rewardXp || task.xp || task.points) || 0), 0) || 154
  const concept = todayRow?.covered_topics?.[0] || nextTask?._concept || nextTask?.title || goal?.goal_text || 'Today’s lesson'
  const heroTitle = nextTask?.title || concept
  const heroTitleWords = String(heroTitle).split(/\s+/).filter(Boolean)
  const heroAccentWordCount = heroTitleWords.length > 5 ? 3 : Math.min(2, Math.max(1, heroTitleWords.length - 1))
  const heroAccentStart = Math.max(1, heroTitleWords.length - heroAccentWordCount)
  const heroTitleLead = heroTitleWords.slice(0, heroAccentStart).join(' ')
  const heroTitleAccent = heroTitleWords.slice(heroAccentStart).join(' ')
  const pathSteps = safeTasks.slice(0, 4)
  const modeLabel = showMissionSurface ? 'Adaptive mission' : 'Daily lesson'

  return (
    <div className="today-quest-shell" style={{maxWidth:1040,margin:'14px auto 0',padding:'0 20px'}}>
      <section className="pathai-premium-hero" style={{
        position:'relative',
        overflow:'hidden',
        borderRadius:34,
        border:'1px solid color-mix(in srgb, var(--theme-primary) 22%, var(--theme-border))',
        background:[
          'radial-gradient(circle at 12% 12%, color-mix(in srgb, var(--theme-primary) 20%, transparent) 0%, transparent 34%)',
          'radial-gradient(circle at 88% 18%, color-mix(in srgb, var(--theme-secondary) 18%, transparent) 0%, transparent 32%)',
          'linear-gradient(145deg, color-mix(in srgb, var(--theme-card) 94%, white 6%), color-mix(in srgb, var(--theme-shell) 90%, black 10%))',
        ].join(','),
        padding:22,
        boxShadow:'0 28px 80px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.10)',
      }}>
        <div style={{
          position:'absolute',
          inset:0,
          background:'linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.06) 42%, transparent 72%)',
          transform:'translateX(-40%)',
          animation:'shimmerSweep 8s ease-in-out infinite',
          pointerEvents:'none',
        }}/>

        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))',
          gap:22,
          alignItems:'stretch',
          position:'relative',
          zIndex:1,
        }}>
          <div className="today-quest-copy" style={{padding:'16px 12px 14px'}}>
            <div className="today-quest-badge-row" style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:18}}>
              <div className="today-quest-badge is-league" style={{
                display:'inline-flex',
                alignItems:'center',
                gap:9,
                borderRadius:9999,
                padding:'8px 13px',
                border:'1px solid color-mix(in srgb, var(--theme-mastery) 38%, transparent)',
                background:'color-mix(in srgb, var(--theme-mastery) 16%, transparent)',
                color:T.mastery,
                fontSize:11,
                fontWeight:950,
                letterSpacing:'0.14em',
                textTransform:'uppercase',
              }}>
                <IconGlyph name="crown" size={14} strokeWidth={2.4} color={T.mastery}/>
                Sapphire League · #3
              </div>
              <div className="today-quest-badge is-day" style={{
                display:'inline-flex',
                alignItems:'center',
                gap:9,
                borderRadius:9999,
                padding:'8px 13px',
                border:'1px solid color-mix(in srgb, var(--theme-highlight) 38%, transparent)',
                background:'color-mix(in srgb, var(--theme-highlight) 16%, transparent)',
                color:T.amber,
                fontSize:11,
                fontWeight:950,
                letterSpacing:'0.14em',
                textTransform:'uppercase',
              }}>
                <IconGlyph name="flame" size={14} strokeWidth={2.4} color={T.amber}/>
                Day {dayNumber} · Streak Alive
              </div>
            </div>

            <h1 className="today-quest-title" style={{
              margin:'0 0 12px',
              color:T.text,
              fontSize:42,
              lineHeight:1.02,
              letterSpacing:'-0.045em',
              fontWeight:950,
              maxWidth:560,
            }}>
              {heroTitleLead}
              {heroTitleAccent && (
                <>
                  {' '}
                  <span className="today-title-accent">{heroTitleAccent}</span>
                </>
              )}
              <span className="today-title-sparkle" aria-hidden="true"> ✨</span>
            </h1>

            <p className="today-quest-subtitle" style={{
              margin:'0 0 20px',
              color:T.textSec,
              fontSize:17,
              lineHeight:1.58,
              fontWeight:750,
              maxWidth:560,
            }}>
              A focused path for today: learn the idea, practice it, then prove you can use it.
            </p>

            <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:22}}>
              {[
                { icon:'timer', label:totalMinutes > 0 ? `~${totalMinutes} min` : '~30 min' },
                { icon:'bolt', label:`+${rewardXp} XP` },
                { icon:'target', label:total > 0 ? `${total} tasks` : modeLabel },
              ].map((chip) => (
                <span key={chip.label} style={{
                  display:'inline-flex',
                  alignItems:'center',
                  gap:7,
                  borderRadius:9999,
                  padding:'8px 12px',
                  border:`1px solid ${T.border}`,
                  background:'rgba(255,255,255,0.055)',
                  color:T.textSec,
                  fontSize:13,
                  fontWeight:850,
                }}>
                  <IconGlyph name={chip.icon} size={14} strokeWidth={2.35} color={T.teal}/>
                  {chip.label}
                </span>
              ))}
            </div>

            <div className="today-hero-progress">
              <div className="today-hero-progress-head">
                <span>Mission progress</span>
                <strong>{pct}%</strong>
              </div>
              <div className="today-hero-progress-track">
                <div className="today-hero-progress-fill" style={{width:`${Math.max(4, pct)}%`}}/>
              </div>
            </div>

            <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
              <button
                type="button"
                onClick={onContinue}
                className="candy-cta is-pulsing"
                style={{
                  minHeight:54,
                  padding:'0 24px',
                  borderRadius:18,
                  border:'none',
                  background:T.primaryGradient,
                  color:T.ink,
                  fontFamily:T.font,
                  fontSize:16,
                  fontWeight:950,
                  cursor:'pointer',
                  boxShadow:'0 7px 0 color-mix(in srgb, var(--theme-primary) 48%, black 42%), 0 18px 38px color-mix(in srgb, var(--theme-primary) 20%, transparent)',
                  display:'inline-flex',
                  alignItems:'center',
                  gap:9,
                }}
              >
                {missionLoading ? 'Building mission' : 'Continue mission'}
                <IconGlyph name="arrow_right" size={18} strokeWidth={2.6} color={T.ink}/>
              </button>
              <button
                type="button"
                onClick={onOpenPath}
                className="dashboard-soft-button"
                style={{
                  minHeight:52,
                  padding:'0 18px',
                  borderRadius:17,
                  border:`1px solid ${T.border}`,
                  background:'rgba(255,255,255,0.045)',
                  color:T.textSec,
                  fontFamily:T.font,
                  fontSize:15,
                  fontWeight:900,
                  cursor:'pointer',
                  display:'inline-flex',
                  alignItems:'center',
                  gap:8,
                }}
              >
                <IconGlyph name="map" size={17} strokeWidth={2.35} color={T.textSec}/>
                View path
              </button>
            </div>
          </div>

          <div className="today-skill-path" style={{
            position:'relative',
            borderRadius:28,
            border:`1px solid ${T.border}`,
            background:'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.025))',
            padding:18,
            minHeight:300,
            boxShadow:'inset 0 1px 0 rgba(255,255,255,0.08)',
          }}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:18}}>
              <div>
                <div style={{fontSize:11,fontWeight:950,letterSpacing:'0.14em',textTransform:'uppercase',color:T.textMuted,marginBottom:5}}>
                  Skill path
                </div>
                <div style={{fontSize:19,fontWeight:950,color:T.text,letterSpacing:'-0.02em'}}>
                  {pct}% today
                </div>
              </div>
              <MiniProgressRing
                size={64}
                value={completed}
                total={Math.max(total, 1)}
                stroke="var(--theme-primary)"
                track="rgba(255,255,255,0.09)"
                label={`${pct}%`}
                labelColor={pct >= 100 ? T.teal : T.text}
                textSize={12}
              />
            </div>

            <div style={{display:'grid',gap:12}}>
              {(pathSteps.length > 0 ? pathSteps : [{ title:'Your next step', completed:false }]).map((task, index) => {
                const taskConfig = task?.title ? getTaskDisplayConfig(task) : { icon:'sparkles', label:'Lesson' }
                const isDone = Boolean(task?.completed)
                const isNext = !isDone && index === pathSteps.findIndex((candidate) => !candidate.completed)
                return (
                  <div key={`${task?.id || task?.title || 'path'}-${index}`} className={`today-skill-step${isNext ? ' is-next' : ''}${isDone ? ' is-done' : ''}`} style={{
                    display:'flex',
                    alignItems:'center',
                    gap:12,
                    borderRadius:20,
                    padding:'13px 14px',
                    border:`1px solid ${isNext ? T.tealBorder : T.border}`,
                    background:isNext
                      ? 'linear-gradient(90deg, color-mix(in srgb, var(--theme-primary) 15%, transparent), rgba(255,255,255,0.04))'
                      : 'rgba(255,255,255,0.035)',
                    boxShadow:isNext ? '0 14px 28px color-mix(in srgb, var(--theme-primary) 12%, transparent)' : 'none',
                    transform:isNext ? 'translateX(2px)' : 'none',
                    transition:'transform 0.2s ease, border-color 0.2s ease',
                  }}>
                    <div style={{
                      width:38,
                      height:38,
                      borderRadius:14,
                      flexShrink:0,
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center',
                      background:isDone ? T.primaryGradient : isNext ? 'rgba(14,245,194,0.12)' : 'rgba(255,255,255,0.045)',
                      border:`1px solid ${isDone || isNext ? T.tealBorder : T.border}`,
                      color:isDone ? T.ink : T.teal,
                    }}>
                      <IconGlyph name={isDone ? 'check' : taskConfig.icon || 'sparkles'} size={17} strokeWidth={2.55} color={isDone ? T.ink : T.teal}/>
                    </div>
                    <div style={{minWidth:0,flex:1}}>
                      <div style={{
                        fontSize:14,
                        fontWeight:950,
                        color:isDone ? T.textSec : T.text,
                        whiteSpace:'nowrap',
                        overflow:'hidden',
                        textOverflow:'ellipsis',
                      }}>
                        {task?.title || 'Personalized learning step'}
                      </div>
                      <div style={{fontSize:11,fontWeight:850,color:isNext ? T.teal : T.textMuted,marginTop:3}}>
                        {isDone ? 'Complete' : isNext ? 'Up next' : taskConfig.label || 'Lesson'}
                      </div>
                    </div>
                    {isNext && (
                      <div style={{
                        width:10,
                        height:10,
                        borderRadius:'50%',
                        background:T.teal,
                        boxShadow:'0 0 18px rgba(14,245,194,0.75)',
                        animation:'nodeBreath 1.8s ease-in-out infinite',
                      }}/>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function PathStatusPill({ status, compact = false }) {
  const tone = status === 'completed'
    ? { color:T.teal, bg:'rgba(14,245,194,0.10)', border:T.tealBorder, label:'Completed' }
    : status === 'current'
      ? { color:T.ink, bg:T.primaryGradient, border:'transparent', label:'Current' }
      : status === 'up_next' || status === 'upcoming'
        ? { color:T.blue, bg:'rgba(0,212,255,0.10)', border:'rgba(0,212,255,0.24)', label:'Up next' }
        : { color:T.textMuted, bg:'rgba(255,255,255,0.04)', border:T.border, label:'Locked' }

  return (
    <span style={{
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      minHeight:compact ? 24 : 28,
      padding:compact ? '0 8px' : '0 10px',
      borderRadius:9999,
      background:tone.bg,
      border:`1px solid ${tone.border}`,
      color:tone.color,
      fontSize:compact ? 10 : 11,
      fontWeight:900,
      letterSpacing:'0.10em',
      textTransform:'uppercase',
      whiteSpace:'nowrap',
    }}>
      {tone.label}
    </span>
  )
}

function MasteryStars({ count = 0 }) {
  return (
    <div style={{display:'inline-flex',alignItems:'center',gap:4}}>
      {[0,1,2].map((index) => (
        <IconGlyph
          key={index}
          name="sparkles"
          size={12}
          strokeWidth={2.3}
          color={index < count ? T.amber : 'rgba(255,255,255,0.16)'}
        />
      ))}
    </div>
  )
}

function PathTrackerSummary({ tracker }) {
  const breadcrumb = tracker.breadcrumb.moduleTitle
    ? `${tracker.breadcrumb.moduleTitle} / ${tracker.breadcrumb.unitTitle || 'Current unit'} / ${tracker.breadcrumb.subUnitTitle || 'Current concept'}`
    : 'Your curriculum tracker will appear as soon as your outline is ready.'

  return (
    <div style={{maxWidth:720,margin:'0 auto',padding:'0 20px'}}>
      <div style={{
        position:'relative',
        borderRadius:26,
        border:`1px solid ${T.border}`,
        background:'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
        padding:'22px 20px',
        backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
        boxShadow:'inset 0 1px 0 rgba(255,255,255,0.10),0 16px 40px rgba(0,0,0,0.24)',
        overflow:'hidden',
      }}>
        <div style={{
          position:'absolute', right:-60, top:-70, width:180, height:180, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(14,245,194,0.18) 0%, transparent 72%)',
          filter:'blur(12px)', pointerEvents:'none',
        }}/>

        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16,marginBottom:18,position:'relative'}}>
          <div style={{minWidth:0,flex:1}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:8,marginBottom:10,
              padding:'6px 12px',borderRadius:9999,background:'rgba(14,245,194,0.08)',border:`1px solid ${T.tealBorder}`}}>
              <IconGlyph name="map" size={14} strokeWidth={2.3} color={T.teal}/>
              <span style={{fontSize:10,fontWeight:900,letterSpacing:'0.16em',textTransform:'uppercase',color:T.teal}}>
                Curriculum Tracker
              </span>
            </div>
            <div style={{fontSize:28,fontWeight:900,color:T.text,letterSpacing:'-0.05em',lineHeight:1.05,marginBottom:10}}>
              {tracker.overallPercent}% complete
            </div>
            <div style={{fontSize:13,color:T.textSec,lineHeight:1.65,marginBottom:12}}>
              {breadcrumb}
            </div>
            <div className="progress-track" style={{height:8,background:'rgba(255,255,255,0.06)',borderRadius:9999,overflow:'hidden',maxWidth:420}}>
              <div className="progress-fill" style={{
                height:'100%',
                width:`${tracker.overallPercent}%`,
                background:T.primaryGradientSoft,
                borderRadius:9999,
                transition:'width 0.45s cubic-bezier(0.16,1,0.3,1)',
                boxShadow:'0 0 16px rgba(14,245,194,0.24)',
              }}/>
            </div>
          </div>

          <div style={{
            minWidth:120,
            borderRadius:22,
            border:`1px solid ${T.border}`,
            background:'rgba(255,255,255,0.04)',
            padding:'14px 12px',
            textAlign:'center',
          }}>
            <div style={{fontSize:10,fontWeight:900,letterSpacing:'0.16em',textTransform:'uppercase',color:T.textMuted,marginBottom:8}}>
              Modules
            </div>
            <div style={{fontSize:30,fontWeight:900,color:T.teal,lineHeight:1}}>
              {tracker.completedModules}/{tracker.totalModules}
            </div>
            <div style={{fontSize:11,color:T.textMuted,marginTop:4}}>completed</div>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))',gap:10,position:'relative'}}>
          {[
            {
              label:'Current module',
              value:tracker.breadcrumb.moduleTitle || 'Waiting on outline',
              icon:'layers',
              tone:T.text,
            },
            {
              label:'Current focus',
              value:tracker.breadcrumb.unitTitle || 'No active unit',
              icon:'goal',
              tone:T.text,
            },
            {
              label:'Current sub-unit',
              value:tracker.breadcrumb.subUnitTitle || 'No active sub-unit',
              icon:'sparkles',
              tone:T.textSec,
            },
            {
              label:'Next up',
              value:tracker.nextUpLabel || 'Keep going',
              icon:'rocket',
              tone:T.teal,
            },
            {
              label:'Identity',
              value:tracker.latestIdentityLabel || 'Seals unlock profile titles',
              icon:'badge',
              tone:tracker.latestIdentityLabel ? T.amber : T.textMuted,
            },
          ].map((entry) => (
            <div key={entry.label} style={{
              borderRadius:16,border:`1px solid ${T.border}`,background:'rgba(255,255,255,0.03)',
              padding:'12px 12px',
            }}>
              <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:8}}>
                <IconGlyph name={entry.icon} size={14} strokeWidth={2.3} color={T.textMuted}/>
                <span style={{fontSize:11,color:T.textMuted,fontWeight:700}}>{entry.label}</span>
              </div>
              <div style={{fontSize:13,fontWeight:800,color:entry.tone,lineHeight:1.35}}>
                {entry.value}
              </div>
            </div>
          ))}
        </div>

        <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',marginTop:14,position:'relative'}}>
          <span style={{fontSize:12,fontWeight:700,color:T.textMuted}}>
            Weighted progress {tracker.overallCompletedWeight}/{tracker.overallTotalWeight}
          </span>
          <span style={{fontSize:12,fontWeight:700,color:T.textMuted}}>
            {tracker.sealedModules} module seal{tracker.sealedModules === 1 ? '' : 's'} earned
          </span>
        </div>
      </div>
    </div>
  )
}

function PathSubUnitRow({ subUnit }) {
  const tone = subUnit.status === 'completed'
    ? { color:T.teal, bg:'rgba(14,245,194,0.10)', border:T.tealBorder, icon:'check_circle' }
    : subUnit.status === 'current'
      ? { color:T.ink, bg:T.primaryGradient, border:'transparent', icon:'goal' }
      : subUnit.status === 'up_next'
        ? { color:T.blue, bg:'rgba(0,212,255,0.10)', border:'rgba(0,212,255,0.22)', icon:'sparkles' }
        : { color:T.textMuted, bg:'rgba(255,255,255,0.04)', border:T.border, icon:'lock' }

  return (
    <div style={{
      display:'flex',alignItems:'center',gap:10,
      padding:'10px 12px',
      borderRadius:14,
      background:subUnit.status === 'completed' ? 'rgba(14,245,194,0.05)' : 'rgba(255,255,255,0.025)',
      border:`1px solid ${subUnit.status === 'completed' ? 'rgba(14,245,194,0.12)' : 'rgba(255,255,255,0.06)'}`,
    }}>
      <div style={{
        width:24,height:24,borderRadius:'50%',flexShrink:0,
        display:'flex',alignItems:'center',justifyContent:'center',
        background:tone.bg,border:`1px solid ${tone.border}`,
      }}>
        <IconGlyph name={tone.icon} size={12} strokeWidth={2.4} color={tone.color}/>
      </div>
      <div style={{flex:1,minWidth:0,fontSize:13,fontWeight:700,color:subUnit.status === 'locked' ? T.textMuted : T.text,
        lineHeight:1.35}}>
        {subUnit.title}
      </div>
      {subUnit.status === 'current' && (
        <span style={{fontSize:10,fontWeight:900,color:T.ink,background:T.teal,padding:'2px 8px',borderRadius:9999,whiteSpace:'nowrap'}}>
          Current
        </span>
      )}
      {subUnit.status === 'up_next' && (
        <span style={{fontSize:10,fontWeight:900,color:T.blue,background:'rgba(0,212,255,0.10)',padding:'2px 8px',borderRadius:9999,whiteSpace:'nowrap'}}>
          Next
        </span>
      )}
    </div>
  )
}

function PathProjectCard({ item }) {
  const isFinalExam = item.type === 'final_exam'
  const projectLabel = isFinalExam
    ? 'Final Exam'
    : item.kind === 'full_project'
      ? 'Milestone Project'
      : 'Mini Project'
  return (
    <div style={{
      position:'relative',
      borderRadius:20,
      border:`1px solid ${item.status === 'completed' ? 'rgba(167,139,250,0.26)' : item.status === 'current' ? 'rgba(167,139,250,0.40)' : item.status === 'up_next' ? 'rgba(167,139,250,0.28)' : 'rgba(167,139,250,0.18)'}`,
      background:item.status === 'current'
        ? 'linear-gradient(145deg, rgba(167,139,250,0.14), rgba(14,245,194,0.06))'
        : 'linear-gradient(145deg, rgba(167,139,250,0.08), rgba(255,255,255,0.03))',
      padding:'16px 16px',
      boxShadow:item.status === 'current' ? '0 12px 26px rgba(167,139,250,0.12)' : 'none',
      opacity:item.status === 'locked' ? 0.84 : 1,
    }}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',gap:10,minWidth:0}}>
          <div style={{
            width:40,height:40,borderRadius:14,flexShrink:0,
            display:'flex',alignItems:'center',justifyContent:'center',
            background:'rgba(167,139,250,0.14)',border:'1px solid rgba(167,139,250,0.24)',
            color:T.mastery,
          }}>
            <IconGlyph name={isFinalExam ? 'award' : 'hammer'} size={18} strokeWidth={2.3}/>
          </div>
          <div style={{minWidth:0}}>
            <div style={{fontSize:10,fontWeight:900,letterSpacing:'0.16em',textTransform:'uppercase',color:T.mastery,marginBottom:4}}>
              {projectLabel}
            </div>
            <div style={{fontSize:14,fontWeight:800,color:T.text,lineHeight:1.3}}>
              {item.title}
            </div>
            <div style={{fontSize:12,color:T.textMuted,marginTop:4}}>
              {item.milestoneLabel}
            </div>
          </div>
        </div>
        <PathStatusPill status={item.status} compact/>
      </div>

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:12,color:T.textSec,lineHeight:1.5}}>
          {item.generated
            ? isFinalExam
              ? item.completed
                ? `Passed with a best score of ${item.bestScore || item.passScore || 80}%.`
                : `Pass with ${item.passScore || 80}% or better. ${Math.max(0, (item.maxAttempts || 3) - (item.attemptsUsed || 0))} attempt${Math.max(0, (item.maxAttempts || 3) - (item.attemptsUsed || 0)) === 1 ? '' : 's'} remaining.`
              : `${item.impactLabel} ${item.kind === 'mini_project' ? 'This day is only the project.' : 'This is a full dedicated project day.'}`
            : isFinalExam
              ? 'This exam appears once the full course body is complete.'
              : 'This dedicated project day appears in your course sequence and unlocks when the module is complete.'}
        </span>
        {(item.status === 'current' || item.status === 'up_next') && (
          <span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:11,fontWeight:800,color:T.mastery}}>
            <IconGlyph name={item.status === 'current' ? 'rocket' : 'sparkles'} size={13} strokeWidth={2.3} color={T.mastery}/>
            {item.status === 'current'
              ? (isFinalExam ? 'Current finish line' : 'Current milestone')
              : (isFinalExam ? 'Finish line ahead' : 'Next milestone')}
          </span>
        )}
      </div>
    </div>
  )
}

function PathUnitCard({ item, expanded, onToggle }) {
  const current = item.status === 'current'
  const upcoming = item.status === 'up_next'
  const locked = item.status === 'locked'

  return (
    <div style={{
      borderRadius:20,
      border:`1px solid ${current ? T.tealBorder : item.status === 'completed' ? 'rgba(14,245,194,0.16)' : T.border}`,
      background: current
        ? 'linear-gradient(145deg, rgba(14,245,194,0.08), rgba(0,212,255,0.05))'
        : item.status === 'completed'
          ? 'linear-gradient(145deg, rgba(14,245,194,0.05), rgba(255,255,255,0.03))'
          : 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
      overflow:'hidden',
      boxShadow: current ? '0 12px 28px rgba(14,245,194,0.10)' : 'none',
      opacity: locked ? 0.76 : 1,
    }}>
      <button onClick={onToggle} className="interactive-secondary" style={{
        width:'100%', background:'none', border:'none', textAlign:'left',
        padding:'16px 16px', cursor:'pointer', fontFamily:T.font,
        display:'flex', alignItems:'center', gap:12,
      }}>
        <div style={{
          width:42,height:42,borderRadius:16,flexShrink:0,
          display:'flex',alignItems:'center',justifyContent:'center',
          background:item.status === 'completed'
            ? T.primaryGradient
            : current ? 'rgba(14,245,194,0.12)'
            : upcoming ? 'rgba(0,212,255,0.10)'
            : 'rgba(255,255,255,0.05)',
          color:item.status === 'completed' ? T.ink : current ? T.teal : upcoming ? T.blue : T.textMuted,
          border:`1px solid ${current ? T.tealBorder : upcoming ? 'rgba(0,212,255,0.18)' : 'rgba(255,255,255,0.06)'}`,
          animation:current ? 'pulseActive 2.5s ease-in-out infinite' : 'none',
        }}>
          {item.status === 'completed'
            ? <IconGlyph name="check" size={16} strokeWidth={2.7} color={T.ink}/>
            : <span style={{fontSize:14,fontWeight:900}}>{item.dayNumber}</span>}
        </div>

        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,flexWrap:'wrap'}}>
            <div style={{fontSize:15,fontWeight:800,color:locked ? T.textSec : T.text,lineHeight:1.25,minWidth:0}}>
              {item.title}
            </div>
            {item.hasAdjacentProject && (
              <span style={{
                display:'inline-flex',alignItems:'center',gap:5,
                padding:'3px 8px',borderRadius:9999,
                background:'rgba(167,139,250,0.10)',border:'1px solid rgba(167,139,250,0.18)',
                color:T.mastery,fontSize:10,fontWeight:900,letterSpacing:'0.08em',textTransform:'uppercase',
              }}>
                <IconGlyph name="hammer" size={11} strokeWidth={2.3} color={T.mastery}/>
                Project
              </span>
            )}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:8}}>
            <PathStatusPill status={item.status} compact/>
            <span style={{fontSize:12,fontWeight:700,color:item.status === 'completed' ? T.teal : T.textSec}}>
              {item.completionPercent}% complete
            </span>
            <span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:12,color:T.textMuted}}>
              <ClockIcon/>~{item.estimatedMinutes} min
            </span>
          </div>
          <div className="progress-track" style={{height:6,background:'rgba(255,255,255,0.06)',borderRadius:9999,overflow:'hidden'}}>
            <div className="progress-fill" style={{
              height:'100%',width:`${item.completionPercent}%`,
              background:item.status === 'completed'
                ? T.primaryGradientSoft
                : item.status === 'current'
                  ? T.primaryGradientSoft
                  : 'linear-gradient(90deg, rgba(0,212,255,0.70), rgba(129,140,248,0.70))',
              borderRadius:9999,transition:'width 0.45s cubic-bezier(0.16,1,0.3,1)',
            }}/>
          </div>
        </div>

        <div style={{
          width:30,height:30,borderRadius:'50%',flexShrink:0,
          display:'flex',alignItems:'center',justifyContent:'center',
          background:'rgba(255,255,255,0.04)',border:`1px solid ${T.border}`,
          color:T.textMuted,
          transform:expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          transition:'transform 0.18s cubic-bezier(0.16,1,0.3,1)',
        }}>
          <ArrowRight sz={13}/>
        </div>
      </button>

      {expanded && (
        <div style={{padding:'0 16px 16px'}}>
          <div style={{
            borderRadius:18,border:`1px solid ${T.border}`,background:'rgba(255,255,255,0.03)',
            padding:'14px 14px',
          }}>
            <div style={{fontSize:11,fontWeight:900,letterSpacing:'0.12em',textTransform:'uppercase',color:T.textMuted,marginBottom:8}}>
              Why this matters
            </div>
            <div style={{fontSize:13,color:T.textSec,lineHeight:1.6,marginBottom:12}}>
              {item.whyItMatters}
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(140px,1fr))',gap:10,marginBottom:12}}>
              <div style={{padding:'10px 12px',borderRadius:14,background:'rgba(255,255,255,0.03)',border:`1px solid ${T.border}`}}>
                <div style={{fontSize:10,fontWeight:800,color:T.textMuted,letterSpacing:'0.10em',textTransform:'uppercase',marginBottom:5}}>
                  Progress
                </div>
                <div style={{fontSize:13,fontWeight:800,color:T.text}}>
                  {item.completedTasks}/{Math.max(item.totalTasks, 0)} learning tasks
                </div>
              </div>
              <div style={{padding:'10px 12px',borderRadius:14,background:'rgba(255,255,255,0.03)',border:`1px solid ${T.border}`}}>
                <div style={{fontSize:10,fontWeight:800,color:T.textMuted,letterSpacing:'0.10em',textTransform:'uppercase',marginBottom:5}}>
                  Completion context
                </div>
                <div style={{fontSize:13,fontWeight:700,color:T.textSec,lineHeight:1.4}}>
                  {item.completionContext}
                </div>
              </div>
            </div>

            <div style={{fontSize:11,fontWeight:900,letterSpacing:'0.12em',textTransform:'uppercase',color:T.textMuted,marginBottom:10}}>
              Sub-units
            </div>
            <div style={{display:'grid',gap:8}}>
              {item.subUnits.map((subUnit) => (
                <PathSubUnitRow key={`${item.id}-${subUnit.id}`} subUnit={subUnit}/>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PathModuleCard({ module, expanded, onToggle, expandedUnits, onToggleUnit, index }) {
  return (
    <StaggerBlock index={index}>
      <div style={{
        borderRadius:24,
        border:`1px solid ${module.status === 'current' ? T.tealBorder : module.status === 'completed' ? 'rgba(14,245,194,0.18)' : T.border}`,
        background: module.status === 'current'
          ? 'linear-gradient(145deg, rgba(14,245,194,0.08), rgba(255,255,255,0.02))'
          : 'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
        overflow:'hidden',
        boxShadow: module.status === 'current' ? '0 16px 34px rgba(14,245,194,0.08)' : '0 10px 28px rgba(0,0,0,0.20)',
        opacity: module.status === 'upcoming' ? 0.92 : 1,
      }}>
        <button onClick={onToggle} className="interactive-secondary" style={{
          width:'100%', background:'none', border:'none', textAlign:'left',
          padding:'18px 18px', cursor:'pointer', fontFamily:T.font,
          display:'flex', alignItems:'center', gap:14,
        }}>
          <MiniProgressRing
            size={46}
            value={module.progressPercent}
            total={100}
            stroke={module.status === 'completed' ? 'var(--theme-primary)' : module.status === 'current' ? 'var(--theme-primary)' : 'rgba(255,255,255,0.28)'}
            track="rgba(255,255,255,0.08)"
            label={`${module.progressPercent}%`}
            labelColor={module.status === 'completed' ? T.teal : module.status === 'current' ? T.text : T.textSec}
            textSize={10}
          />
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:7}}>
              <div style={{fontSize:17,fontWeight:800,color:T.text,lineHeight:1.2,minWidth:0}}>
                {module.title}
              </div>
              <PathStatusPill status={module.status} compact/>
            </div>
            <div style={{fontSize:13,color:T.textSec,lineHeight:1.55,marginBottom:10}}>
              {module.description || 'Structured progression for this section of your course.'}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
              <span style={{fontSize:12,fontWeight:700,color:T.textMuted}}>
                {module.completedUnits}/{module.totalUnits} units complete
              </span>
              <span style={{fontSize:12,fontWeight:700,color:T.textMuted}}>
                Weighted progress {module.completedWeight}/{module.totalWeight}
              </span>
              <span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:12,fontWeight:800,color:module.sealEarned ? T.amber : T.textSec}}>
                <MasteryStars count={module.masteryStars}/>
                {module.sealEarned ? 'Seal earned' : `${module.masteryScore}% mastery`}
              </span>
            </div>
          </div>
          <div style={{
            width:34,height:34,borderRadius:'50%',flexShrink:0,
            display:'flex',alignItems:'center',justifyContent:'center',
            background:'rgba(255,255,255,0.04)',border:`1px solid ${T.border}`,
            color:T.textMuted,
            transform:expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition:'transform 0.18s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <ArrowRight sz={14}/>
          </div>
        </button>

        {expanded && (
          <div style={{padding:'0 18px 18px',display:'grid',gap:12}}>
            <div style={{
              borderRadius:18,
              border:`1px solid ${module.sealEarned ? 'rgba(251,191,36,0.24)' : T.border}`,
              background:module.sealEarned
                ? 'linear-gradient(145deg, rgba(251,191,36,0.12), rgba(255,255,255,0.04))'
                : 'rgba(255,255,255,0.03)',
              padding:'14px 16px',
              display:'grid',
              gap:10,
            }}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
                <div>
                  <div style={{fontSize:11,fontWeight:900,letterSpacing:'0.12em',textTransform:'uppercase',color:T.textMuted,marginBottom:6}}>
                    Module Mastery
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                    <MasteryStars count={module.masteryStars}/>
                    <span style={{fontSize:13,fontWeight:800,color:module.sealEarned ? T.amber : T.text}}>
                      {module.sealEarned ? 'Mastery Seal unlocked' : `${module.masteryScore}% mastery track`}
                    </span>
                  </div>
                  <div style={{fontSize:12,color:T.textSec,lineHeight:1.5}}>
                    {module.sealEarned
                      ? `${module.rewardClaimed ? 'Bonus chest claimed' : 'Bonus chest ready'} · ${module.identityLabel}`
                      : `Keep clearing units and scoring well on quizzes and challenges to complete this seal.`}
                  </div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:11,fontWeight:800,color:T.textMuted,letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:4}}>
                    Bonus chest
                  </div>
                  <div style={{fontSize:18,fontWeight:900,color:module.sealEarned ? T.teal : T.textSec}}>
                    +{module.rewardAmount}
                  </div>
                  <div style={{fontSize:11,color:T.textMuted}}>
                    {module.rewardClaimed ? 'claimed' : 'gems on seal'}
                  </div>
                </div>
              </div>
            </div>
            {module.items.map((item, itemIndex) => (
              item.type === 'project' || item.type === 'final_exam'
                ? <PathProjectCard key={`${module.id}:${item.id}:${item.sequenceIndex || item.dayNumber || itemIndex}`} item={item}/>
                : (
                  <PathUnitCard
                    key={`${module.id}:${item.id}:${item.sequenceIndex || item.dayNumber || itemIndex}`}
                    item={item}
                    expanded={Boolean(expandedUnits[item.id])}
                    onToggle={() => onToggleUnit(item.id)}
                  />
                )
            ))}
          </div>
        )}
      </div>
    </StaggerBlock>
  )
}

function canRerollTask(task) {
  const normalized = normalizeLearningTask(task)
  return Boolean(task) && !normalized.completed && !['project', 'boss', 'quiz', 'final_exam'].includes(normalized.type)
}

// ─── Task Preview Modal ────────────────────────────────────────────────────────
function TaskPreview({ task, onClose, onStart, onComplete, onReroll, rerollCount = 0, isCompleting, rerollingTaskId = null }) {
  const normalizedTask = normalizeLearningTask(task)
  const ts   = taskStyle(normalizedTask)
  const xp   = xpForTask(normalizedTask)
  const info = getTaskDisplayConfig(normalizedTask)
  const chipLabel = normalizedTask.domainTaskLabel || normalizedTask.domainTaskType || info.chipLabel
  const me   = isCompleting === task.id
  const anyCompleting = Boolean(isCompleting)
  const isLocked = Boolean(normalizedTask._locked)
  const requiresLessonCompletion = normalizedTask.type === 'concept' && !TEMPORARILY_ENABLE_DEV_COMPLETE_BUTTON
  const canUseReroll = canRerollTask(task) && rerollCount > 0 && !anyCompleting && rerollingTaskId !== task.id && !isLocked
  const label = info.actionLabel || 'Start'

  const brickShadow = '0 5px 0 0 color-mix(in oklab, var(--color-background) 55%, oklch(0 0 0))'

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div onClick={onClose} className="lovable-app" style={{
      position:'fixed', inset:0, zIndex:150,
      background:'rgba(3,10,18,0.72)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:'24px',
      animation:'fadeInBg 0.2s ease both',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width:'100%', maxWidth:540,
        background:'var(--color-surface)',
        borderRadius:28,
        borderTop:'2px solid var(--color-border)',
        borderLeft:'2px solid var(--color-border)',
        borderRight:'2px solid var(--color-border)',
        borderBottom:'2px solid var(--color-border)',
        animation:'slideUpPreview 0.28s cubic-bezier(0.16,1,0.3,1) both',
        maxHeight:'88vh', overflowY:'auto',
        boxShadow:'0 28px 90px rgba(0,0,0,0.55)',
        position:'relative',
      }}>
        <button
          type="button"
          aria-label="Close task preview"
          onClick={onClose}
          style={{
            position:'absolute',
            top:14,
            right:14,
            zIndex:2,
            width:38,
            height:38,
            borderRadius:14,
            border:'2px solid var(--color-border)',
            background:'color-mix(in oklab, var(--color-surface-2) 88%, transparent)',
            color:'var(--color-foreground)',
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            cursor:'pointer',
            fontSize:22,
            fontWeight:900,
            lineHeight:1,
            boxShadow:brickShadow,
          }}
        >
          ×
        </button>

        {/* Header band */}
        <div style={{ padding:'24px 72px 22px 24px', borderBottom:'1px solid var(--color-border)' }}>
          {/* Type + meta row */}
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}>
            <div style={{
              width:44, height:44, borderRadius:14,
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
              background:`color-mix(in oklab, ${ts.color} 22%, transparent)`,
              color:ts.color, border:`2px solid color-mix(in oklab, ${ts.color} 45%, transparent)`,
              boxShadow:`0 3px 0 0 color-mix(in oklab, ${ts.color} 45%, #000)`,
            }}>
              <IconGlyph name={info.icon} size={19} strokeWidth={2.4}/>
            </div>
            <span style={{
              padding:'6px 12px',
              background:`color-mix(in oklab, ${ts.color} 16%, transparent)`,
              border:`2px solid color-mix(in oklab, ${ts.color} 38%, transparent)`,
              borderRadius:9999, fontSize:11, fontWeight:900, color:ts.color,
              letterSpacing:'0.12em', textTransform:'uppercase',
            }}>{chipLabel}</span>
            <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8}}>
              <span style={{
                fontSize:12,color:'var(--color-muted-foreground)',fontWeight:800,
                display:'flex',alignItems:'center',gap:5,
                background:'var(--color-surface)',border:'2px solid var(--color-border)',padding:'6px 11px',borderRadius:9999,
              }}>
                <ClockIcon sz={13}/>{normalizedTask.estimatedTimeMin || normalizedTask.durationMin || 0}m
              </span>
              <span style={{
                fontSize:12,fontWeight:900,color:'var(--color-amber)',
                display:'flex',alignItems:'center',gap:4,
                background:'color-mix(in oklab, var(--color-amber) 16%, transparent)',
                border:'2px solid color-mix(in oklab, var(--color-amber) 40%, transparent)',
                padding:'6px 11px',borderRadius:9999,
              }}>
                <BoltIcon sz={13}/>+{xp} XP
              </span>
            </div>
          </div>

          {/* Title */}
          <h2 className="font-display" style={{fontSize:26,fontWeight:800,color:'var(--color-foreground)',lineHeight:1.18,margin:0,letterSpacing:'-0.02em'}}>
            {normalizedTask.title}
          </h2>
        </div>

        {/* Body */}
        <div style={{padding:'20px 24px 32px', display:'flex', flexDirection:'column', gap:16}}>
        {/* Description */}
        {normalizedTask.description && (
          <p style={{fontSize:15,color:'var(--color-muted-foreground)',lineHeight:1.65,margin:0}}>
            {normalizedTask.description}
          </p>
        )}

        {isLocked && (
          <div style={{
            padding:'16px 18px',
            background:'color-mix(in oklab, var(--color-amber) 14%, transparent)',
            border:'2px solid color-mix(in oklab, var(--color-amber) 38%, transparent)',
            borderRadius:18,
          }}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,color:'var(--color-amber)',fontSize:12,fontWeight:900,letterSpacing:'0.1em',textTransform:'uppercase'}}>
              <IconGlyph name="lock" size={14} strokeWidth={2.4} color="var(--color-amber)"/>
              Locked in sequence
            </div>
            <p style={{margin:0,fontSize:14,color:'var(--color-muted-foreground)',lineHeight:1.6}}>
              {normalizedTask._lockedReason || 'Finish the earlier task in today\'s mission first.'}
            </p>
          </div>
        )}

        {/* What to expect */}
        <div style={{
          padding:'16px 18px', background:'var(--color-surface-2)',
          border:'2px solid var(--color-border)', borderRadius:18,
        }}>
          <div style={{fontSize:11,fontWeight:900,color:'var(--color-primary)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:8}}>
            What to expect
          </div>
          <p style={{fontSize:14,color:'var(--color-muted-foreground)',lineHeight:1.6,margin:0}}>
            {info.summary}
          </p>
        </div>

        {/* Resource link */}
        {normalizedTask.resourceUrl && (
          <a href={normalizedTask.resourceUrl} target="_blank" rel="noopener noreferrer" style={{
            display:'inline-flex', alignItems:'center', gap:6,
            fontSize:14, color:'var(--color-primary)', fontWeight:800,
            textDecorationLine:'none',
          }}>
            {normalizedTask.resourceTitle || 'Open resource'} <ArrowRight sz={13}/>
          </a>
        )}

        {/* Action buttons */}
        {task.completed ? (
          <div style={{
            padding:'16px', background:'color-mix(in oklab, var(--color-mint) 14%, transparent)',
            border:'2px solid color-mix(in oklab, var(--color-mint) 40%, transparent)', borderRadius:18,
            textAlign:'center', fontSize:15, fontWeight:900, color:'var(--color-mint)',
            textTransform:'uppercase', letterSpacing:'0.06em',
          }}>
            Completed
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {canRerollTask(task) && (
              <button
                disabled={!canUseReroll}
                onClick={() => { onClose(); onReroll?.(task) }}
                style={{
                  width:'100%',
                  padding:'14px 16px',
                  background: 'var(--color-surface-2)',
                  border:'2px solid var(--color-border)',
                  borderRadius:16,
                  color: canUseReroll ? 'var(--color-foreground)' : 'var(--color-muted-foreground)',
                  fontSize:13,
                  fontWeight:900,
                  cursor: canUseReroll ? 'pointer' : 'default',
                  boxShadow: brickShadow,
                  opacity: canUseReroll ? 1 : 0.6,
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'space-between',
                }}
              >
                <span style={{display:'inline-flex',alignItems:'center',gap:8}}>
                  <IconGlyph name="repeat" size={15} strokeWidth={2.4} color={canUseReroll ? 'var(--color-primary)' : 'var(--color-muted-foreground)'}/>
                  {rerollingTaskId === task.id ? 'Refreshing task…' : 'Use Task Reroll'}
                </span>
                <span style={{fontSize:11,fontWeight:900,color:canUseReroll ? 'var(--color-primary)' : 'var(--color-muted-foreground)',letterSpacing:'0.1em',textTransform:'uppercase'}}>
                  {rerollCount} left
                </span>
              </button>
            )}
            <div style={{display:'flex',gap:12}}>
            <button onClick={() => {
              if (anyCompleting || isLocked) return
              onClose()
              onStart(task)
            }} style={{
              flex:1, padding:'16px 14px',
              background:'var(--color-surface-2)',
              border:`2px solid ${isLocked ? 'var(--color-border)' : 'color-mix(in oklab, var(--color-primary) 45%, var(--color-border))'}`,
              borderRadius:16,
              color:isLocked ? 'var(--color-muted-foreground)' : 'var(--color-foreground)',
              fontFamily:"'Sora', ui-sans-serif, system-ui, sans-serif",
              fontSize:14, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.04em',
              cursor: anyCompleting || isLocked ? 'default' : 'pointer',
              boxShadow: brickShadow,
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              opacity: anyCompleting || isLocked ? 0.5 : 1,
              transition:'filter 0.15s, transform 0.08s',
            }}
            onMouseDown={e=>{if(!anyCompleting && !isLocked)e.currentTarget.style.transform='translateY(3px)'}}
            onMouseUp={e=>{e.currentTarget.style.transform=''}}
            onMouseLeave={e=>{e.currentTarget.style.transform=''}}>
              <PlayIcon/> {label}
            </button>
            <button
              disabled={anyCompleting || isLocked || requiresLessonCompletion}
              onClick={e => {
                if (anyCompleting || isLocked || requiresLessonCompletion) return
                onClose()
                onComplete(task, e)
              }}
              style={{
                width: me ? 52 : undefined,
                height: me ? 52 : undefined,
                padding: me ? 0 : '16px 22px',
                background: me ? 'var(--color-mint)' : anyCompleting || isLocked || requiresLessonCompletion ? 'var(--color-surface-2)' : 'var(--color-primary)',
                border: anyCompleting || isLocked || requiresLessonCompletion ? '2px solid var(--color-border)' : 'none',
                borderRadius: me ? '50%' : 16,
                color: me ? '#031222' : anyCompleting || isLocked || requiresLessonCompletion ? 'var(--color-muted-foreground)' : 'var(--color-primary-foreground)',
                fontFamily:"'Sora', ui-sans-serif, system-ui, sans-serif",
                fontSize:14, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.04em',
                cursor: anyCompleting || isLocked || requiresLessonCompletion ? 'default' : 'pointer',
                boxShadow: me
                  ? '0 0 22px color-mix(in oklab, var(--color-mint) 55%, transparent)'
                  : anyCompleting || isLocked || requiresLessonCompletion
                    ? 'none'
                    : '0 6px 0 0 var(--color-primary-shadow), 0 12px 24px -8px color-mix(in oklab, var(--color-primary) 55%, transparent)',
                display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                opacity: (anyCompleting && !me) || isLocked || requiresLessonCompletion ? 0.5 : 1,
                transition:'all 0.20s cubic-bezier(0.34,1.56,0.64,1)',
              }}
              onMouseDown={e=>{if(!anyCompleting && !isLocked && !requiresLessonCompletion && !me){e.currentTarget.style.transform='translateY(4px)';e.currentTarget.style.boxShadow='0 2px 0 0 var(--color-primary-shadow)'}}}
              onMouseUp={e=>{if(!me){e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 6px 0 0 var(--color-primary-shadow), 0 12px 24px -8px color-mix(in oklab, var(--color-primary) 55%, transparent)'}}}
            >
              {me
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#031222" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{animation:'popIn 0.25s cubic-bezier(0.34,1.56,0.64,1)'}}><polyline points="20 6 9 17 4 12"/></svg>
                : anyCompleting ? 'Wait…' : <><BoltIcon sz={14}/>Complete</>}
            </button>
            </div>
            {requiresLessonCompletion && !isLocked && (
              <p style={{margin:0,fontSize:12,color:'var(--color-muted-foreground)',lineHeight:1.55}}>
                Concept tasks unlock the rest of the day only after you finish the lesson handoff from inside the concept view.
              </p>
            )}
          </div>
        )}
        </div>{/* /body */}
      </div>
    </div>
  )
}

// ─── Task Item (with optimistic completion) ────────────────────────────────────
function TaskItem({ task, onPreview, index }) {
  const normalizedTask = normalizeLearningTask(task)
  const ts      = taskStyle(normalizedTask)
  const xp      = xpForTask(normalizedTask)
  const info    = getTaskDisplayConfig(normalizedTask)
  const chipLabel = normalizedTask.domainTaskLabel || normalizedTask.domainTaskType || info.chipLabel
  const isLocked = Boolean(normalizedTask._locked)
  const isCourseFinalTask = isCourseFinalExamTask(task)
  const finalExamMeta = task?._courseFinal || {}
  const finalExamAttemptsRemaining = Math.max(0, (Number(finalExamMeta.maxAttempts) || 3) - (Number(finalExamMeta.attemptsUsed) || 0))
  const mins = normalizedTask.estimatedTimeMin || normalizedTask.durationMin || 0

  return (
    <div
      onClick={() => onPreview(task)}
      className={`dashboard-task-card interactive-card${task.completed ? ' is-complete' : ''}${isLocked ? ' is-locked' : ''}`}
      style={{
        background: task.completed
          ? 'rgba(14,245,194,0.035)'
          : 'linear-gradient(145deg,rgba(255,255,255,0.085) 0%,rgba(255,255,255,0.03) 100%)',
        border:`1px solid ${task.completed ? 'rgba(14,245,194,0.16)' : 'rgba(255,255,255,0.12)'}`,
        borderRadius:20,
        overflow:'hidden',
        backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
        boxShadow: task.completed
          ? 'none'
          : isLocked
            ? 'none'
            : 'inset 0 1px 0 rgba(255,255,255,0.07), 0 4px 20px rgba(0,0,0,0.18)',
        transition:'all 0.22s cubic-bezier(0.16,1,0.3,1)',
        animation:`fadeUp 0.35s ${index*0.045}s both`,
        opacity: task.completed ? 0.6 : isLocked ? 0.75 : 1,
        cursor:'pointer',
        display:'flex',
      }}
      onMouseEnter={e=>{if(!task.completed && !isLocked){e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 28px rgba(0,0,0,0.22)'}}}
      onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=task.completed?'none':isLocked?'none':'inset 0 1px 0 rgba(255,255,255,0.07), 0 4px 20px rgba(0,0,0,0.18)'}}
    >
      {/* Left color accent bar */}
      <div className="dashboard-task-accent" style={{
        width: 4, flexShrink:0,
        background: task.completed ? 'rgba(14,245,194,0.35)' : isLocked ? 'rgba(251,191,36,0.45)' : ts.color,
        opacity: task.completed ? 0.5 : 1,
      }}/>

      {/* Main content */}
      <div className="dashboard-task-content" style={{flex:1, padding:'14px 16px', minWidth:0}}>
        {/* Top row: icon + badge + meta */}
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
          <div className="dashboard-task-icon" style={{
            width:38, height:38, borderRadius:12, flexShrink:0,
            display:'flex', alignItems:'center', justifyContent:'center',
            background: task.completed ? 'rgba(14,245,194,0.08)' : ts.bg,
            border:`1px solid ${task.completed ? 'rgba(14,245,194,0.18)' : ts.border}`,
            color: task.completed ? T.teal : ts.color,
          }}>
            {task.completed
              ? <IconGlyph name="check" size={14} strokeWidth={2.8} color={T.teal}/>
              : isLocked
                ? <IconGlyph name="lock" size={13} strokeWidth={2.4} color="#FBBF24"/>
                : <span className="dashboard-task-number">{index + 1}</span>
            }
          </div>
          <span className="dashboard-task-chip" style={{
            padding:'3px 9px', background:ts.bg, border:`1px solid ${ts.border}`,
            borderRadius:9999, fontSize:11, fontWeight:900, color:ts.color, letterSpacing:'0.8px',
          }}>{chipLabel}</span>
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
            {mins > 0 && (
              <span style={{display:'flex',alignItems:'center',gap:4,fontSize:12,color:T.textSec,fontWeight:700}}>
                <ClockIcon/>{mins}m
              </span>
            )}
            <span style={{
              fontSize:12, fontWeight:900,
              color: task.completed ? T.teal : '#FBBF24',
              display:'flex', alignItems:'center', gap:3,
            }}>
              {task.completed
                ? <span style={{animation:'checkPop 0.3s cubic-bezier(0.34,1.56,0.64,1)',display:'inline-flex',alignItems:'center',gap:3,color:T.teal}}>Done</span>
                : <><BoltIcon />+{xp} XP</>}
            </span>
          </div>
        </div>

        {/* Title */}
        <div className="dashboard-task-title" style={{
          fontSize:17, fontWeight:800,
          color: task.completed ? T.textMuted : T.text,
          lineHeight:1.3, marginBottom: (normalizedTask.description && !task.completed) ? 7 : 0,
          textDecorationLine: task.completed ? 'line-through' : 'none',
          textDecorationColor: 'rgba(255,255,255,0.18)',
        }}>
          {normalizedTask.title}
        </div>

        {/* Description */}
        {normalizedTask.description && !task.completed && (
          <p className="dashboard-task-description" style={{fontSize:14,color:T.textSec,lineHeight:1.6,margin:0,marginBottom:10}}>
            {normalizedTask.description.length > 95 ? `${normalizedTask.description.slice(0, 95)}…` : normalizedTask.description}
          </p>
        )}

        {isCourseFinalTask && !task.completed && (
          <div style={{
            marginTop:8, padding:'8px 12px', borderRadius:12,
            background:'rgba(251,191,36,0.07)', border:'1px solid rgba(251,191,36,0.16)',
            display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap',
          }}>
            <span style={{fontSize:11,fontWeight:800,color:'#FBBF24'}}>Pass {finalExamMeta.passScore || 80}%</span>
            <span style={{fontSize:11,color:T.textSec}}>{finalExamAttemptsRemaining} attempt{finalExamAttemptsRemaining===1?'':'s'} left</span>
          </div>
        )}

        {/* Bottom cta row */}
        {!task.completed && (
          <div className="dashboard-task-footer" style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:8}}>
            <span style={{
              fontSize:12, fontWeight:700,
              color: isLocked ? '#FBBF24' : T.textSec,
              display:'flex', alignItems:'center', gap:4,
            }}>
              {isLocked && <IconGlyph name="lock" size={10} strokeWidth={2.4} color="#FBBF24"/>}
              {isLocked ? (normalizedTask._lockedReason || 'Finish earlier task first') : 'Tap to begin'}
            </span>
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'center',
              width:30, height:30, borderRadius:'50%',
              background: isLocked ? 'rgba(251,191,36,0.08)' : 'rgba(14,245,194,0.08)',
              color: isLocked ? '#FBBF24' : T.teal,
            }}>
              <ArrowRight sz={11}/>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Path View Overlay — Brilliant.org faithful recreation ───────────────────
//
// Visual reference: Brilliant's course path uses Rive animations. From the
// screenshots: dark #0a0a0f bg, center-column layout, large 3D puck nodes,
// active node has a purple glowing aura halo on the "floor" beneath it plus a
// 3D icon/gem figure sitting on top, locked nodes are matte gray flat ellipses
// that shrink slightly as they go down, label text to the RIGHT of node,
// section header is a rounded-rect with purple border, "LEVEL N / Title".
// Bottom popup: dark card, bold title, large solid purple rounded "Start" btn.

const MOCK_SECTIONS = [
  {
    level: 1,
    title: 'Complexity Fundamentals',
    nodes: [
      { id:'n1', label:'Complexity Fundamentals', state:'done'   },
      { id:'n2', label:'Complexity Symptoms',     state:'active' },
      { id:'n3', label:'Strategic Programming',   state:'locked' },
      { id:'n4', label:'Section Review',          state:'locked', isReview: true },
    ],
  },
  {
    level: 2,
    title: 'Module Design',
    nodes: [
      { id:'n5', label:'Deep Modules',            state:'locked' },
      { id:'n6', label:'General-Purpose Modules', state:'locked' },
      { id:'n7', label:'Different Abstractions',  state:'locked' },
      { id:'n8', label:'Module Review',           state:'locked', isReview: true },
    ],
  },
]

// The 3D "gem" icon that sits ON TOP of the active disc (like Brilliant's character)
function ActiveGem({ size = 52 }) {
  return (
    <div style={{
      position:'absolute',
      bottom:'62%',
      left:'50%',
      transform:'translateX(-50%)',
      width:size,
      height:size,
      zIndex:3,
      animation:'nodeFloat 2.6s ease-in-out infinite',
      filter:'drop-shadow(0 8px 16px rgba(109,40,217,0.70))',
      pointerEvents:'none',
    }}>
      <svg width={size} height={size} viewBox="0 0 52 52" fill="none">
        {/* Gem body — octagonal faceted shape */}
        <polygon points="26,4 40,14 44,28 36,44 16,44 8,28 12,14" fill="#7c3aed"/>
        <polygon points="26,4 40,14 26,10"     fill="#a78bfa" opacity="0.9"/>
        <polygon points="26,4 12,14 26,10"     fill="#c4b5fd" opacity="0.7"/>
        <polygon points="40,14 44,28 36,20"    fill="#6d28d9" opacity="0.8"/>
        <polygon points="12,14 8,28 16,20"     fill="#8b5cf6" opacity="0.7"/>
        <polygon points="26,10 40,14 36,20 26,18 16,20 12,14" fill="#9333ea" opacity="0.6"/>
        {/* Inner sparkle */}
        <circle cx="22" cy="17" r="2.5" fill="white" opacity="0.55"/>
        <circle cx="20" cy="15" r="1.2" fill="white" opacity="0.35"/>
      </svg>
    </div>
  )
}

// The glow halo that appears on the "floor" under the active disc — Brilliant's
// signature effect: a soft radial bloom of purple/violet light spilling outward
function ActiveHalo({ W }) {
  return (
    <div style={{
      position:'absolute',
      bottom: -28,
      left:'50%',
      transform:'translateX(-50%)',
      width: W * 2.4,
      height: 60,
      borderRadius:'50%',
      background:'radial-gradient(ellipse at center, rgba(139,92,246,0.55) 0%, rgba(109,40,217,0.28) 35%, transparent 72%)',
      filter:'blur(8px)',
      animation:'nodeGlow 2.6s ease-in-out infinite',
      pointerEvents:'none',
      zIndex:0,
    }}/>
  )
}

function BrilliantDiscNode({ node, index, sectionIndex, onTap }) {
  const { state, label, isReview } = node
  const isActive = state === 'active'
  const isDone   = state === 'done'
  const isLocked = state === 'locked'

  // Brilliant: nodes get slightly smaller as they go deeper into locked state
  const lockScale = isLocked ? Math.max(0.78, 1 - (index * 0.05)) : 1

  // Disc dimensions (wide flat ellipse, wider than tall — ~1.9:1 ratio)
  const baseW = isReview ? 108 : 96
  const baseH = isReview ? 50  : 48
  const W = Math.round(baseW * lockScale)
  const H = Math.round(baseH * lockScale)

  // Colors
  const topFace = isActive
    ? 'radial-gradient(ellipse at 42% 30%, #c4b5fd 0%, #7c3aed 48%, #3b0764 100%)'
    : isDone
    ? 'radial-gradient(ellipse at 42% 30%, #a7f3d0 0%, #059669 50%, #064e3b 100%)'
    : isReview
    ? 'radial-gradient(ellipse at 42% 30%, #e2e8f0 0%, #94a3b8 50%, #475569 100%)'
    : 'radial-gradient(ellipse at 42% 30%, #cbd5e1 0%, #64748b 52%, #1e293b 100%)'

  // Stacked depth rings below the top face — creates the "thick puck" illusion
  // Brilliant appears to have 3-4 rings, each offset downward and darkened
  const depthLayers = isActive
    ? ['#5b21b6','#4c1d95','#3b0764']
    : isDone
    ? ['#047857','#065f46','#064e3b']
    : isReview
    ? ['#64748b','#475569','#334155']
    : ['#475569','#334155','#1e293b']

  // Floor glow beneath entire node group (only active)
  // Label side: Brilliant always puts label to the RIGHT, centered vertically
  const delayS = (sectionIndex * 0.15) + (index * 0.10)

  return (
    <div
      style={{
        display:'flex',
        flexDirection:'row',
        alignItems:'center',
        justifyContent:'center',
        gap:28,
        width:'100%',
        animation:`pathNodeIn 0.55s ${delayS}s cubic-bezier(0.34,1.3,0.64,1) both`,
        cursor: isLocked ? 'default' : 'pointer',
        userSelect:'none',
      }}
      onClick={() => !isLocked && onTap(node)}
    >
      {/* ── Disc assembly ── */}
      <div style={{
        position:'relative',
        // Extra height so gem + halo have room
        width: W + 20,
        height: H + (isActive ? 80 : 24),
        flexShrink:0,
        display:'flex',
        alignItems:'flex-end',
        justifyContent:'center',
      }}>
        {/* Floor halo (active only) */}
        {isActive && <ActiveHalo W={W}/>}

        {/* Depth rings — rendered bottom-up so top face sits above */}
        {depthLayers.map((col, di) => {
          const ringW = W - di * 3
          const ringH = H - di * 1
          const bottom = di * 5
          return (
            <div key={di} style={{
              position:'absolute',
              bottom,
              left:'50%',
              transform:'translateX(-50%)',
              width: ringW,
              height: ringH,
              borderRadius:'50%',
              background: col,
              zIndex: di + 1,
            }}/>
          )
        })}

        {/* Top face */}
        <div
          style={{
            position:'absolute',
            bottom: depthLayers.length * 5,
            left:'50%',
            transform:'translateX(-50%)',
            width: W,
            height: H,
            borderRadius:'50%',
            background: topFace,
            zIndex: depthLayers.length + 1,
            boxShadow: isActive
              ? '0 0 0 2px rgba(167,139,250,0.40), 0 0 24px rgba(139,92,246,0.50)'
              : isDone
              ? '0 0 0 2px rgba(52,211,153,0.30)'
              : 'none',
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            transition:'transform 0.22s cubic-bezier(0.16,1,0.3,1)',
            overflow:'hidden',
          }}
          onMouseEnter={e => { if (!isLocked) e.currentTarget.style.transform = 'translateX(-50%) scale(1.06)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(-50%) scale(1)' }}
        >
          {/* Rim highlight — bright arc at top-left of face */}
          <div style={{
            position:'absolute',
            top:5, left:'50%',
            transform:'translateX(-50%)',
            width: W * 0.50,
            height:9,
            borderRadius:'50%',
            background: 'radial-gradient(ellipse, rgba(255,255,255,0.52) 0%, transparent 75%)',
            pointerEvents:'none',
          }}/>

          {/* Icon inside disc (only for done + locked) */}
          {isDone && (
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.90)" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          )}
          {isLocked && (
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          )}
        </div>

        {/* Gem figure sitting on top of active disc */}
        {isActive && <ActiveGem size={46}/>}
      </div>

      {/* ── Label ── */}
      <div style={{ width:140, flexShrink:0 }}>
        <div style={{
          fontSize: isActive ? 16 : 15,
          fontWeight: isActive ? 800 : isDone ? 600 : 500,
          color: isActive
            ? '#ffffff'
            : isDone
            ? 'rgba(255,255,255,0.80)'
            : 'rgba(255,255,255,0.28)',
          lineHeight:1.3,
          letterSpacing: isActive ? '-0.2px' : '0px',
          marginBottom: (isActive || isDone) ? 4 : 0,
        }}>
          {label}
        </div>
        {isDone && (
          <div style={{ fontSize:11, color:'#34d399', fontWeight:700 }}>Completed</div>
        )}
        {isActive && (
          <div style={{ fontSize:11, color:'#a78bfa', fontWeight:700, letterSpacing:'0.2px' }}>
            Up next
          </div>
        )}
      </div>
    </div>
  )
}

function PathViewOverlay({ onClose }) {
  const [selected, setSelected] = useState(null)
  const [closing,  setClosing]  = useState(false)

  function handleClose() {
    setClosing(true)
    setTimeout(onClose, 320)
  }

  // Count totals across all sections
  const allNodes   = MOCK_SECTIONS.flatMap(s => s.nodes)
  const doneCount  = allNodes.filter(n => n.state === 'done').length
  const totalCount = allNodes.length

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:500,
      background:'#0a0a0f',
      display:'flex', flexDirection:'column',
      fontFamily:T.font,
      animation: closing
        ? 'pathSlideDown 0.32s cubic-bezier(0.4,0,1,1) both'
        : 'pathSlideUp 0.36s cubic-bezier(0.16,1,0.3,1) both',
    }}>

      {/* ── Top bar (mirrors Brilliant's nav) ── */}
      <div style={{
        padding:'16px 20px',
        display:'flex',
        alignItems:'center',
        gap:16,
        borderBottom:'1px solid rgba(255,255,255,0.06)',
        flexShrink:0,
      }}>
        <button
          onClick={handleClose}
          style={{
            width:38, height:38, borderRadius:'50%',
            background:'rgba(255,255,255,0.07)',
            border:'1px solid rgba(255,255,255,0.09)',
            color:'rgba(255,255,255,0.55)', fontSize:20,
            cursor:'pointer', display:'flex',
            alignItems:'center', justifyContent:'center',
            fontFamily:T.font, flexShrink:0,
          }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{
            fontSize:16, fontWeight:800, color:'#fff',
            letterSpacing:'-0.2px',
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
          }}>
            A Philosophy of Software Design
          </div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.35)', marginTop:1 }}>
            {doneCount} / {totalCount} complete
          </div>
        </div>

        {/* XP pill (Brilliant has gems + streak in top right) */}
        <div style={{
          display:'flex', alignItems:'center', gap:6,
          background:'rgba(139,92,246,0.14)',
          border:'1px solid rgba(139,92,246,0.30)',
          borderRadius:9999, padding:'6px 12px',
          flexShrink:0,
        }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="#a78bfa"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          <span style={{ fontSize:13, fontWeight:800, color:'#a78bfa' }}>0</span>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div style={{ flex:1, overflowY:'auto' }}>
        {MOCK_SECTIONS.map((section, si) => (
          <div key={section.level} style={{ paddingBottom:32 }}>

            {/* Section header pill — Brilliant's bordered rounded-rect */}
            <div style={{
              margin: si === 0 ? '28px 24px 36px' : '12px 24px 36px',
              border:'1.5px solid rgba(139,92,246,0.50)',
              borderRadius:16,
              padding:'14px 20px',
              textAlign:'center',
              background:'rgba(109,40,217,0.06)',
              animation:`pathNodeIn 0.45s ${si * 0.12}s ease both`,
            }}>
              <div style={{
                fontSize:10, fontWeight:800,
                letterSpacing:'1.6px',
                color:'#a78bfa',
                textTransform:'uppercase',
                marginBottom:5,
              }}>
                Level {section.level}
              </div>
              <div style={{
                fontSize:18, fontWeight:800,
                color:'#fff',
                letterSpacing:'-0.2px',
              }}>
                {section.title}
              </div>
            </div>

            {/* Nodes */}
            <div style={{
              display:'flex', flexDirection:'column',
              gap:56,
              paddingLeft:0,
            }}>
              {section.nodes.map((node, ni) => (
                <BrilliantDiscNode
                  key={node.id}
                  node={node}
                  index={ni}
                  sectionIndex={si}
                  onTap={n => setSelected(n)}
                />
              ))}
            </div>
          </div>
        ))}

        <div style={{ height:120 }}/>
      </div>

      {/* ── Bottom sheet on node tap ── */}
      {selected && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setSelected(null)}
            style={{
              position:'absolute', inset:0, zIndex:20,
              background:'rgba(0,0,0,0.60)',
              backdropFilter:'blur(8px)',
              WebkitBackdropFilter:'blur(8px)',
            }}
          />
          {/* Card — matches Brilliant's popup */}
          <div style={{
            position:'absolute',
            bottom:0, left:0, right:0,
            zIndex:21,
            background:'#12121a',
            borderRadius:'24px 24px 0 0',
            border:'1px solid rgba(255,255,255,0.08)',
            borderBottom:'none',
            padding:'16px 24px 52px',
            animation:'sheetUp 0.28s cubic-bezier(0.34,1.2,0.64,1) both',
            boxShadow:'0 -32px 80px rgba(0,0,0,0.70)',
          }}>
            {/* Drag pill */}
            <div style={{
              width:40, height:4, borderRadius:9999,
              background:'rgba(255,255,255,0.14)',
              margin:'0 auto 24px',
            }}/>

            {/* The active disc mini preview */}
            <div style={{
              display:'flex', justifyContent:'center',
              marginBottom:20,
            }}>
              <div style={{
                width:80, height:46, borderRadius:'50%',
                background:'radial-gradient(ellipse at 42% 30%, #c4b5fd 0%, #7c3aed 48%, #3b0764 100%)',
                boxShadow:'0 0 32px rgba(139,92,246,0.55)',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </div>
            </div>

            {/* Title */}
            <div style={{
              fontSize:22, fontWeight:900,
              color:'#fff',
              textAlign:'center',
              letterSpacing:'-0.4px',
              lineHeight:1.2,
              marginBottom:28,
            }}>
              {selected.label}
            </div>

            {/* Start button — Brilliant's solid purple pill */}
            <button
              onClick={() => setSelected(null)}
              style={{
                width:'100%',
                padding:'18px',
                background:'#7c3aed',
                border:'none',
                borderRadius:14,
                color:'#fff',
                fontSize:17,
                fontWeight:800,
                cursor:'pointer',
                fontFamily:T.font,
                letterSpacing:'0.2px',
                boxShadow:'0 8px 32px rgba(109,40,217,0.50), inset 0 1px 0 rgba(255,255,255,0.18)',
                transition:'background 0.18s, transform 0.14s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background='#6d28d9'; e.currentTarget.style.transform='scale(1.015)' }}
              onMouseLeave={e => { e.currentTarget.style.background='#7c3aed'; e.currentTarget.style.transform='scale(1)' }}
            >
              Start
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Tomorrow preview ─────────────────────────────────────────────────────────
function TomorrowPreview({ tomorrowRow }) {
  if (!tomorrowRow) return null
  const name = tomorrowRow.covered_topics?.[0] || `Day ${tomorrowRow.day_number}`
  return (
    <div className="dashboard-tomorrow-preview" style={{maxWidth:600,margin:'0 auto',padding:'0 20px'}}>
      <div style={{
        background:T.surface, border:`1px solid ${T.border}`,
        borderRadius:14, padding:'12px 16px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
      }}>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:T.textMuted,
            textTransform:'uppercase',letterSpacing:'1px',marginBottom:2}}>
            Tomorrow unlocks
          </div>
          <div style={{fontSize:14,fontWeight:600,color:T.textSec}}>{name}</div>
        </div>
        <ArrowRight/>
      </div>
    </div>
  )
}

const DASHBOARD_NAV_ITEMS = [
  { key:'home',     label:'Today', icon:'rocket',        meta:'Mission hub' },
  { key:'path',     label:'Path',  icon:'map',           meta:'Curriculum' },
  { key:'settings', label:'More',  icon:'palette',       meta:'Themes & settings' },
]

function DashboardCommandMenu({ open, query, onQueryChange, actions, onClose }) {
  const inputRef = useRef(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const filteredActions = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return actions
    return actions.filter((action) => {
      const haystack = [
        action.label,
        action.meta,
        action.group,
        ...(action.keywords || []),
      ].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(needle)
    })
  }, [actions, query])

  const groupedActions = useMemo(() => {
    const groups = []
    filteredActions.forEach((action) => {
      let group = groups.find((entry) => entry.name === action.group)
      if (!group) {
        group = { name: action.group, items: [] }
        groups.push(group)
      }
      group.items.push(action)
    })
    return groups
  }, [filteredActions])

  useEffect(() => {
    if (!open) return
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(focusTimer)
  }, [open])

  if (!open) return null

  const boundedSelectedIndex = Math.min(selectedIndex, Math.max(0, filteredActions.length - 1))

  const runAction = (action) => {
    if (!action?.run) return
    action.run()
    onQueryChange('')
    onClose()
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelectedIndex((index) => Math.min(index + 1, Math.max(0, filteredActions.length - 1)))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelectedIndex((index) => Math.max(0, index - 1))
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      runAction(filteredActions[boundedSelectedIndex])
    }
  }

  let actionIndex = -1

  return (
    <div
      className="dashboard-command-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      role="presentation"
    >
      <div className="dashboard-command-panel" role="dialog" aria-modal="true" aria-label="Command center">
        <input
          ref={inputRef}
          className="dashboard-command-search"
          value={query}
          onChange={(event) => {
            setSelectedIndex(0)
            onQueryChange(event.target.value)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Find anything in PathAI"
          autoComplete="off"
          spellCheck={false}
        />
        <div className="dashboard-command-list">
          {filteredActions.length === 0 ? (
            <div className="dashboard-command-empty">No matching action.</div>
          ) : groupedActions.map((group) => (
            <div key={group.name} className="dashboard-command-group">
              <div className="dashboard-command-group-title">{group.name}</div>
              {group.items.map((action) => {
                actionIndex += 1
                const currentIndex = actionIndex
                const selected = currentIndex === boundedSelectedIndex
                return (
                  <button
                    key={action.id}
                    type="button"
                    className={`dashboard-command-item${selected ? ' is-selected' : ''}`}
                    onMouseEnter={() => setSelectedIndex(currentIndex)}
                    onClick={() => runAction(action)}
                  >
                    <span className="dashboard-command-icon">
                      <IconGlyph name={action.icon || 'sparkles'} size={17} strokeWidth={2.3} color={action.accent || T.teal}/>
                    </span>
                    <span style={{minWidth:0,flex:1}}>
                      <span style={{display:'block',fontSize:14,fontWeight:850,color:T.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                        {action.label}
                      </span>
                      {action.meta && <span className="dashboard-command-meta">{action.meta}</span>}
                    </span>
                    {action.pill && <span className="dashboard-command-pill">{action.pill}</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DashboardDesktopNav({ activeTab, onSelect, onOpenCommand, goalText, dayNumber, focusProgress }) {
  return (
    <aside className="dashboard-left-rail" aria-label="Dashboard navigation">
      <div className="dashboard-rail-card" style={{padding:16}}>
        <div style={{display:'flex',alignItems:'center',gap:11,marginBottom:14}}>
          <PathBoltLogo size={34}/>
          <div style={{minWidth:0}}>
            <div className="dashboard-rail-kicker">PathAI</div>
            <div style={{
              fontSize:15,fontWeight:900,color:T.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',
            }}>
              {goalText}
            </div>
          </div>
        </div>
        <div style={{
          borderRadius:16,
          border:`1px solid ${T.borderAlt}`,
          background:'rgba(255,255,255,0.035)',
          padding:12,
          display:'flex',
          alignItems:'center',
          justifyContent:'space-between',
          gap:12,
        }}>
          <div>
            <div className="dashboard-rail-kicker">Today</div>
            <div style={{fontSize:18,fontWeight:900,color:T.text,marginTop:3}}>Day {dayNumber}</div>
          </div>
          <MiniProgressRing
            size={44}
            value={focusProgress.completed}
            total={Math.max(focusProgress.total, 1)}
            stroke="var(--theme-primary)"
            track="rgba(255,255,255,0.08)"
            label={`${Math.round(focusProgress.ratio * 100)}%`}
            labelColor={focusProgress.ratio >= 1 ? T.teal : T.textSec}
            textSize={10}
          />
        </div>
      </div>

      <div className="dashboard-rail-card dashboard-rail-nav">
        {DASHBOARD_NAV_ITEMS.map((item) => {
          const active = activeTab === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              className={`dashboard-rail-nav-button${active ? ' is-active' : ''}`}
            >
              <IconGlyph name={item.icon} size={18} strokeWidth={2.35} color={active ? T.teal : T.textMuted}/>
              <span style={{minWidth:0}}>
                <span style={{display:'block',fontSize:14,fontWeight:850,color:'currentColor'}}>{item.label}</span>
                <span style={{display:'block',fontSize:11,color:active ? T.teal : T.textMuted,marginTop:1}}>{item.meta}</span>
              </span>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={onOpenCommand}
        className="dashboard-rail-card interactive-secondary"
        style={{
          width:'100%',
          minHeight:58,
          borderRadius:18,
          cursor:'pointer',
          color:T.textSec,
          fontFamily:T.font,
          padding:'0 14px',
          display:'flex',
          alignItems:'center',
          gap:10,
          textAlign:'left',
        }}
      >
        <IconGlyph name="compass" size={18} strokeWidth={2.35} color={T.teal}/>
        <span>
          <span style={{display:'block',fontSize:13,fontWeight:900,color:T.text}}>Command center</span>
          <span style={{display:'block',fontSize:11,color:T.textMuted,marginTop:2}}>Jump, search, act</span>
        </span>
      </button>
    </aside>
  )
}

// ─── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background:T.surface, border:`2px solid ${color ? `${color}44` : T.border}`,
      borderRadius:18, padding:'16px',
      boxShadow:`inset 0 1px 0 rgba(255,255,255,0.06), 0 5px 0 0 ${color ? `${color}33` : 'rgba(2,10,20,0.5)'}`,
    }}>
      <div style={{fontSize:11,fontWeight:800,color:T.textMuted,
        textTransform:'uppercase',letterSpacing:'1px',marginBottom:6}}>{label}</div>
      <div className="font-display" style={{fontSize:26,fontWeight:800,color:color||T.text,
        letterSpacing:'-0.02em',lineHeight:1,marginBottom:sub?4:0}}>{value}</div>
      {sub && <div style={{fontSize:11,color:T.textMuted}}>{sub}</div>}
    </div>
  )
}

function DashboardStatRow({ xpDisplay, streakData, gems, tasks }) {
  const safeTasks = Array.isArray(tasks) ? tasks : []
  const totalTasks = safeTasks.length
  const doneTasks = safeTasks.filter((task) => task.completed).length
  const stats = [
    {
      key: 'level',
      label: 'Level',
      value: xpDisplay?.level ?? 1,
      sub: xpDisplay?.title || 'Keep climbing',
      icon: 'crown',
      tone: 'cyan',
      color: T.teal,
    },
    {
      key: 'xp',
      label: 'XP',
      value: (xpDisplay?.totalXp ?? 0).toLocaleString(),
      sub: `${(xpDisplay?.xpInLevel ?? 0).toLocaleString()} this level`,
      icon: 'bolt',
      tone: 'gold',
      color: T.amber,
    },
    {
      key: 'streak',
      label: 'Streak',
      value: streakData?.current ?? 0,
      sub: 'day fire',
      icon: 'flame',
      tone: 'coral',
      color: T.flame,
    },
    {
      key: 'gems',
      label: 'Gems',
      value: gems,
      sub: totalTasks > 0 ? `${doneTasks}/${totalTasks} tasks today` : 'ready to earn',
      icon: 'gem',
      tone: 'mint',
      color: T.teal,
    },
  ]

  return (
    <section className="dashboard-stat-grid" aria-label="Today overview">
      {stats.map((stat) => (
        <div key={stat.key} className={`dashboard-stat-card tone-${stat.tone}`}>
          <div className="dashboard-stat-icon">
            <IconGlyph name={stat.icon} size={18} strokeWidth={2.45} color={stat.color} />
          </div>
          <div className="dashboard-stat-label">{stat.label}</div>
          <div className="dashboard-stat-value" style={{ color: stat.color }}>{stat.value}</div>
          <div className="dashboard-stat-sub">{stat.sub}</div>
        </div>
      ))}
    </section>
  )
}

function countCompletedTasks(tasks) {
  const safeTasks = Array.isArray(tasks) ? tasks : []
  return safeTasks.filter((task) => task.completed).length
}

function deriveTaskRowStatus(tasks, fallback = 'not_started') {
  const safeTasks = Array.isArray(tasks) ? tasks : []
  const completedCount = countCompletedTasks(safeTasks)
  if (safeTasks.length > 0 && completedCount === safeTasks.length) return 'completed'
  if (completedCount > 0) return 'in_progress'
  return fallback
}

function applyCompletedTaskFloor(rows, completionFloor) {
  if (!Array.isArray(rows) || !completionFloor?.size) return Array.isArray(rows) ? rows : []

  return rows.map((row) => {
    const completedIds = completionFloor.get(row.id)
    const rowTasks = Array.isArray(row.tasks) ? row.tasks : []
    if (!completedIds?.size || rowTasks.length === 0) return row

    let changed = false
    const nextTasks = rowTasks.map((task) => {
      if (!completedIds.has(String(task.id)) || task.completed) return task
      changed = true
      return { ...task, completed: true }
    })

    if (!changed) return row

    const tasksCompleted = countCompletedTasks(nextTasks)
    return {
      ...row,
      tasks: nextTasks,
      tasks_completed: Math.max(Number(row.tasks_completed) || 0, tasksCompleted),
      completion_status: deriveTaskRowStatus(nextTasks, row.completion_status || 'not_started'),
    }
  })
}

function mergeRowsByDayNumber(existingRows, incomingRows) {
  const byDayNumber = new Map()
  normalizeTaskRows(existingRows).forEach((row) => {
    byDayNumber.set(Number(row.day_number), row)
  })
  normalizeTaskRows(incomingRows).forEach((row) => {
    byDayNumber.set(Number(row.day_number), row)
  })
  return [...byDayNumber.values()].sort((a, b) => (Number(a.day_number) || 0) - (Number(b.day_number) || 0))
}

function normalizeTaskList(tasks) {
  return normalizeLearningTasks(Array.isArray(tasks) ? tasks : [])
}

const TEMPORARILY_DISABLE_TASK_SEQUENCE_LOCKS = true
const TEMPORARILY_ENABLE_DEV_COMPLETE_BUTTON = true

function getTaskLockState(task, taskList = []) {
  if (TEMPORARILY_DISABLE_TASK_SEQUENCE_LOCKS) return { locked: false, reason: '' }

  const normalizedTasks = normalizeTaskList(taskList)
  const firstIncompleteIndex = normalizedTasks.findIndex((entry) => !entry.completed)
  if (firstIncompleteIndex === -1) return { locked: false, reason: '' }

  const currentIndex = normalizedTasks.findIndex((entry) => String(entry.id) === String(task?.id))
  if (currentIndex === -1) return { locked: false, reason: '' }
  if (normalizedTasks[currentIndex]?.completed || currentIndex <= firstIncompleteIndex) {
    return { locked: false, reason: '' }
  }

  return {
    locked: true,
    reason: `Complete "${normalizedTasks[firstIncompleteIndex]?.title || 'the previous task'}" first.`,
  }
}

function annotateTaskLocks(taskList = []) {
  const normalizedTasks = normalizeTaskList(taskList)
  return normalizedTasks.map((task) => {
    const lockState = getTaskLockState(task, normalizedTasks)
    return {
      ...task,
      _locked: lockState.locked,
      _lockedReason: lockState.reason,
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard component
// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter()

  // Server-derived
  const [loading,     setLoading]     = useState(true)
  const [goal,        setGoal]        = useState(null)
  const [todayRow,    setTodayRow]    = useState(null)
  const [tomorrowRow, setTomorrowRow] = useState(null)
  const [allRows,     setAllRows]     = useState([])
  const [conceptMasteryRows, setConceptMasteryRows] = useState([])
  const [user,        setUser]        = useState(null)

  // Optimistic task state
  const [tasks,       setTasks]       = useState([])
  const [completing,  setCompleting]  = useState(null)
  const [rerollingTaskId, setRerollingTaskId] = useState(null)

  // Gamification
  const [xpDisplay,   setXpDisplay]   = useState(getLevelProgress(0))
  const [xpAnimating, setXpAnimating] = useState(false)
  const [streakData,  setStreakData]  = useState({ current: 0, longest: 0 })
  const [xpToasts,    setXpToasts]   = useState([])
  const [levelUpData, setLevelUpData] = useState(null)
  const [missionDone, setMissionDone] = useState(false)
  const [showMissionConfetti, setShowMissionConfetti] = useState(false)
  const [showNextDayCTA, setShowNextDayCTA] = useState(false)
  const [advancingNextDay, setAdvancingNextDay] = useState(false)
  const [courseCompleteData, setCourseCompleteData] = useState(null)

  // UI
  const [activeTab,   setActiveTab]   = useState('home')
  const [expandedPathModules, setExpandedPathModules] = useState({})
  const [expandedPathUnits,   setExpandedPathUnits]   = useState({})
  const [ownedThemes, setOwnedThemes] = useState([])
  const [activeTheme, setActiveTheme] = useState('default')
  const [inventoryCounts, setInventoryCounts] = useState({ taskReroll: 0, reviewShield: 0 })
  const [claimedModuleRewardIds, setClaimedModuleRewardIds] = useState([])
  const [moduleRewardToasts, setModuleRewardToasts] = useState([])
  const [showLesson,       setShowLesson]       = useState(null)
  const [todayMission, setTodayMission] = useState(null)
  const [missionFlowLoading, setMissionFlowLoading] = useState(false)
  const [missionFlowLegacyFallback, setMissionFlowLegacyFallback] = useState(false)
  const [learningStatus, setLearningStatus] = useState(null)
  const [learningStatusLoading, setLearningStatusLoading] = useState(false)
  const [learningStatusRefreshKey, setLearningStatusRefreshKey] = useState(0)
  const [previewTask, setPreviewTask] = useState(null)
  const [practiceRoundTask, setPracticeRoundTask] = useState(null) // task awaiting PracticeRound
  const [commandOpen, setCommandOpen] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')
  const [error,       setError]       = useState('')

  // Goals sidebar
  const [showGoalsSidebar, setShowGoalsSidebar] = useState(false)
  const [allGoals,         setAllGoals]         = useState([])
  const [switchingGoal,    setSwitchingGoal]    = useState(null)

  // Hearts
  const [maxHearts,        setMaxHearts]        = useState(5)
  const [heartsRemaining,  setHeartsRemaining]  = useState(5)
  const [heartsRefillAt,   setHeartsRefillAt]   = useState(null)
  const [prevHearts,       setPrevHearts]       = useState(5)
  const [showNoHearts,     setShowNoHearts]     = useState(false)

  // Gems
  const [gems,             setGems]             = useState(0)
  const [gemPulse,         setGemPulse]         = useState(false)
  const [gemToasts,        setGemToasts]        = useState([])
  // XP Boost
  const [xpBoostUntil,     setXpBoostUntil]     = useState(null)
  const [boostTimeLeft,    setBoostTimeLeft]    = useState(0)

  // Treasure Chest
  const [chestReward,      setChestReward]      = useState(null)

  // Plan meta
  const [totalDaysPlanned,  setTotalDaysPlanned]  = useState(0)
  const [generatingNext,    setGeneratingNext]    = useState(false)

  // Streak freeze
  const [freezeCount,    setFreezeCount]    = useState(0)
  const [freezing,       setFreezing]       = useState(false)
  const [freezeToast,    setFreezeToast]    = useState(false)
  const [isComeback,     setIsComeback]     = useState(false)

  // Background quest reward plumbing
  const [quests,         setQuests]         = useState([])
  const [questMasterToast, setQuestMasterToast] = useState(false)
  const [badgeToasts, setBadgeToasts] = useState([]) // newly earned badges to show
  useEffect(() => {
    if (badgeToasts.length === 0) return
    const t = setTimeout(() => setBadgeToasts([]), 5000)
    return () => clearTimeout(t)
  }, [badgeToasts])

  // Reward Calendar
  const [rewardCalendar, setRewardCalendar] = useState({ week_start: null, days_claimed: [] })
  const [claimingReward, setClaimingReward] = useState(false)

  // Weekly Challenge
  const [weeklyChallenge, setWeeklyChallenge] = useState(null)
  const [challengeDaysLeft, setChallengeDaysLeft] = useState(0)

  // XP Boost Event
  const [showBoostEvent,   setShowBoostEvent]   = useState(false)

  // Mastery Decay
  const [decayingConcepts, setDecayingConcepts] = useState([])

  // Earned badges
  const [earnedBadgeIds, setEarnedBadgeIds] = useState(new Set())

  // Path View overlay (new UI experiment)
  const [showPathView, setShowPathView] = useState(false)

  const missionConfettiTimerRef = useRef(null)
  const taskReloadTimerRef = useRef(null)
  const holdCompletedDayRef = useRef(false)
  const currentDayRowIdRef = useRef(null)
  const completedTaskIdsByRowRef = useRef(new Map())
  const missionCompletionPromiseRef = useRef(Promise.resolve(true))
  const missionCompletionResolverRef = useRef(null)
  const loadIdRef = useRef(0)  // monotonic counter — stale loads bail out
  const boostCheckedRef = useRef(false)
  const pendingTimersRef = useRef([])
  const isMountedRef = useRef(true)
  const claimingModuleRewardRef = useRef(new Set())
  const outlineRecoveryAttemptedRef = useRef(new Set())
  const tabScrollPositionsRef = useRef({
    home: 0,
    badges: 0,
    shop: 0,
    stats: 0,
    path: 0,
    settings: 0,
  })

  useEffect(() => {
    const handleCommandShortcut = (event) => {
      const key = event.key?.toLowerCase()
      if ((event.metaKey || event.ctrlKey) && key === 'k') {
        event.preventDefault()
        setCommandOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', handleCommandShortcut)
    return () => window.removeEventListener('keydown', handleCommandShortcut)
  }, [])

  const themeVars = useMemo(() => getDashboardThemeVars(activeTheme), [activeTheme])
  const pageThemeStyle = useMemo(() => ({
    ...themeVars,
    background: 'radial-gradient(circle at top, var(--theme-page-glow), transparent 34%), radial-gradient(circle at 82% 10%, var(--theme-primary-dim), transparent 24%), var(--theme-bg)',
  }), [themeVars])
  const showDeveloperShortcuts = process.env.NEXT_PUBLIC_PATHAI_SHOW_DEV_SHORTCUTS === 'true'
  const goalKnowledge = useMemo(() => (
    Array.isArray(goal?.constraints) ? goal.constraints.join(', ') : (goal?.constraints || '')
  ), [goal?.constraints])
  const activeDomain = useMemo(() => resolveGoalDomain(goal), [goal])
  const activeDomainConfig = useMemo(() => (
    goal?.domain_config || goal?.domainConfig || buildDomainConfig(activeDomain)
  ), [activeDomain, goal?.domain_config, goal?.domainConfig])
  const domainGameText = useMemo(() => getDomainGamification(activeDomain), [activeDomain])

  useEffect(() => {
    setStoredLearningDomain(activeDomain)
  }, [activeDomain])

  useEffect(() => {
    const p5Eligible = Boolean(
      goal?.id
      && goal?.topic_graph_id
      && goal?.mission_flow_version === 'p5'
      && user?.id
      && !isLocalAccessUser(user)
    )
    if (!p5Eligible) {
      setTodayMission(null)
      setMissionFlowLoading(false)
      setMissionFlowLegacyFallback(true)
      return undefined
    }

    let cancelled = false
    async function loadTodayMission() {
      setMissionFlowLoading(true)
      setMissionFlowLegacyFallback(false)
      try {
        const { session } = await getSafeSupabaseSession()
        const token = session?.access_token || null
        const res = await fetch(`/api/missions/today?goal_id=${encodeURIComponent(goal.id)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (res.ok && data?.mission && !data?.legacy) {
          setTodayMission(data.mission)
          setMissionFlowLegacyFallback(false)
        } else {
          setTodayMission(null)
          setMissionFlowLegacyFallback(true)
        }
        if (!res.ok) {
          setError(data?.error || 'Could not load today\'s mission.')
          setMissionFlowLegacyFallback(true)
        }
      } catch {
        if (!cancelled) {
          setError('Could not load today\'s mission.')
          setMissionFlowLegacyFallback(true)
        }
      } finally {
        if (!cancelled) setMissionFlowLoading(false)
      }
    }

    loadTodayMission()
    return () => {
      cancelled = true
    }
  }, [goal?.id, goal?.mission_flow_version, goal?.topic_graph_id, user])

  useEffect(() => {
    const canLoadStatus = Boolean(goal?.id && user?.id && !isLocalAccessUser(user))
    if (!canLoadStatus) {
      setLearningStatus(null)
      setLearningStatusLoading(false)
      return undefined
    }

    let cancelled = false
    async function loadLearningStatus() {
      setLearningStatusLoading(true)
      try {
        const { session } = await getSafeSupabaseSession()
        const token = session?.access_token || null
        const res = await fetch(`/api/learning-status?goal_id=${encodeURIComponent(goal.id)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (res.ok) {
          setLearningStatus(data)
        } else {
          setLearningStatus(null)
        }
      } catch {
        if (!cancelled) setLearningStatus(null)
      } finally {
        if (!cancelled) setLearningStatusLoading(false)
      }
    }

    loadLearningStatus()
    return () => {
      cancelled = true
    }
  }, [goal?.id, user, learningStatusRefreshKey])

  const pathTracker = useMemo(() => buildPathOutlineTracker({
    courseOutline: goal?.course_outline,
    rows: allRows,
    todayRowId: todayRow?.id || null,
    goalText: goal?.goal_text || '',
    claimedModuleRewardIds,
  }), [goal?.course_outline, goal?.goal_text, allRows, todayRow?.id, claimedModuleRewardIds])

  const applyTheme = useCallback((themeId) => {
    const nextTheme = APP_THEMES[themeId] ? themeId : 'default'
    setActiveTheme(nextTheme)
    setStoredActiveTheme(nextTheme)
  }, [])

  const togglePathModule = useCallback((moduleId) => {
    setExpandedPathModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }))
  }, [])

  const togglePathUnit = useCallback((unitId) => {
    setExpandedPathUnits((prev) => ({ ...prev, [unitId]: !prev[unitId] }))
  }, [])

  const resolveMissionCompletion = useCallback((didPersist = true) => {
    if (missionCompletionResolverRef.current) {
      missionCompletionResolverRef.current(didPersist)
      missionCompletionResolverRef.current = null
    }
    missionCompletionPromiseRef.current = Promise.resolve(didPersist)
  }, [])

  const activateDayRow = useCallback((nextRow, rowPool = allRows) => {
    if (!nextRow) return
    const normalizedRows = Array.isArray(rowPool) ? rowPool : []
    const rowIndex = normalizedRows.findIndex((row) => (
      row.id === nextRow.id || Number(row.day_number) === Number(nextRow.day_number)
    ))
    const followingRow = rowIndex >= 0 ? normalizedRows[rowIndex + 1] || null : null

    holdCompletedDayRef.current = false
    currentDayRowIdRef.current = nextRow.id || null
    const normalizedNextTasks = normalizeTaskList(nextRow.tasks)
    const normalizedNextRow = { ...nextRow, tasks: normalizedNextTasks }
    setTodayRow(normalizedNextRow)
    setTasks(normalizedNextTasks)
    setMissionDone(normalizedNextRow.completion_status === 'completed')
    setTomorrowRow(followingRow)
    setShowMissionConfetti(false)
  }, [allRows])

  // ─── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async (silent = false, options = {}) => {
    const thisLoadId = ++loadIdRef.current  // claim a load slot
    const preserveGemFloor = Number.isFinite(options?.preserveGemFloor) ? Number(options.preserveGemFloor) : null
    const preferredRowId = options?.preferredRowId || null
    const preferredDayNumber = Number.isFinite(options?.preferredDayNumber) ? Number(options.preferredDayNumber) : null
    if (!silent) setLoading(true)
    setError('')
    try {

    const { user: me } = await getSafeSupabaseUser()
    if (!me) { router.push('/login'); return }

    if (isLocalAccessUser(me)) {
      const localBundle = await getLocalGoalBundleWithRepairs(me.id)
      setUser(me)

      if (!localBundle?.goal) {
        setGoal(null)
        setTodayMission(null)
        setAllGoals([])
        setAllRows([])
        setConceptMasteryRows([])
        setTodayRow(null)
        setTomorrowRow(null)
        setTasks([])
        setLoading(false)
        return null
      }

      const localGoal = hydrateGoalCourseOutline(localBundle.goal)
      const localProgress = localBundle.progress || {}
      const localTransactions = Array.isArray(localBundle.gemTransactions) ? localBundle.gemTransactions : []
      const localClaimedModuleRewardIds = getClaimedModuleRewardIds(localTransactions)
      const localSourceRows = normalizeTaskRows(filterRowsForCourseWindow(
        localBundle.rows || [],
        Number(localProgress.total_days) || Number(localGoal.total_days) || 0,
      ))
      const localTaskRows = applyCompletedTaskFloor(localSourceRows, completedTaskIdsByRowRef.current)
      const nextCompletionFloor = new Map(completedTaskIdsByRowRef.current)
      localTaskRows.forEach((row) => {
        const completedIds = (Array.isArray(row.tasks) ? row.tasks : [])
          .filter((task) => task.completed)
          .map((task) => String(task.id))
        if (completedIds.length === 0) return
        nextCompletionFloor.set(row.id, new Set([...(nextCompletionFloor.get(row.id) || []), ...completedIds]))
      })
      completedTaskIdsByRowRef.current = nextCompletionFloor

      const localTracker = buildPathOutlineTracker({
        courseOutline: localGoal?.course_outline,
        rows: localTaskRows,
        goalText: localGoal?.goal_text || '',
        claimedModuleRewardIds: localClaimedModuleRewardIds,
      })

      const heldCompletedDay = holdCompletedDayRef.current && currentDayRowIdRef.current
        ? localTaskRows.find((row) => row.id === currentDayRowIdRef.current) || null
        : null
      const shouldPreserveCompletedDay = heldCompletedDay?.completion_status === 'completed'
      const preferredRow = !shouldPreserveCompletedDay
        ? (preferredRowId
            ? localTaskRows.find((row) => row.id === preferredRowId) || null
            : preferredDayNumber != null
            ? localTaskRows.find((row) => Number(row.day_number) === preferredDayNumber) || null
            : null)
        : null
      const localToday = shouldPreserveCompletedDay
        ? heldCompletedDay
        : preferredRow
          || localTracker.currentGeneratedRow
          || localTracker.lastCompletedRow
          || localTaskRows.find((row) => row.completion_status !== 'completed')
          || localTaskRows[localTaskRows.length - 1]
          || null
      if (!shouldPreserveCompletedDay) holdCompletedDayRef.current = false

      const localTodayTasks = normalizeTaskList(localToday?.tasks)
      const localTodayRow = localToday ? { ...localToday, tasks: localTodayTasks } : null
      const localTodayIndex = localTaskRows.findIndex((row) => row.id === localToday?.id)
      const localTomorrow = shouldPreserveCompletedDay
        ? localTracker.currentGeneratedRow || null
        : localToday?.id === localTracker.currentGeneratedRow?.id
          ? localTracker.nextGeneratedRow || null
          : localTodayIndex >= 0
            ? localTaskRows[localTodayIndex + 1] || null
            : null
      const localInventoryCounts = buildInventoryCountsFromTransactions(localTransactions)
      const localOwnedThemes = Array.from(new Set([
        ...getStoredOwnedThemes(),
        ...localTransactions
          .map((row) => THEME_REASON_TO_ID[String(row?.reason || '')])
          .filter(Boolean),
      ]))
      const localRewardCalendar = localProgress.reward_calendar?.week_start === getWeekStartStr()
        ? localProgress.reward_calendar
        : { week_start: getWeekStartStr(), days_claimed: [] }
      let localGems = Number(localProgress.gems) || 0
      if (preserveGemFloor != null) localGems = Math.max(localGems, preserveGemFloor)
      const resolvedMaxHearts = Math.min(
        HEARTS_MAX_CAP,
        Math.max(getStoredMaxHearts(), HEARTS_BASE, Number(localProgress.hearts_remaining) || HEARTS_BASE),
      )
      const localCourseSpan = Math.max(
        Number(localProgress.total_days) || 0,
        Number(localGoal.total_days) || 0,
        Number(localTracker.plannedDayCount) || 0,
      )
      const localDomain = resolveGoalDomain(localGoal)

      setGoal(localGoal)
      setAllGoals([localGoal])
      setAllRows(localTaskRows)
      setConceptMasteryRows(Array.isArray(localBundle.conceptMastery) ? localBundle.conceptMastery : [])
      setTodayRow(localTodayRow)
      setTomorrowRow(localTomorrow)
      setTasks(localTodayTasks)
      setMissionDone(localToday?.completion_status === 'completed')
      const localDayDone = localToday?.completion_status === 'completed'
      const localIsCompletedFinalExamDay = localTodayTasks.some(isCourseFinalExamTask)
      if (localDayDone && !localIsCompletedFinalExamDay && !localTracker.courseCompleted) {
        setShowNextDayCTA(true)
      } else {
        setShowNextDayCTA(false)
      }
      setShowMissionConfetti(false)
      setXpDisplay(getLevelProgress(Number(localProgress.total_xp) || 0))
      setStreakData({
        current: Number(localProgress.current_streak) || 0,
        longest: Number(localProgress.longest_streak) || 0,
      })
      setFreezeCount(Number(localProgress.freeze_count) || 0)
      setHeartsRemaining(Number(localProgress.hearts_remaining) || HEARTS_BASE)
      setPrevHearts(Number(localProgress.hearts_remaining) || HEARTS_BASE)
      setHeartsRefillAt(localProgress.hearts_refill_at || null)
      setGems(localGems)
      setTotalDaysPlanned(localCourseSpan || localTaskRows.length || 1)
      setRewardCalendar(localRewardCalendar)
      setQuests(
        Array.isArray(localToday?.quests) && localToday.quests.length > 0
          ? localToday.quests
            : localToday
              ? generateDailyQuests(localToday.day_number || 1, localTodayTasks.length || 3, localDomain)
              : [],
      )
      setStoredOwnedThemes(localOwnedThemes)
      setOwnedThemes(localOwnedThemes)
      setActiveTheme(getStoredActiveTheme(localOwnedThemes))
      setInventoryCounts(localInventoryCounts)
      setClaimedModuleRewardIds(localClaimedModuleRewardIds)
      setEarnedBadgeIds(new Set(localBundle.achievements || []))
      setWeeklyChallenge(null)
      setChallengeDaysLeft(0)
      setDecayingConcepts([])
      setStoredMaxHearts(resolvedMaxHearts)
      setMaxHearts(resolvedMaxHearts)
      setLoading(false)
      return {
        today: localTodayRow,
        tomorrow: localTomorrow,
        rows: localTaskRows,
        goal: localGoal,
      }
    }

    setUser(me)

    const { data: activeGoal, error: ge } = await supabaseData
      .from('goals').select('*').eq('user_id', me.id).eq('status', 'active')
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (ge) { setError(ge.message); setLoading(false); return }
    if (!activeGoal) { setConceptMasteryRows([]); setTodayMission(null); setLoading(false); return }
    const hydratedGoal = hydrateGoalCourseOutline(activeGoal)
    const hydratedDomain = resolveGoalDomain(hydratedGoal)
    setGoal(hydratedGoal)

    // Load all goals for sidebar
    const { data: goalsList } = await supabaseData
      .from('goals').select('id,goal_text,status,created_at,mode')
      .eq('user_id', me.id).order('created_at', { ascending: false })
    setAllGoals(goalsList || [])

    const [{ data: rows, error: re }, { data: prog, error: progError }, { data: masteryRows }] = await Promise.all([
      supabaseData
        .from('daily_tasks').select('*')
        .eq('goal_id', hydratedGoal.id).eq('user_id', me.id)
        .order('day_number', { ascending: true }),
      supabaseData
        .from('user_progress').select('total_xp,current_streak,longest_streak,freeze_count,hearts_remaining,hearts_refill_at,total_days,gems,xp_boost_until')
        .eq('goal_id', hydratedGoal.id).eq('user_id', me.id).maybeSingle(),
      supabaseData
        .from('concept_mastery').select('concept_id,mastery_score,last_review,review_interval')
        .eq('goal_id', hydratedGoal.id).eq('user_id', me.id)
        .order('mastery_score', { ascending: false }),
    ])
    if (re) { setError(re.message); setLoading(false); return }

    // If a newer load() was started while we were awaiting, bail out — it will handle state
    if (thisLoadId !== loadIdRef.current) { setLoading(false); return }

    let sourceRows = rows || []
    const scopedRowsForRepair = normalizeTaskRows(filterRowsForCourseWindow(sourceRows, Number(prog?.total_days) || 0))
    const repairTracker = buildPathOutlineTracker({
      courseOutline: hydratedGoal?.course_outline,
      rows: scopedRowsForRepair,
      goalText: hydratedGoal?.goal_text || '',
      claimedModuleRewardIds: getClaimedModuleRewardIds([]),
    })
    const repairSequenceByDay = new Map(
      (Array.isArray(repairTracker.sequenceItems) ? repairTracker.sequenceItems : [])
        .map((item) => [Number(item?.dayNumber), item]),
    )
    const rowsNeedingRepair = scopedRowsForRepair.filter((row) => (
      isBrokenTaskRow(row)
      || needsSequenceDayRepair(row, repairSequenceByDay.get(Number(row.day_number)))
    ))

    if (hydratedGoal.mode !== 'explore' && rowsNeedingRepair.length > 0) {
      try {
        const { session } = await getSafeSupabaseSession()
        const repairRes = await fetch('/api/repair-days', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({
            goalId: hydratedGoal.id,
            userId: me.id,
            rowIds: rowsNeedingRepair.map((row) => row.id),
            accessToken: session?.access_token || null,
          }),
        })

        if (repairRes.ok) {
          const repairData = await repairRes.json()
          if (Array.isArray(repairData?.rows) && repairData.rows.length > 0) {
            sourceRows = mergeRowsByDayNumber(sourceRows, repairData.rows)
          }
        } else {
          const repairError = await repairRes.json().catch(() => ({}))
          console.warn('[PathAI] repair_days_failed', repairError?.error || 'unknown_error')
        }
      } catch (repairError) {
        console.warn('[PathAI] repair_days_failed', repairError?.message || 'unknown_error')
      }
    }

    if (thisLoadId !== loadIdRef.current) { setLoading(false); return }

    const scopedSourceRows = normalizeTaskRows(filterRowsForCourseWindow(sourceRows, Number(prog?.total_days) || 0))
    const taskRows = applyCompletedTaskFloor(scopedSourceRows, completedTaskIdsByRowRef.current)
    const nextCompletionFloor = new Map(completedTaskIdsByRowRef.current)
    taskRows.forEach((row) => {
      const completedIds = (Array.isArray(row.tasks) ? row.tasks : [])
        .filter((task) => task.completed)
        .map((task) => String(task.id))
      if (completedIds.length === 0) return
      const mergedIds = new Set([...(nextCompletionFloor.get(row.id) || []), ...completedIds])
      nextCompletionFloor.set(row.id, mergedIds)
    })
    completedTaskIdsByRowRef.current = nextCompletionFloor
    setAllRows(taskRows)
    setConceptMasteryRows(Array.isArray(masteryRows) ? masteryRows : [])

    const trackerSnapshot = buildPathOutlineTracker({
      courseOutline: hydratedGoal?.course_outline,
      rows: taskRows,
      goalText: hydratedGoal?.goal_text || '',
      claimedModuleRewardIds: [],
    })
    const expectedGoalDayCount = Math.max(
      Number(prog?.total_days) || 0,
      Number(hydratedGoal?.total_days) || 0,
      Number(trackerSnapshot.plannedDayCount) || 0,
    )
    const trackerUnderestimatesCourse = expectedGoalDayCount > (Number(trackerSnapshot.plannedDayCount) || 0)

    const heldCompletedDay = holdCompletedDayRef.current && currentDayRowIdRef.current
      ? taskRows.find(r => r.id === currentDayRowIdRef.current) || null
      : null
    const shouldPreserveCompletedDay = heldCompletedDay?.completion_status === 'completed'
    const preferredRow = !shouldPreserveCompletedDay
      ? (preferredRowId
          ? taskRows.find((row) => row.id === preferredRowId) || null
          : preferredDayNumber != null
          ? taskRows.find((row) => Number(row.day_number) === preferredDayNumber) || null
          : null)
      : null
    const today = shouldPreserveCompletedDay
      ? heldCompletedDay
      : preferredRow
      || trackerSnapshot.currentGeneratedRow
      || trackerSnapshot.lastCompletedRow
      || taskRows.find(r => r.completion_status !== 'completed')
      || taskRows[taskRows.length-1]
    if (!shouldPreserveCompletedDay) holdCompletedDayRef.current = false
    if (today) {
      const dayTasks = normalizeTaskList(today.tasks)
      const normalizedToday = { ...today, tasks: dayTasks }
      setTodayRow(normalizedToday)
      // Use functional updater so we never uncomplete a task that's already completed in UI
      setTasks(prevTasks => {
        if (!prevTasks.length) return dayTasks
        const prevCompletedIds = new Set(prevTasks.filter(t => t.completed).map(t => String(t.id)))
        if (prevCompletedIds.size === 0) return dayTasks
        let patched = false
        const merged = dayTasks.map(t => {
          if (!t.completed && prevCompletedIds.has(String(t.id))) { patched = true; return { ...t, completed: true } }
          return t
        })
        return patched ? normalizeTaskList(merged) : dayTasks
      })
      const dayDone = today.completion_status === 'completed'
      const isCompletedFinalExamDay = dayTasks.some(isCourseFinalExamTask)
      setMissionDone(dayDone)
      // If day is already complete on load, show the Next Day button inline
      if (dayDone && !isCompletedFinalExamDay && (!trackerSnapshot.courseCompleted || trackerUnderestimatesCourse)) {
        setShowNextDayCTA(true)
      }
      else if (isCompletedFinalExamDay) setShowNextDayCTA(false)
    } else setTodayRow(null)

    const todayIdx   = taskRows.findIndex(r => r.id === today?.id)
    const tomorrowR  = shouldPreserveCompletedDay
      ? trackerSnapshot.currentGeneratedRow || null
      : today?.id === trackerSnapshot.currentGeneratedRow?.id
        ? trackerSnapshot.nextGeneratedRow || null
        : todayIdx >= 0
          ? taskRows[todayIdx+1] || null
          : null
    setTomorrowRow(tomorrowR)

    try {
      const { data: themePurchaseData } = await supabaseData
        .from('gem_transactions')
        .select('reason')
        .eq('user_id', me.id)
        .in('reason', THEME_TRANSACTION_REASONS)

      const serverOwnedThemes = Array.from(new Set(
        (themePurchaseData || [])
          .map((row) => THEME_REASON_TO_ID[row.reason])
          .filter(Boolean),
      ))
      const mergedOwnedThemes = Array.from(new Set([...getStoredOwnedThemes(), ...serverOwnedThemes]))
      setStoredOwnedThemes(mergedOwnedThemes)
      setOwnedThemes(mergedOwnedThemes)
      setActiveTheme((currentTheme) => (
        currentTheme === 'default' || mergedOwnedThemes.includes(currentTheme)
          ? currentTheme
          : getStoredActiveTheme(mergedOwnedThemes)
      ))
    } catch {
      const localOwnedThemes = getStoredOwnedThemes()
      setOwnedThemes(localOwnedThemes)
      setActiveTheme((currentTheme) => (
        currentTheme === 'default' || localOwnedThemes.includes(currentTheme)
          ? currentTheme
          : getStoredActiveTheme(localOwnedThemes)
      ))
    }

    try {
      const { data: utilityRows } = await supabaseData
        .from('gem_transactions')
        .select('reason')
        .eq('user_id', me.id)
        .eq('goal_id', hydratedGoal.id)

      const relevantRows = utilityRows || []
      setInventoryCounts(buildInventoryCountsFromTransactions(relevantRows))
      setClaimedModuleRewardIds(getClaimedModuleRewardIds(relevantRows))
    } catch {
      setInventoryCounts({ taskReroll: 0, reviewShield: 0 })
      setClaimedModuleRewardIds([])
    }

    // Only update state if the query succeeded — never reset gems/xp to 0 on error
    if (!progError && prog) {
      const storedXp   = Number(prog.total_xp) || 0
      const computedXp = computeTotalXpFromRows(taskRows)
      const finalXp    = storedXp > 0 ? storedXp : computedXp
      setXpDisplay(getLevelProgress(finalXp))
      setStreakData({ current: prog.current_streak || 0, longest: prog.longest_streak || 0 })
      setFreezeCount(Number(prog.freeze_count) || 0)

      const h = prog.hearts_remaining != null ? Number(prog.hearts_remaining) : HEARTS_BASE
      let resolvedMaxHearts = Math.min(HEARTS_MAX_CAP, Math.max(getStoredMaxHearts(), HEARTS_BASE, h))
      try {
        const { data: heartUpgradeData } = await supabaseData
          .from('gem_transactions')
          .select('id')
          .eq('user_id', me.id)
          .eq('goal_id', hydratedGoal.id)
          .eq('reason', 'shop_heartContainer')
        const purchasedHeartSlots = (heartUpgradeData || []).length
        const derivedMaxHearts = Math.min(HEARTS_MAX_CAP, HEARTS_BASE + purchasedHeartSlots)
        resolvedMaxHearts = Math.max(resolvedMaxHearts, derivedMaxHearts)
      } catch { /* optional upgrade sync */ }
      setStoredMaxHearts(resolvedMaxHearts)
      setMaxHearts(resolvedMaxHearts)
      setPrevHearts(h)
      setHeartsRemaining(h)
      setHeartsRefillAt(prog.hearts_refill_at || null)

      // ── Gem reconciliation: ensure DB gems reflect actual earnings ──
      const dbGems = Number(prog.gems) || 0
      const completedTaskCount = taskRows.reduce((sum, row) => {
        const ts = Array.isArray(row.tasks) ? row.tasks : []
        return sum + ts.filter(t => t.completed).length
      }, 0)
      const completedDayCount = taskRows.filter(r => r.completion_status === 'completed').length
      const minEarnedGems = completedTaskCount * 5 + completedDayCount * 15

      let finalGems = dbGems
      if (dbGems < minEarnedGems) {
        // DB is behind — compute correct balance accounting for spent gems
        let totalSpent = 0
        try {
          const { data: spentData } = await supabaseData
            .from('gem_transactions')
            .select('amount')
            .eq('user_id', me.id)
            .eq('goal_id', hydratedGoal.id)
            .lt('amount', 0)
          totalSpent = (spentData || []).reduce((s, t) => s + (Number(t.amount) || 0), 0)
        } catch { /* no transaction table yet — treat spent as 0 */ }

        finalGems = Math.max(dbGems, minEarnedGems + totalSpent) // totalSpent is negative
        if (finalGems > dbGems) {
          supabaseData
            .from('user_progress')
            .update({ gems: finalGems })
            .eq('user_id', me.id)
            .eq('goal_id', hydratedGoal.id)
            .then(() => {})
            .catch(() => {})
        }
      }
      if (preserveGemFloor != null) finalGems = Math.max(finalGems, preserveGemFloor)
      setGems(finalGems)

      if (prog.total_days) setTotalDaysPlanned(Number(prog.total_days))
      if (prog.xp_boost_until) {
        const until = new Date(prog.xp_boost_until)
        if (until > new Date()) setXpBoostUntil(until)
        else setXpBoostUntil(null)
      }
    } else {
      // Fallback: compute XP from rows, keep current gem/heart state
      setXpDisplay(getLevelProgress(computeTotalXpFromRows(taskRows)))
    }

    // Load new columns separately (won't break if columns don't exist yet)
    try {
      const { data: extra } = await supabaseData
        .from('user_progress').select('reward_calendar,last_event_date')
        .eq('goal_id', hydratedGoal.id).eq('user_id', me.id).maybeSingle()
      if (extra?.reward_calendar) {
        const cal = extra.reward_calendar
        const weekStart = getWeekStartStr()
        if (cal.week_start === weekStart) setRewardCalendar(cal)
        else setRewardCalendar({ week_start: weekStart, days_claimed: [] })
      }
    } catch { /* new columns may not exist yet */ }

    // Load quests from today's row
    if (today?.quests && Array.isArray(today.quests) && today.quests.length > 0) {
      setQuests(today.quests)
    } else if (today) {
      const { generateDailyQuests } = await import('@/lib/quests')
      const dayTasks = Array.isArray(today.tasks) ? today.tasks : []
      setQuests(generateDailyQuests(today.day_number || 1, dayTasks.length, hydratedDomain))
    }

    // Load weekly challenge
    try {
      const { session: sess } = await getSafeSupabaseSession()
      const tok = sess?.access_token || null
      const chalRes = await fetch(`/api/weekly-challenge?goalId=${hydratedGoal.id}${tok ? `&token=${tok}` : ''}`, {
        headers: tok ? { Authorization: `Bearer ${tok}` } : {},
      })
      if (chalRes.ok) {
        const chalData = await chalRes.json()
        setWeeklyChallenge(chalData.challenge || null)
        setChallengeDaysLeft(chalData.daysRemaining ?? 0)
      }
    } catch { /* silent */ }

    // Comeback detection
    const currentStreak = prog?.current_streak || 0
    const priorDone  = (taskRows || []).filter(r => r.completion_status === 'completed').length
    const isBack     = currentStreak === 0 && priorDone > 0
    setIsComeback(isBack)

    // Analytics: app opened
    track(EVENTS.APP_OPENED, { isComeback: isBack }, {
      userId: me.id, goalId: hydratedGoal.id,
      streakValue: currentStreak, xpBalance: Number(prog?.total_xp) || 0,
    })

    // Mastery decay check (non-blocking)
    try {
      const { session: decaySess } = await getSafeSupabaseSession()
      const dToken = decaySess?.access_token || null
      fetch('/api/decay-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(dToken ? { Authorization: `Bearer ${dToken}` } : {}) },
        body: JSON.stringify({ userId: me.id, goalId: hydratedGoal.id, accessToken: dToken }),
      }).then(r => r.json()).then(d => {
        if (d.shieldConsumed) {
          setInventoryCounts((prev) => ({ ...prev, reviewShield: Number.isFinite(d.reviewShieldRemaining) ? d.reviewShieldRemaining : Math.max(0, (prev.reviewShield || 1) - 1) }))
          setModuleRewardToasts((prev) => [...prev, {
            id: `shield-${Date.now()}`,
            title: 'Review shield used',
            message: `${d.shieldedConceptId || 'A weak concept'} was deferred for one cycle.`,
          }])
        }
        if (d.decaying?.length > 0) setDecayingConcepts(d.decaying)
        else setDecayingConcepts([])
      }).catch(() => {})
    } catch {}

    // Fetch earned badges (non-blocking)
    supabaseData.from('achievements').select('badge_id').eq('user_id', me.id)
      .then(({ data: badges }) => {
        if (badges) setEarnedBadgeIds(new Set(badges.map(b => b.badge_id)))
      }).catch(() => {})

    setLoading(false)
    return {
      today: today || null,
      tomorrow: tomorrowR || null,
      tracker: trackerSnapshot,
      rows: taskRows,
      goal: activeGoal,
    }
    } catch (loadError) {
      console.warn('[PathAI] dashboard_load_failed', loadError?.message || 'unknown_error')
      setError('Could not load your dashboard right now. Please try again.')
      setLoading(false)
      return null
    }
  }, [router])

  useEffect(() => { load().catch(() => {}) }, [load])

  // Hydrate theme + maxHearts from localStorage after mount (avoids SSR/client mismatch)
  useEffect(() => {
    const owned = getStoredOwnedThemes()
    setOwnedThemes(owned)
    setActiveTheme(getStoredActiveTheme(owned))
    setMaxHearts(getStoredMaxHearts())
  }, [])

  useEffect(() => {
    if (moduleRewardToasts.length === 0) return
    const timer = setTimeout(() => setModuleRewardToasts([]), 4500)
    return () => clearTimeout(timer)
  }, [moduleRewardToasts])

  useEffect(() => {
    setExpandedPathModules({})
    setExpandedPathUnits({})
  }, [goal?.id])

  useEffect(() => {
    if (!goal?.id || !user?.id || goal?.mode === 'explore') return
    const expectedUnitCount = Math.max(Number(goal?.total_days) || 0, Number(totalDaysPlanned) || 0)
    const likelyBrokenShortCourse = expectedUnitCount > 0 && expectedUnitCount < 5
    if (!likelyBrokenShortCourse && !courseOutlineNeedsRecovery(goal?.course_outline, expectedUnitCount)) return
    if (outlineRecoveryAttemptedRef.current.has(goal.id)) return

    outlineRecoveryAttemptedRef.current.add(goal.id)
    ;(async () => {
      try {
        const { session } = await getSafeSupabaseSession()
        const token = session?.access_token || null
        const res = await fetch('/api/course-outline-recover', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ goalId: goal.id, userId: user.id, accessToken: token }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data.courseOutline) return

        if (!isMountedRef.current) return
        setGoal((prev) => prev?.id === goal.id ? { ...prev, course_outline: data.courseOutline } : prev)
        if (data.sequenceDayCount) setTotalDaysPlanned(Number(data.sequenceDayCount))
        await load(true)
      } catch {
        // Fallback tracker stays in place if recovery fails.
      }
    })()
  }, [goal?.id, goal?.course_outline, goal?.mode, goal?.total_days, totalDaysPlanned, user?.id, load])

  useEffect(() => {
    if (!Array.isArray(pathTracker.modules) || pathTracker.modules.length === 0) return

    setExpandedPathModules((prev) => {
      const next = { ...prev }
      let changed = false

      pathTracker.modules.forEach((module) => {
        if (next[module.id] == null) {
          next[module.id] = module.id === pathTracker.currentModuleId
          changed = true
        }
      })

      if (pathTracker.currentModuleId && next[pathTracker.currentModuleId] == null) {
        next[pathTracker.currentModuleId] = true
        changed = true
      }

      return changed ? next : prev
    })

    if (pathTracker.currentUnitId) {
      setExpandedPathUnits((prev) => (
        prev[pathTracker.currentUnitId] == null
          ? { ...prev, [pathTracker.currentUnitId]: true }
          : prev
      ))
    }
  }, [pathTracker.currentModuleId, pathTracker.currentUnitId, pathTracker.modules])

  useEffect(() => {
    if (!goal?.id || !user?.id) return
    const nextModuleReward = pathTracker.modules.find((module) => (
      module.sealEarned
      && !module.rewardClaimed
      && !claimingModuleRewardRef.current.has(module.id)
    ))
    if (!nextModuleReward) return

    claimingModuleRewardRef.current.add(nextModuleReward.id)
    ;(async () => {
      try {
        const data = await claimModuleReward({
          user,
          goal,
          moduleId: nextModuleReward.id,
        })
        if (!data.ok || data.alreadyClaimed) {
          setClaimedModuleRewardIds((prev) => Array.from(new Set([...prev, nextModuleReward.id])))
          return
        }
        if (data.newGemTotal != null) setGems(data.newGemTotal)
        if (data.rewardAmount) {
          setGemToasts((prev) => [...prev, { id: Date.now(), amount: data.rewardAmount }])
          setModuleRewardToasts((prev) => [...prev, {
            id: `${nextModuleReward.id}-${Date.now()}`,
            title: nextModuleReward.title,
            rewardAmount: data.rewardAmount,
            identityLabel: data.identityLabel || nextModuleReward.identityLabel,
          }])
        }
        setClaimedModuleRewardIds((prev) => Array.from(new Set([...prev, nextModuleReward.id])))
      } catch {
        // Retry on next render if needed
        claimingModuleRewardRef.current.delete(nextModuleReward.id)
        return
      }
      claimingModuleRewardRef.current.delete(nextModuleReward.id)
    })()
  }, [goal, pathTracker.modules, user])

  useEffect(() => {
    currentDayRowIdRef.current = todayRow?.id || null
  }, [todayRow?.id])

  // Unmount cleanup — clear all pending timers
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (missionConfettiTimerRef.current) clearTimeout(missionConfettiTimerRef.current)
      if (taskReloadTimerRef.current) clearTimeout(taskReloadTimerRef.current)
      pendingTimersRef.current.forEach(clearTimeout)
      pendingTimersRef.current = []
    }
  }, [])

  useEffect(() => {
    const nextY = Number(tabScrollPositionsRef.current[activeTab] || 0)
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: nextY, behavior: 'auto' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [activeTab])

  const handleTabSelect = useCallback((nextTab) => {
    if (nextTab === activeTab) return
    tabScrollPositionsRef.current[activeTab] = window.scrollY
    setActiveTab(nextTab)
  }, [activeTab])

  // XP boost countdown timer
  useEffect(() => {
    if (!xpBoostUntil) { setBoostTimeLeft(0); return }
    const tick = () => {
      const diff = Math.max(0, Math.floor((xpBoostUntil - Date.now()) / 1000))
      setBoostTimeLeft(diff)
      if (diff <= 0) setXpBoostUntil(null)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [xpBoostUntil])

  // ─── XP boost random event (25% chance, max once per day) ─────────────────
  useEffect(() => {
    if (boostCheckedRef.current || loading || !goal || !user) return
    boostCheckedRef.current = true // one-shot — never re-check this session

    const todayStr = new Date().toISOString().split('T')[0]
    const lastEvent = localStorage.getItem('pathai.lastBoostEvent')
    if (lastEvent === todayStr) return
    if (xpBoostUntil) return

    if (Math.random() < 0.25) {
      localStorage.setItem('pathai.lastBoostEvent', todayStr)
      const outerTimer = setTimeout(() => {
        if (!isMountedRef.current) return
        setShowBoostEvent(true)
        const boostEnd = new Date(Date.now() + 15 * 60 * 1000)
        setXpBoostUntil(boostEnd)
        supabaseData.from('user_progress').update({
          xp_boost_until: boostEnd.toISOString(),
          last_event_date: todayStr,
        }).eq('user_id', user.id).eq('goal_id', goal.id).then(() => {}).catch(() => {})
        const innerTimer = setTimeout(() => {
          if (isMountedRef.current) setShowBoostEvent(false)
        }, 2500)
        pendingTimersRef.current.push(innerTimer)
      }, 2000)
      pendingTimersRef.current.push(outerTimer)
    }
  }, [loading, goal, user, xpBoostUntil])

  // ─── Reward calendar claim handler ─────────────────────────────────────────
  const handleClaimReward = useCallback(async () => {
    if (claimingReward || !goal || !user) return
    setClaimingReward(true)
    try {
      const data = await claimDailyReward({
        user,
        goal,
      })
      if (data.ok) {
        setError('')
        setRewardCalendar(data.calendar)
        const earned = (data.reward || 0) + (data.perfectWeekBonus || 0)
        if (data.newGemTotal != null) setGems(data.newGemTotal)
        else setGems((g) => g + earned)
        setGemPulse(true)
        pendingTimersRef.current.push(setTimeout(() => { if (isMountedRef.current) setGemPulse(false) }, 400))
        setGemToasts(prev => [...prev, { id: Date.now(), amount: earned }])
      } else if (data.error === 'Already claimed today') {
        // Silently update calendar to reflect claimed state
        if (data.calendar) {
          setRewardCalendar(data.calendar)
        } else {
          const todayIdx = new Date().getDay()
          const calToday = todayIdx === 0 ? 6 : todayIdx - 1
          setRewardCalendar(prev => ({
            ...prev,
            days_claimed: prev.days_claimed?.includes(calToday) ? prev.days_claimed : [...(prev.days_claimed || []), calToday],
          }))
        }
      } else {
        setError(data.error || 'Could not claim reward')
      }
    } catch { /* silent */ }
    setClaimingReward(false)
  }, [claimingReward, goal, user])

  // ─── XP toast helpers ───────────────────────────────────────────────────────
  const addXpToast    = useCallback((amount, x, y) => {
    const id = Date.now() + Math.random()
    setXpToasts(prev => [...prev, { id, amount, x, y }])
  }, [])
  const removeXpToast = useCallback((id) => {
    setXpToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // ─── Optimistic task completion ─────────────────────────────────────────────
  const completeTask = useCallback(async (task, event, metrics = {}) => {
    if (!task?.id || task.completed || completing) return
    if (!todayRow?.id || !goal || !user) {
      setError('Task data is still loading. Try again in a moment.')
      return
    }
    const normalizedTask = normalizeLearningTask(task)
    const lockState = getTaskLockState(task, tasks)
    if (lockState.locked) {
      setError(lockState.reason)
      return
    }
    if (normalizedTask.type === 'concept' && !metrics?.fromLesson && !TEMPORARILY_ENABLE_DEV_COMPLETE_BUTTON) {
      setError('Finish the concept lesson from inside the lesson view to unlock the next task.')
      return
    }

    if (taskReloadTimerRef.current) {
      clearTimeout(taskReloadTimerRef.current)
      taskReloadTimerRef.current = null
    }

    const rowId = todayRow.id
    const prevTasks = normalizeTaskList(tasks)
    const prevCompletedCount = countCompletedTasks(prevTasks)
    const prevRowStatus = deriveTaskRowStatus(prevTasks, todayRow?.completion_status || 'not_started')
    const isCourseFinalTask = isCourseFinalExamTask(normalizedTask)
    const xpAmount  = xpForTask(normalizedTask)
    const optimisticTaskGems = 5
    let nextGemFloor = gems + optimisticTaskGems

    // Capture event coordinates eagerly — synthetic event will be recycled after await
    const eventTarget = event?.currentTarget
    const rect = eventTarget?.getBoundingClientRect?.()
    const tapX = rect ? rect.left + rect.width / 2 : null
    const tapY = rect ? rect.top : null
    const streakTapX = event?.clientX || (typeof window !== 'undefined' ? window.innerWidth / 2 : 200)

    // 1. Immediate optimistic update
    const nextTasks = normalizeTaskList(prevTasks.map(t => t.id === task.id ? { ...t, completed: true } : t))
    const nextCompletedCount = countCompletedTasks(nextTasks)
    const nextRowStatus = deriveTaskRowStatus(nextTasks, todayRow?.completion_status || 'in_progress')
    setTasks(nextTasks)
    if (rowId) {
      const completedIds = new Set(completedTaskIdsByRowRef.current.get(rowId) || [])
      completedIds.add(String(task.id))
      completedTaskIdsByRowRef.current.set(rowId, completedIds)
      setTodayRow(prev => prev?.id === rowId ? {
        ...prev,
        tasks: nextTasks,
        tasks_completed: nextCompletedCount,
        completion_status: nextRowStatus,
      } : prev)
      setAllRows(prev => prev.map(row => row.id === rowId ? {
        ...row,
        tasks: nextTasks,
        tasks_completed: nextCompletedCount,
        completion_status: nextRowStatus,
      } : row))
    }
    setCompleting(task.id)

    // 2. XP toast at tap position
    if (tapX != null) {
      addXpToast(xpAmount, tapX, tapY)
    }

    // 3. Optimistic XP bar
    const prevXp = xpDisplay.totalXp
    setXpDisplay(getLevelProgress(prevXp + xpAmount))
    setXpAnimating(true)
    pendingTimersRef.current.push(setTimeout(() => {
      if (isMountedRef.current) setXpAnimating(false)
    }, 800))

    // 3a. Optimistic gem bump (+5 per task)
    setGems(g => g + optimisticTaskGems)

    // 3b. Instant mission complete — don't wait for API
    const allDoneNow = nextTasks.every(t => t.completed)
    if (allDoneNow && !isCourseFinalTask) {
      if (missionCompletionResolverRef.current) missionCompletionResolverRef.current(false)
      missionCompletionPromiseRef.current = new Promise((resolve) => {
        missionCompletionResolverRef.current = resolve
      })
      holdCompletedDayRef.current = true
      setShowNextDayCTA(true)
      setAdvancingNextDay(false)
      setMissionDone(true)
      setShowMissionConfetti(true)
      if (missionConfettiTimerRef.current) clearTimeout(missionConfettiTimerRef.current)
      missionConfettiTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) setShowMissionConfetti(false)
        missionConfettiTimerRef.current = null
      }, 2400)
    }

    // 4. API call (async, non-blocking)
    let apiOk = false
    try {
      const data = await completeLearningTask({
        user,
        goal,
        taskRowId: rowId,
        taskId: task.id,
        completedTaskIds: prevTasks.filter((entry) => entry.completed).map((entry) => entry.id),
        clientHour: new Date().getHours(),
        attempts: metrics?.attempts,
        accuracy: metrics?.accuracy,
        correctCount: metrics?.correctCount,
        questionCount: metrics?.questionCount,
        confidenceLevel: metrics?.confidenceLevel,
        assistantUsageCount: metrics?.assistantUsageCount,
        completionTimeSec: metrics?.completionTimeSec,
        lessonTimeSec: metrics?.completionTimeSec,
        hintsUsed: metrics?.hintsUsed,
        maxHints: metrics?.maxHints,
        reflectionQuality: metrics?.reflectionQuality,
        challengeScore: metrics?.challengeScore,
        aiInteractionDepth: metrics?.aiInteractionDepth,
        bossDefeated: metrics?.bossDefeated,
        comboMax: metrics?.comboMax,
        quizPerfect: metrics?.quizPerfect,
        takeaway: metrics?.takeaway,
        proofSubmission: metrics?.proofSubmission,
        proofResult: metrics?.proofResult,
      })
      if (!data.ok) {
        setTasks(prevTasks)
        if (rowId) {
          const completedIds = new Set(completedTaskIdsByRowRef.current.get(rowId) || [])
          completedIds.delete(String(task.id))
          if (completedIds.size > 0) completedTaskIdsByRowRef.current.set(rowId, completedIds)
          else completedTaskIdsByRowRef.current.delete(rowId)
          setTodayRow(prev => prev?.id === rowId ? {
            ...prev,
            tasks: prevTasks,
            tasks_completed: prevCompletedCount,
            completion_status: prevRowStatus,
          } : prev)
          setAllRows(prev => prev.map(row => row.id === rowId ? {
            ...row,
            tasks: prevTasks,
            tasks_completed: prevCompletedCount,
            completion_status: prevRowStatus,
          } : row))
        }
        setXpDisplay(getLevelProgress(prevXp))
        setGems(g => Math.max(0, g - optimisticTaskGems)) // rollback optimistic gem
        if (allDoneNow && !isCourseFinalTask) {
          resolveMissionCompletion(false)
          holdCompletedDayRef.current = false
          if (missionConfettiTimerRef.current) {
            clearTimeout(missionConfettiTimerRef.current)
            missionConfettiTimerRef.current = null
          }
          setShowMissionConfetti(false)
          setShowNextDayCTA(false)
          setMissionDone(false)
        }
        setError(data?.error || 'Could not save. Try again.')
        setCompleting(null)
        return
      }
      // API succeeded — task is persisted. NEVER revert after this point.
      apiOk = true
      setError('')

      const serverTasks = Array.isArray(data.updatedTasks) ? normalizeTaskList(data.updatedTasks) : null
      if (serverTasks) {
        const serverCompletedCount = countCompletedTasks(serverTasks)
        const serverStatus = data.completionStatus || deriveTaskRowStatus(serverTasks, nextRowStatus)
        setTasks(serverTasks)
        if (rowId) {
          completedTaskIdsByRowRef.current.set(
            rowId,
            new Set(serverTasks.filter((entry) => entry.completed).map((entry) => String(entry.id))),
          )
          setTodayRow(prev => prev?.id === rowId ? {
            ...prev,
            tasks: serverTasks,
            tasks_completed: serverCompletedCount,
            completion_status: serverStatus,
          } : prev)
          setAllRows(prev => prev.map(row => row.id === rowId ? {
            ...row,
            tasks: serverTasks,
            tasks_completed: serverCompletedCount,
            completion_status: serverStatus,
          } : row))
        }
      }

      if (isCourseFinalTask && data.finalExamPassed === false) {
        const revertedTasks = normalizeTaskList(Array.isArray(data.updatedTasks) ? data.updatedTasks : prevTasks)
        const revertedCompletedCount = countCompletedTasks(revertedTasks)
        const revertedStatus = data.completionStatus || deriveTaskRowStatus(revertedTasks, 'in_progress')
        setTasks(revertedTasks)
        if (rowId) {
          const completedIds = new Set(completedTaskIdsByRowRef.current.get(rowId) || [])
          completedIds.delete(String(task.id))
          if (completedIds.size > 0) completedTaskIdsByRowRef.current.set(rowId, completedIds)
          else completedTaskIdsByRowRef.current.delete(rowId)
          setTodayRow(prev => prev?.id === rowId ? {
            ...prev,
            tasks: revertedTasks,
            tasks_completed: revertedCompletedCount,
            completion_status: revertedStatus,
          } : prev)
          setAllRows(prev => prev.map(row => row.id === rowId ? {
            ...row,
            tasks: revertedTasks,
            tasks_completed: revertedCompletedCount,
            completion_status: revertedStatus,
          } : row))
        }
        setXpDisplay(getLevelProgress(prevXp))
        setGems(g => Math.max(0, g - optimisticTaskGems))
        setMissionDone(false)
        setCourseCompleteData(null)
        setError(
          data.finalExam?.failedOut
            ? `Final exam not passed. You have used all ${data.finalExam.maxAttempts || 3} attempts.`
            : `Final exam not passed. ${data.finalExam?.attemptsRemaining ?? 0} attempt${(data.finalExam?.attemptsRemaining ?? 0) === 1 ? '' : 's'} remaining.`
        )
        setCompleting(null)
        return
      }

      if (Array.isArray(data.nextResult?.rows) && data.nextResult.rows.length > 0) {
        const mergedRows = mergeRowsByDayNumber(allRows, data.nextResult.rows)
        setAllRows(mergedRows)
        const nextDayNumber = Number(data.nextResult?.startDay) || Number(data.nextResult.rows[0]?.day_number) || null
        const inferredTomorrowRow = nextDayNumber != null
          ? mergedRows.find((row) => Number(row.day_number) === nextDayNumber) || null
          : data.nextResult.rows[0] || null
        if (inferredTomorrowRow) setTomorrowRow(inferredTomorrowRow)
      }

      // Apply server corrections (wrapped separately so errors don't revert task)
      try {
        if (data.newTotalXp != null) setXpDisplay(getLevelProgress(data.newTotalXp))
        if (data.levelUp)             setLevelUpData(data.levelUp)
        if (data.streakState?.current != null) {
          setStreakData(prev => ({
            current: data.streakState.current,
            longest: Math.max(prev.longest, data.streakState.longest || 0),
          }))
        }
        if (data.streakBonusXp > 0) {
          addXpToast(data.streakBonusXp, streakTapX, 120)
        }

        // Gem update — add server-confirmed rewards without ever stomping the live balance
        const chestGemReward = data.chestReward?.type === 'gems' ? (Number(data.chestReward.amount) || 0) : 0
        const extraGems = Math.max(0, (Number(data.gemsEarned) || 0) - optimisticTaskGems) + chestGemReward
        if (extraGems > 0) {
          nextGemFloor += extraGems
          setGems(g => g + extraGems)
        }
        if (data.newGemTotal != null && Number(data.newGemTotal) > nextGemFloor) {
          const serverCorrection = Number(data.newGemTotal) - nextGemFloor
          nextGemFloor = Number(data.newGemTotal)
          setGems(g => g + serverCorrection)
        }
        if (data.gemsEarned > 0) {
          setGemPulse(true)
          pendingTimersRef.current.push(setTimeout(() => { if (isMountedRef.current) setGemPulse(false) }, 400))
          setGemToasts(prev => [...prev, { id: Date.now(), amount: data.gemsEarned }])
        }

        // Quest updates (gems already included in newGemTotal — only animate)
        if (data.questUpdate?.quests) {
          setQuests(data.questUpdate.quests)
          if (data.questUpdate.questGemsEarned > 0) {
            setGemPulse(true)
            pendingTimersRef.current.push(setTimeout(() => { if (isMountedRef.current) setGemPulse(false) }, 400))
            setGemToasts(prev => [...prev, { id: Date.now() + 1, amount: data.questUpdate.questGemsEarned }])
          }
          if (data.questUpdate.questMasterBonus) {
            setQuestMasterToast(true)
            pendingTimersRef.current.push(setTimeout(() => { if (isMountedRef.current) setQuestMasterToast(false) }, 4000))
          }
        }

        // Weekly challenge updates (gems already included in newGemTotal — only animate)
        if (data.challengeUpdate) {
          setWeeklyChallenge(prev => prev ? {
            ...prev,
            current_value: data.challengeUpdate.currentValue,
            completed: data.challengeUpdate.completed,
          } : prev)
          if (data.challengeUpdate.completed && data.challengeUpdate.gemReward > 0) {
            setGemPulse(true)
            pendingTimersRef.current.push(setTimeout(() => { if (isMountedRef.current) setGemPulse(false) }, 400))
            setGemToasts(prev => [...prev, { id: Date.now() + 2, amount: data.challengeUpdate.gemReward }])
          }
        }

        // Badge toasts — show newly earned badges
        if (data.newBadges?.length > 0) {
          pendingTimersRef.current.push(setTimeout(() => {
            if (isMountedRef.current) {
              setBadgeToasts(prev => [...prev, ...data.newBadges])
              setEarnedBadgeIds(prev => {
                const next = new Set(prev)
                data.newBadges.forEach(b => next.add(b.id))
                return next
              })
            }
          }, 600))
        }

        // Treasure chest — show after XP toast settles
        if (data.chestReward) {
          pendingTimersRef.current.push(setTimeout(() => { if (isMountedRef.current) setChestReward(data.chestReward) }, 800))
        }

        // Analytics: task completed
        track(EVENTS.TASK_COMPLETED, {
          taskId: task.id, taskType: normalizedTask.type, xpEarned: data.taskXp ?? xpAmount,
        }, {
          userId: user?.id, goalId: goal?.id, missionId: todayRow?.id,
          streakValue: data.streakState?.current ?? streakData.current,
          xpBalance: data.newTotalXp ?? (xpDisplay.totalXp + xpAmount),
          energyMode: 'good',
        })
      } catch { /* Post-API processing error — task is already saved, don't revert */ }

      // Mission complete — correct optimistic data with server values
      if (!isCourseFinalTask && (data.missionComplete || allDoneNow)) {
        const stillViewingCompletedDay = currentDayRowIdRef.current === rowId
        if (stillViewingCompletedDay) {
          holdCompletedDayRef.current = true
          setMissionDone(true)
          setShowNextDayCTA(true)
          setTodayRow(prev => prev?.id === rowId ? {
            ...prev,
            tasks: nextTasks,
            completion_status: 'completed',
          } : prev)
        }
        setAllRows(prev => prev.map(row => row.id === rowId ? {
          ...row,
          tasks: nextTasks,
          completion_status: 'completed',
        } : row))
        try {
          track(EVENTS.MISSION_COMPLETED, {
            totalXp: data.xpEarned ?? (xpAmount + (data.missionBonusXp || 0) + (data.streakBonusXp || 0)),
            dayNumber: todayRow?.day_number,
          }, {
            userId: user?.id, goalId: goal?.id, missionId: todayRow?.id,
            streakValue: data.streakState?.current ?? streakData.current,
            energyMode: 'good',
          })
        } catch { /* analytics never blocks */ }
      }

      if (isCourseFinalTask && data.courseCompleted) {
        holdCompletedDayRef.current = false
        setShowMissionConfetti(false)
        setShowNextDayCTA(false)
        setMissionDone(false)
        setCourseCompleteData(data.courseCompletion || null)
        setTodayRow(prev => prev?.id === rowId ? {
          ...prev,
          tasks: nextTasks,
          tasks_completed: nextCompletedCount,
          completion_status: 'completed',
        } : prev)
        setAllRows(prev => prev.map(row => row.id === rowId ? {
          ...row,
          tasks: nextTasks,
          tasks_completed: nextCompletedCount,
          completion_status: 'completed',
        } : row))
      }

      if (allDoneNow && !isCourseFinalTask) resolveMissionCompletion(true)

      if (data.levelUp) {
        try {
          track(EVENTS.LEVEL_UP, { fromLevel: data.levelUp.fromLevel, toLevel: data.levelUp.toLevel, title: data.levelUp.title }, {
            userId: user?.id, goalId: goal?.id, xpBalance: data.newTotalXp,
          })
        } catch { /* analytics never blocks */ }
      }

      if (!(data.missionComplete || allDoneNow) || (isCourseFinalTask && data.courseCompleted)) {
        if (taskReloadTimerRef.current) clearTimeout(taskReloadTimerRef.current)
        taskReloadTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) load(true, { preserveGemFloor: nextGemFloor, preferredRowId: rowId })
          taskReloadTimerRef.current = null
        }, 1200)
        pendingTimersRef.current.push(taskReloadTimerRef.current)
      }
    } catch {
      // Only revert if the API itself failed (network error, auth error, etc.)
      if (!apiOk) {
        setTasks(prevTasks)
        if (rowId) {
          const completedIds = new Set(completedTaskIdsByRowRef.current.get(rowId) || [])
          completedIds.delete(String(task.id))
          if (completedIds.size > 0) completedTaskIdsByRowRef.current.set(rowId, completedIds)
          else completedTaskIdsByRowRef.current.delete(rowId)
          setTodayRow(prev => prev?.id === rowId ? {
            ...prev,
            tasks: prevTasks,
            tasks_completed: prevCompletedCount,
            completion_status: prevRowStatus,
          } : prev)
          setAllRows(prev => prev.map(row => row.id === rowId ? {
            ...row,
            tasks: prevTasks,
            tasks_completed: prevCompletedCount,
            completion_status: prevRowStatus,
          } : row))
        }
        setXpDisplay(getLevelProgress(prevXp))
        setGems(g => Math.max(0, g - optimisticTaskGems)) // rollback optimistic gem
        if (allDoneNow && !isCourseFinalTask) {
          resolveMissionCompletion(false)
          holdCompletedDayRef.current = false
          if (missionConfettiTimerRef.current) {
            clearTimeout(missionConfettiTimerRef.current)
            missionConfettiTimerRef.current = null
          }
          setShowMissionConfetti(false)
          setShowNextDayCTA(false)
          setMissionDone(false)
        }
        setError('Network error. Check your connection.')
      }
    } finally {
      if (allDoneNow && !apiOk && !isCourseFinalTask) resolveMissionCompletion(false)
      setCompleting(null)
    }
  }, [tasks, completing, xpDisplay, todayRow, streakData, addXpToast, load, gems, user, goal, resolveMissionCompletion, allRows])

  const handleTaskReroll = useCallback(async (task) => {
    if (rerollingTaskId || !task?.id || !goal || !todayRow?.id || !user || !canRerollTask(task)) return
    setRerollingTaskId(task.id)
    try {
      const data = await rerollLearningTask({
        user,
        goal,
        taskRowId: todayRow.id,
        taskId: task.id,
      })
      if (!data.ok) {
        setError(data.error || 'Could not reroll that task')
        return
      }

      const replacementTask = normalizeLearningTask(data.replacementTask)
      const nextTasks = normalizeTaskList((Array.isArray(todayRow.tasks) ? todayRow.tasks : tasks).map((entry) => (
        String(entry.id) === String(task.id) ? replacementTask : entry
      )))

      setTasks(nextTasks)
      setTodayRow((prev) => prev?.id === todayRow.id ? { ...prev, tasks: nextTasks } : prev)
      setAllRows((prev) => prev.map((row) => (
        row.id === todayRow.id ? { ...row, tasks: nextTasks } : row
      )))
      setError('')
      if (data.inventoryCounts) setInventoryCounts(data.inventoryCounts)
      setModuleRewardToasts((prev) => [...prev, {
        id: `reroll-${task.id}-${Date.now()}`,
        title: 'Task refreshed',
        message: `${normalizeLearningTask(task).title} was replaced with a new valid task.`,
      }])
    } catch {
      setError('Could not reroll that task')
    } finally {
      setRerollingTaskId(null)
    }
  }, [goal, rerollingTaskId, tasks, todayRow, user])

  // ─── Streak freeze ─────────────────────────────────────────────────────────
  const handleFreeze = useCallback(async () => {
    if (freezing || freezeCount <= 0 || !goal) return
    setFreezing(true)
    try {
      const { session } = await getSafeSupabaseSession()
      const token = session?.access_token || null
      const res = await fetch('/api/streak-freeze', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) },
        body: JSON.stringify({ goalId: goal.id }),
      })
      const data = await res.json()
      if (data.ok) {
        setFreezeCount(prev => Math.max(0, prev - 1))
        setFreezeToast(true)
        pendingTimersRef.current.push(setTimeout(() => { if (isMountedRef.current) setFreezeToast(false) }, 3500))
        track(EVENTS.STREAK_FREEZE_USED, { freezesRemaining: (freezeCount - 1) }, {
          userId: user?.id, goalId: goal?.id, streakValue: streakData.current,
        })
      }
    } catch { /* silent */ }
    setFreezing(false)
  }, [freezing, freezeCount, goal, streakData, user])

  // ─── Heart lost (wrong quiz answer) ────────────────────────────────────────
  const handleHeartLost = useCallback(async () => {
    if (!goal) return
    const prev = heartsRemaining
    const next = Math.max(0, prev - 1)
    setPrevHearts(prev)
    setHeartsRemaining(next)
    try {
      const { session } = await getSafeSupabaseSession()
      const token = session?.access_token || null
      const res = await fetch('/api/wrong-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ goalId: goal.id, accessToken: token }),
      })
      const data = await res.json()
      if (data.heartsRemaining != null) {
        setHeartsRemaining(data.heartsRemaining)
        setHeartsRefillAt(data.heartsRefillAt || null)
        if (data.heartsRemaining === 0) setShowNoHearts(true)
      }
    } catch { /* optimistic value stays */ }
  }, [goal, heartsRemaining])

  // ─── Generate next day on-demand (when AI generation lagged) ────────────────
  const handleGenerateNext = useCallback(async (options = {}) => {
    if (generatingNext || !goal || !user) return
    setGeneratingNext(true)
    let generatedData = null
    try {
      generatedData = await generateNextLearningDay({
        user,
        goal,
        preferredDayNumber: options?.preferredDayNumber,
      })
      if (!generatedData?.ok) {
        throw new Error(generatedData?.error || 'Could not generate the next day')
      }
    } catch (error) {
      setGeneratingNext(false)
      setError(error?.message || 'Could not generate the next day')
      throw error
    }
    const insertedRows = Array.isArray(generatedData?.rows) ? generatedData.rows : []
    const nextDayNumber = Number.isFinite(options?.preferredDayNumber)
      ? Number(options.preferredDayNumber)
      : Number(insertedRows[0]?.day_number) || Number(generatedData?.day?.day) || Number(generatedData?.startDay) || null

    if (insertedRows.length > 0) {
      const mergedRows = mergeRowsByDayNumber(allRows, insertedRows)
      const preferredInsertedRow = nextDayNumber != null
        ? mergedRows.find((row) => Number(row.day_number) === nextDayNumber) || insertedRows[0]
        : insertedRows[0]
      setAllRows(mergedRows)
      activateDayRow(preferredInsertedRow, mergedRows)
      setShowNextDayCTA(false)
      setMissionDone(false)
      setError('')
    } else if (generatedData?.reason === 'course_finished') {
      setShowNextDayCTA(false)
      setError('')
    } else {
      const loadResult = await load(true, nextDayNumber != null ? { preferredDayNumber: nextDayNumber } : {})
      const loadedDayNumber = Number(loadResult?.today?.day_number) || null
      if (nextDayNumber != null && loadedDayNumber === nextDayNumber && loadResult?.today?.id) {
        setShowNextDayCTA(false)
        setMissionDone(false)
        setError('')
      }
    }
    setGeneratingNext(false)
    return generatedData
  }, [generatingNext, goal, user, load, allRows, activateDayRow])

  // ─── Fast-forward to next day ───────────────────────────────────────────────
  const handleStartNextDay = useCallback(async () => {
    if (advancingNextDay) return
    if (missionConfettiTimerRef.current) {
      clearTimeout(missionConfettiTimerRef.current)
      missionConfettiTimerRef.current = null
    }
    setShowMissionConfetti(false)
    setAdvancingNextDay(true)
    setShowNextDayCTA(false)

    // Always clear hold flag — we want to move forward, not stay on completed day
    holdCompletedDayRef.current = false

    try {
      // Wait for mission completion API, but don't hang — timeout after 2s
      await Promise.race([
        missionCompletionPromiseRef.current.catch(() => true),
        new Promise(resolve => setTimeout(() => resolve(true), 2000)),
      ])

      const immediateNextRowReady = (
        tomorrowRow
        && tomorrowRow.id !== todayRow?.id
        && Number(tomorrowRow.day_number) > (Number(todayRow?.day_number) || 0)
        && tomorrowRow.completion_status !== 'completed'
      ) ? tomorrowRow : null

      if (immediateNextRowReady) {
        const mergedRows = mergeRowsByDayNumber(allRows, [immediateNextRowReady])
        setAllRows(mergedRows)
        activateDayRow(immediateNextRowReady, mergedRows)
        setMissionDone(false)
        setError('')
        return
      }

      const expectedCourseSpan = Math.max(
        Number(totalDaysPlanned) || 0,
        Number(goal?.total_days) || 0,
        Number(pathTracker.plannedDayCount) || 0,
      )
      const effectiveCourseCompleted = pathTracker.courseCompleted && expectedCourseSpan <= (Number(pathTracker.plannedDayCount) || 0)
      const nextTargetDay = Number(tomorrowRow?.day_number)
        || Number(pathTracker.currentDayNumber)
        || (expectedCourseSpan > (Number(todayRow?.day_number) || 0) ? (Number(todayRow?.day_number) || 0) + 1 : null)
      if (!nextTargetDay || effectiveCourseCompleted) {
        setShowNextDayCTA(false)
        return
      }

      // Strategy 0: completion API already gave us the exact next row
      if (
        tomorrowRow
        && tomorrowRow.id !== todayRow?.id
        && Number(tomorrowRow.day_number) === nextTargetDay
        && tomorrowRow.completion_status !== 'completed'
      ) {
        const mergedRows = mergeRowsByDayNumber(allRows, [tomorrowRow])
        setAllRows(mergedRows)
        activateDayRow(tomorrowRow, mergedRows)
        setMissionDone(false)
        setError('')
        return
      }

      // Strategy 1: next curriculum item already exists in client state
      if (
        pathTracker.currentGeneratedRow
        && pathTracker.currentGeneratedRow.id !== todayRow?.id
        && Number(pathTracker.currentGeneratedRow.day_number) > (Number(todayRow?.day_number) || 0)
      ) {
        activateDayRow(pathTracker.currentGeneratedRow, allRows)
        setMissionDone(false)
        setError('')
        return
      }

      // Strategy 2: try to load from DB — the completion API may have already generated the next sequence item
      holdCompletedDayRef.current = false
      const loadResult = await load(true, { preferredDayNumber: nextTargetDay })

      // Check the actual loaded row instead of a ref that updates on the next render tick.
      const movedForward = Number(loadResult?.today?.day_number) === nextTargetDay
      if (movedForward) {
        setError('')
        return
      }

      // Strategy 3: generate the exact next sequence item if it doesn't exist yet
      await handleGenerateNext({ preferredDayNumber: nextTargetDay })
    } catch {
      // If advancing fails, restore the CTA so the user can retry
      if (isMountedRef.current) setShowNextDayCTA(true)
    } finally {
      if (isMountedRef.current) setAdvancingNextDay(false)
    }
  }, [advancingNextDay, todayRow, tomorrowRow, allRows, activateDayRow, load, handleGenerateNext, pathTracker, totalDaysPlanned, goal?.total_days])

  // ─── Lesson complete ────────────────────────────────────────────────────────
  const handleLessonComplete = useCallback((task, metrics = {}) => {
    setShowLesson(null)
    if (!task || task.completed) return
    const normalizedType = getCanonicalTaskType(task?.type, task)
    // Concept tasks get a practice round interstitial before marking complete
    if (normalizedType === 'concept') {
      setPracticeRoundTask({ task, metrics })
    } else {
      setTimeout(() => completeTask(task, null, metrics), 100)
    }
  }, [completeTask])

  const openDevGeneratedProject = useCallback(() => {
    const seed = Date.now()
    const conceptText = Array.isArray(todayRow?.covered_topics) && todayRow.covered_topics.length > 0
      ? todayRow.covered_topics.filter(Boolean).slice(0, 6).join(', ')
      : goal?.goal_text || 'applied fundamentals'

    setPreviewTask(null)
    setPracticeRoundTask(null)
    setShowLesson(normalizeLearningTask({
      id: `dev-project-${seed}`,
      type: 'project',
      title: 'Dev Generated Project',
      description: 'Temporary dev tool project generated on demand for testing the project viewer.',
      estimatedTimeMin: 60,
      durationMin: 60,
      _concept: conceptText,
      _devAutoProjectMode: 'guided',
      _devGenerated: true,
    }))
  }, [goal?.goal_text, todayRow?.covered_topics])

  const handleP5MissionCompleted = useCallback((payload = {}) => {
    setTodayMission(prev => prev ? {
      ...prev,
      status: 'completed',
      completedAt: payload?.mission?.completedAt || payload?.mission?.completed_at || new Date().toISOString(),
    } : prev)
    setLearningStatusRefreshKey(value => value + 1)
    setMissionDone(true)
    setShowNextDayCTA(false)
    setShowMissionConfetti(true)
    if (missionConfettiTimerRef.current) clearTimeout(missionConfettiTimerRef.current)
    missionConfettiTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) setShowMissionConfetti(false)
      missionConfettiTimerRef.current = null
    }, 2400)

    const xpEarned = Number(payload?.xpEarned) || 0
    if (xpEarned > 0) {
      setXpDisplay(prev => getLevelProgress((Number(prev?.totalXp) || 0) + xpEarned))
      setXpAnimating(true)
      pendingTimersRef.current.push(setTimeout(() => {
        if (isMountedRef.current) setXpAnimating(false)
      }, 800))
    }

    const gemsEarned = Number(payload?.gemsEarned) || 0
    if (gemsEarned > 0) {
      setGems(g => g + gemsEarned)
      setGemPulse(true)
      pendingTimersRef.current.push(setTimeout(() => {
        if (isMountedRef.current) setGemPulse(false)
      }, 400))
      setGemToasts(prev => [...prev, { id: Date.now() + 5, amount: gemsEarned }])
    }

    if (payload?.streakState?.current != null) {
      setStreakData(prev => ({
        current: Number(payload.streakState.current) || prev.current,
        longest: Math.max(prev.longest, Number(payload.streakState.longest) || 0),
      }))
    }
  }, [])

  // ─── Switch active goal ─────────────────────────────────────────────────────
  const switchGoal = useCallback(async (goalId) => {
    if (switchingGoal || goalId === goal?.id) { setShowGoalsSidebar(false); return }
    setSwitchingGoal(goalId)
    try {
      const { user } = await getSafeSupabaseUser()
      const userId = user?.id
      if (!userId) return
      // Set all goals to paused, then activate the chosen one
      await supabaseData.from('goals').update({ status: 'paused' }).eq('user_id', userId).neq('id', goalId)
      await supabaseData.from('goals').update({ status: 'active' }).eq('id', goalId).eq('user_id', userId)
      setShowGoalsSidebar(false)
      await load(true)
    } catch { /* silent */ }
    setSwitchingGoal(null)
  }, [switchingGoal, goal, load])

  // ─── Computed ───────────────────────────────────────────────────────────────
  const visibleTasks = useMemo(() => annotateTaskLocks(tasks), [tasks])
  const p5MissionEligible = Boolean(
    goal?.topic_graph_id
    && goal?.mission_flow_version === 'p5'
    && user?.id
    && !isLocalAccessUser(user)
  )
  const showP5MissionSurface = p5MissionEligible && !missionFlowLegacyFallback
  const activeViewerTask = useMemo(() => showLesson ? normalizeLearningTask(showLesson) : null, [showLesson])
  const activeViewerType = activeViewerTask?.type || ''
  const activeViewerPresentation = activeViewerTask?.presentation || ''
  const activeViewerPracticeDomain = resolvePracticeDomainForGoal(activeDomain, goal?.goal_text || '')
  const storedViewerDomainTaskType = activeViewerTask?.domainTaskType || activeViewerTask?._domainTaskType || null
  const fallbackViewerDomainTaskType = getDomainAssignmentType(activeViewerPracticeDomain, activeViewerType, goal?.goal_text || '')
  const storedViewerTaskIsInvalidCode = CODE_DOMAIN_TASK_TYPES.includes(storedViewerDomainTaskType)
    && activeViewerPracticeDomain !== 'CS_CODING'
  const activeViewerDomainTaskType = activeViewerType !== 'concept'
    && !['boss', 'final_exam'].includes(activeViewerType)
    ? (storedViewerTaskIsInvalidCode ? fallbackViewerDomainTaskType : storedViewerDomainTaskType || fallbackViewerDomainTaskType)
    : null
  const expectedCourseSpan = Math.max(
    Number(totalDaysPlanned) || 0,
    Number(goal?.total_days) || 0,
    Number(pathTracker.plannedDayCount) || 0,
  )
  const effectiveCourseCompleted = pathTracker.courseCompleted && expectedCourseSpan <= (Number(pathTracker.plannedDayCount) || 0)
  const isTodayComplete = Boolean(
    todayRow && (
      missionDone
      || todayRow.completion_status === 'completed'
      || (tasks.length > 0 && tasks.every((task) => task.completed))
    )
  )
  const nextDayBusy = advancingNextDay || generatingNext
  const showInlineNextDayCTA = showNextDayCTA && !effectiveCourseCompleted
  const showInlineNextDayProgress = nextDayBusy && !effectiveCourseCompleted
  const nextSequenceKind = pathTracker.currentItemKind
  const nextSequenceTitle = pathTracker.sequenceItems.find((item) => item.id === pathTracker.currentItemId)?.title || null
  const nextItemIsProject = nextSequenceKind === 'mini_project' || nextSequenceKind === 'full_project'
  const nextRowIsFinalExam = nextSequenceKind === 'final_exam'
  const nextDayStatusLabel = generatingNext
    ? (nextRowIsFinalExam
      ? 'Preparing your final exam...'
      : nextItemIsProject
        ? 'Preparing your project day...'
        : 'Generating your next day...')
    : (nextRowIsFinalExam
      ? 'Loading final exam...'
      : nextItemIsProject
        ? 'Loading your project day...'
        : 'Loading next day...')
  const nextDayStatusDetail = generatingNext
    ? (nextRowIsFinalExam
      ? 'Building the comprehensive finish test and pulling it into your dashboard now.'
      : nextItemIsProject
        ? 'Setting up the dedicated project day for this module and pulling it into your dashboard now.'
        : 'Building the next mission and pulling it into your dashboard now.')
    : (nextRowIsFinalExam
      ? 'Switching you into the comprehensive course finish test.'
      : nextItemIsProject
        ? 'Switching you into the dedicated module project day.'
        : 'Switching you into the next day\'s unfinished tasks.')
  const nextDayCtaLabel = nextRowIsFinalExam
    ? 'Start final exam →'
    : nextItemIsProject
      ? `Start ${nextSequenceKind === 'full_project' ? 'module project' : 'mini-project'} →`
      : 'Start next day →'

  const doneRows   = allRows.filter(r => r.completion_status === 'completed').length
  const totalRows  = allRows.length
  const shortGoalText = goal?.goal_text
    ? (goal.goal_text.length > 20 ? `${goal.goal_text.slice(0, 20)}…` : goal.goal_text)
    : 'Your path'
  const totalMins  = allRows.reduce((acc,r) => {
    const t = Array.isArray(r.tasks)?r.tasks:[]
    return acc + t.filter(tk => tk.completed).reduce((s, tk) => s + (Number(tk.estimatedTimeMin || tk.durationMin) || 0), 0)
  }, 0)
  const weekDays   = allRows.slice(-7).filter(r=>r.completion_status==='completed').length
  const dayNumber  = todayRow?.day_number || 1
  const nextActionTask = visibleTasks.find((task) => !task.completed && !task._locked) || null
  const focusProgress = useMemo(() => {
    const progressTasks = visibleTasks.length > 0 ? visibleTasks : tasks
    const completed = progressTasks.filter((task) => task.completed).length
    const total = progressTasks.length
    return {
      completed,
      total,
      ratio: total > 0 ? Math.min(1, completed / total) : 0,
    }
  }, [tasks, visibleTasks])
  const handleContinueToday = useCallback(() => {
    const targetId = showP5MissionSurface ? 'today-mission-surface' : 'today-task-list'
    const target = typeof document !== 'undefined' ? document.getElementById(targetId) : null
    if (target) {
      target.scrollIntoView({ behavior:'smooth', block:'center' })
      return
    }
    handleTabSelect('home')
  }, [handleTabSelect, showP5MissionSurface])
  const commandActions = useMemo(() => {
    const actions = []
    const add = (action) => actions.push(action)

    if (nextActionTask) {
      const info = getTaskDisplayConfig(nextActionTask)
      const style = taskStyle(nextActionTask)
      add({
        id:'continue-next-task',
        group:'Start',
        label:`Continue ${nextActionTask.title || 'next task'}`,
        meta:'Open the next unfinished mission item',
        icon:info.icon || 'rocket',
        accent:style.color,
        pill:`+${xpForTask(nextActionTask)} XP`,
        keywords:['continue','start','today','task','mission'],
        run:() => setPreviewTask(nextActionTask),
      })
    }

    if (showInlineNextDayCTA && !nextDayBusy) {
      add({
        id:'start-next-day',
        group:'Start',
        label:nextDayCtaLabel.replace(' →', ''),
        meta:'Move your course forward',
        icon:nextRowIsFinalExam ? 'award' : 'rocket',
        accent:T.teal,
        keywords:['next','tomorrow','day','continue','course'],
        run:handleStartNextDay,
      })
    }

    DASHBOARD_NAV_ITEMS.forEach((item) => {
      add({
        id:`tab-${item.key}`,
        group:'Navigate',
        label:item.label,
        meta:item.meta,
        icon:item.icon,
        accent:item.key === activeTab ? T.teal : T.textSec,
        keywords:[item.key,item.label,item.meta],
        run:() => handleTabSelect(item.key),
      })
    })

    add({
      id:'switch-goal',
      group:'Workspace',
      label:'Switch goal',
      meta:'Open your goal drawer',
      icon:'goal',
      accent:T.teal,
      keywords:['goal','drawer','course'],
      run:() => setShowGoalsSidebar(true),
    })
    add({
      id:'new-goal',
      group:'Workspace',
      label:'Start a new goal',
      meta:'Create another learning path',
      icon:'plus',
      accent:T.mastery,
      keywords:['goal','new','onboarding'],
      run:() => router.push('/onboarding'),
    })
    add({
      id:'portfolio',
      group:'Workspace',
      label:'Portfolio',
      meta:'Review completed projects and proof',
      icon:'briefcase',
      accent:T.mastery,
      keywords:['portfolio','projects','proof'],
      run:() => router.push('/portfolio'),
    })
    add({
      id:'practice-gallery',
      group:'Workspace',
      label:'Practice gallery',
      meta:'Open generated practice experiences',
      icon:'library',
      accent:T.amber,
      keywords:['practice','gallery'],
      run:() => router.push('/practice-gallery'),
    })
    add({
      id:'path-preview-overlay',
      group:'Workspace',
      label:'Open path preview',
      meta:'See the experimental path map',
      icon:'map',
      accent:T.teal,
      keywords:['path','preview','map'],
      run:() => setShowPathView(true),
    })
    add({
      id:'path-view-2',
      group:'Workspace',
      label:'Open Path View 2',
      meta:'Try the alternate course map',
      icon:'map',
      accent:T.amber,
      keywords:['path','preview','map','alternate'],
      run:() => router.push('/path-view-2'),
    })
    add({
      id:'path-view-3',
      group:'Workspace',
      label:'Open Path View 3',
      meta:'Try the course-style map',
      icon:'map',
      accent:T.blue,
      keywords:['path','preview','map','course'],
      run:() => router.push('/path-view-3'),
    })
    add({
      id:'dev-generated-project',
      group:'Workspace',
      label:'Open dev project',
      meta:'Generate a test project flow',
      icon:'folder_kanban',
      accent:T.mastery,
      keywords:['dev','project','test'],
      run:openDevGeneratedProject,
    })

    if (isComeback && freezeCount > 0 && !freezing) {
      add({
        id:'use-streak-freeze',
        group:'Protect',
        label:'Use streak freeze',
        meta:`${freezeCount} available`,
        icon:'shield',
        accent:T.flame,
        keywords:['streak','freeze','protect'],
        run:handleFreeze,
      })
    }

    return actions
  }, [
    activeTab,
    freezeCount,
    freezing,
    handleFreeze,
    handleStartNextDay,
    handleTabSelect,
    isComeback,
    nextActionTask,
    nextDayBusy,
    nextDayCtaLabel,
    nextRowIsFinalExam,
    openDevGeneratedProject,
    router,
    showInlineNextDayCTA,
  ])
  // ─── Loading state ─────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{...pageThemeStyle,minHeight:'100vh',fontFamily:T.font,padding:'0 20px'}}>
      <style>{KEYFRAMES}</style>
      <div style={{height:64,display:'flex',alignItems:'center',gap:12,
        borderBottom:`1px solid ${T.border}`,marginBottom:16}}>
        <Skeleton w={160} h={14} r={6}/><div style={{marginLeft:'auto',display:'flex',gap:8}}>
        <Skeleton w={48} h={28} r={9999}/><Skeleton w={64} h={28} r={9999}/></div>
      </div>
      <Skeleton h={64} r={14} mb={12}/>
      <Skeleton h={130} r={22} mb={12}/>
      <Skeleton h={52} r={10} mb={12}/>
      {[0,1,2].map(i => <Skeleton key={i} h={110} r={18} mb={10}/>)}
    </div>
  )

  // ─── No goal state ─────────────────────────────────────────────────────────
  if (!goal) return (
    <div style={{...pageThemeStyle,minHeight:'100vh',display:'grid',placeItems:'center',
      fontFamily:T.font,padding:24}}>
      <style>{KEYFRAMES}</style>
      <div style={{textAlign:'center'}}>
        <div style={{
          width:64,height:64,margin:'0 auto 16px',borderRadius:22,
          display:'flex',alignItems:'center',justifyContent:'center',
          background:'rgba(14,245,194,0.08)',border:`1px solid ${T.tealBorder}`,color:T.teal,
        }}>
          <IconGlyph name="goal" size={28} strokeWidth={2.3}/>
        </div>
        <p style={{color:T.textSec,marginBottom:20,fontSize:15}}>No active goal yet.</p>
        <button onClick={() => router.push('/onboarding')} style={{
          padding:'14px 32px', background:T.primaryGradient,
          border:'none', borderRadius:14, color:T.ink,
          fontWeight:800, fontSize:15, cursor:'pointer', fontFamily:T.font,
          boxShadow:'0 0 32px rgba(14,245,194,0.28)',
        }}>Set a Goal</button>
      </div>
    </div>
  )

  // ─── Main render ───────────────────────────────────────────────────────────
  return (
    <div style={themeVars}>
      <style>{KEYFRAMES}</style>
      <DashboardCommandMenu
        open={commandOpen}
        query={commandQuery}
        onQueryChange={setCommandQuery}
        actions={commandActions}
        onClose={() => setCommandOpen(false)}
      />

      {/* ── Path View overlay ── */}
      {showPathView && (
        <PathViewOverlay onClose={() => setShowPathView(false)} />
      )}

      {/* ── Path View toggle buttons ── */}
      {showDeveloperShortcuts && !showPathView && activeTab === 'home' && !showLesson && !previewTask && (
        <div
          className="dashboard-quick-actions"
          style={{
            position:'fixed',
            right:16,
            bottom:88,
            zIndex:400,
            display:'flex',
            flexDirection:'column',
            alignItems:'flex-end',
            gap:8,
            animation:'pathTogglePop 0.45s cubic-bezier(0.34,1.3,0.64,1) both',
          }}
        >
          {[
            { label: 'Path View', href: '/path-view', tone: 'teal' },
            { label: 'Path View 2', href: '/path-view-2', tone: 'paper' },
            { label: 'pathView 3', href: '/path-view-3', tone: 'course' },
            { label: 'Practice Gallery', href: '/practice-gallery', tone: 'practice' },
            { label: 'Dev Project', onClick: openDevGeneratedProject, tone: 'devProject' },
          ].map((item) => {
            const paper = item.tone === 'paper'
            const course = item.tone === 'course'
            const practice = item.tone === 'practice'
            const devProject = item.tone === 'devProject'
            const baseBg = paper
              ? 'linear-gradient(135deg,rgba(255,255,255,0.92),rgba(238,238,235,0.92))'
              : course
                ? 'linear-gradient(135deg,rgba(0,86,210,0.96),rgba(31,112,255,0.94))'
                : practice
                  ? 'linear-gradient(135deg,rgba(250,204,21,0.92),rgba(14,245,194,0.90))'
                  : devProject
                    ? 'linear-gradient(135deg,rgba(236,72,153,0.95),rgba(168,85,247,0.92))'
              : 'linear-gradient(135deg,rgba(14,245,194,0.15),rgba(99,102,241,0.18))'
            const hoverBg = paper
              ? 'linear-gradient(135deg,rgba(255,255,255,1),rgba(229,229,226,1))'
              : course
                ? 'linear-gradient(135deg,rgba(0,74,178,1),rgba(0,105,255,1))'
                : practice
                  ? 'linear-gradient(135deg,rgba(255,214,52,1),rgba(28,255,207,1))'
                  : devProject
                    ? 'linear-gradient(135deg,rgba(244,114,182,1),rgba(192,132,252,1))'
              : 'linear-gradient(135deg,rgba(14,245,194,0.22),rgba(99,102,241,0.26))'
            return (
              <button
                key={item.href || item.label}
                onClick={() => item.onClick ? item.onClick() : router.push(item.href)}
                style={{
                  display:'flex',
                  alignItems:'center',
                  gap:7,
                  padding:'10px 16px',
                  background:baseBg,
                  border:paper
                    ? '1px solid rgba(20,20,20,0.18)'
                    : course
                      ? '1px solid rgba(145,190,255,0.55)'
                      : practice
                        ? '1px solid rgba(255,255,255,0.36)'
                        : devProject
                          ? '1px solid rgba(255,255,255,0.28)'
                      : '1px solid rgba(14,245,194,0.35)',
                  borderRadius:9999,
                  color:paper ? '#1f1f1f' : course ? '#fff' : practice ? '#071510' : devProject ? '#fff' : T.teal,
                  fontSize:12,
                  fontWeight:800,
                  fontFamily:T.font,
                  cursor:'pointer',
                  backdropFilter:'blur(20px)',
                  WebkitBackdropFilter:'blur(20px)',
                  boxShadow:paper
                    ? '0 4px 18px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.40)'
                    : course
                      ? '0 4px 20px rgba(0,86,210,0.30), 0 0 0 1px rgba(255,255,255,0.12)'
                      : practice
                        ? '0 4px 20px rgba(14,245,194,0.22), 0 0 0 1px rgba(250,204,21,0.20)'
                        : devProject
                          ? '0 4px 20px rgba(236,72,153,0.26), 0 0 0 1px rgba(255,255,255,0.12)'
                    : '0 4px 20px rgba(14,245,194,0.18), 0 0 0 1px rgba(14,245,194,0.08)',
                  letterSpacing:'0.3px',
                  transition:'all 0.20s cubic-bezier(0.16,1,0.3,1)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background=hoverBg
                  e.currentTarget.style.transform='scale(1.05)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background=baseBg
                  e.currentTarget.style.transform='scale(1)'
                }}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  {paper ? (
                    <>
                      <path d="M5 4h14"/>
                      <path d="M5 9h14"/>
                      <path d="M5 14h10"/>
                      <path d="M5 19h7"/>
                    </>
                  ) : course ? (
                    <>
                      <path d="M4 6.5h16"/>
                      <path d="M6 6.5v12h12v-12"/>
                      <path d="M9 10h6"/>
                      <path d="M9 14h4"/>
                    </>
                  ) : practice ? (
                    <>
                      <path d="M4 7h16"/>
                      <path d="M4 12h10"/>
                      <path d="M4 17h16"/>
                      <path d="M18 10l2 2-2 2"/>
                    </>
                  ) : devProject ? (
                    <>
                      <path d="M4 16.5V20h3.5"/>
                      <path d="M20 7.5V4h-3.5"/>
                      <path d="M5 19l5.5-5.5"/>
                      <path d="M19 5l-5.5 5.5"/>
                      <path d="M12 8l4 4-4 4-4-4 4-4z"/>
                    </>
                  ) : (
                    <>
                      <circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="13"/>
                      <circle cx="12" cy="16" r="3"/><line x1="12" y1="19" x2="12" y2="21"/>
                    </>
                  )}
                </svg>
                {item.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Goals sidebar */}
      {showGoalsSidebar && (
        <>
          {/* Backdrop */}
          <div onClick={() => setShowGoalsSidebar(false)} style={{
            position:'fixed',inset:0,zIndex:200,
            background:'rgba(0,0,0,0.55)',backdropFilter:'blur(4px)',
            animation:'fadeInBg 0.20s ease',
          }}/>
          {/* Panel */}
          <div style={{
            position:'fixed',top:0,left:0,bottom:0,zIndex:201,
            width:Math.min(320, window.innerWidth * 0.85),
            background:'rgba(10,10,20,0.98)',
            borderRight:'1px solid rgba(255,255,255,0.08)',
            display:'flex',flexDirection:'column',
            animation:'slideInLeft 0.25s cubic-bezier(0.16,1,0.3,1)',
            fontFamily:T.font,
          }}>
            {/* Header */}
            <div style={{
              padding:'20px 20px 16px',
              borderBottom:'1px solid rgba(255,255,255,0.07)',
              display:'flex',alignItems:'center',justifyContent:'space-between',
            }}>
              <div>
                <div style={{fontSize:16,fontWeight:800,color:T.text}}>My Goals</div>
                <div style={{fontSize:11,color:T.textMuted,marginTop:2}}>
                  {allGoals.length} goal{allGoals.length !== 1 ? 's' : ''}
                </div>
              </div>
              <button onClick={() => setShowGoalsSidebar(false)} style={{
                background:'rgba(255,255,255,0.06)',border:'none',
                width:30,height:30,borderRadius:'50%',
                display:'flex',alignItems:'center',justifyContent:'center',
                cursor:'pointer',color:T.textSec,fontSize:18,fontFamily:T.font,
              }}>×</button>
            </div>

            {/* Goal list */}
            <div style={{flex:1,overflowY:'auto',padding:'12px 12px'}}>
              {allGoals.map(g => {
                const isActive = g.id === goal?.id
                const isSwitching = switchingGoal === g.id
                return (
                  <button key={g.id} onClick={() => switchGoal(g.id)} disabled={isSwitching} style={{
                    width:'100%',marginBottom:8,padding:'14px 14px',
                    background: isActive ? 'rgba(14,245,194,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isActive ? T.tealBorder : 'rgba(255,255,255,0.07)'}`,
                    borderRadius:14,cursor: isActive ? 'default' : 'pointer',
                    textAlign:'left',fontFamily:T.font,
                    display:'flex',alignItems:'center',gap:12,
                    opacity: isSwitching ? 0.6 : 1,
                    transition:'opacity 0.15s',
                  }}>
                    <div style={{
                      width:10,height:10,borderRadius:'50%',flexShrink:0,
                      background: isActive ? T.teal : g.status === 'completed' ? T.mastery : 'rgba(255,255,255,0.15)',
                      boxShadow: isActive ? `0 0 8px ${T.teal}` : 'none',
                    }}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{
                        fontSize:13,fontWeight:700,
                        color: isActive ? T.teal : T.text,
                        whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',
                      }}>{g.goal_text}</div>
                      <div style={{fontSize:10,color:T.textMuted,marginTop:2,textTransform:'uppercase',letterSpacing:'0.6px'}}>
                        {isActive ? 'Active' : g.status === 'completed' ? 'Completed' : 'Paused'}
                        {g.mode ? ` · ${g.mode}` : ''}
                      </div>
                    </div>
                    {isActive && (
                      <span style={{fontSize:10,fontWeight:700,color:T.ink,
                        background:T.teal,padding:'2px 8px',borderRadius:9999,flexShrink:0}}>
                        NOW
                      </span>
                    )}
                    {isSwitching && (
                      <div style={{width:14,height:14,borderRadius:'50%',flexShrink:0,
                        border:`2px solid ${T.teal}`,borderTopColor:'transparent',
                        animation:'spin 0.7s linear infinite'}}/>
                    )}
                  </button>
                )
              })}
            </div>

            {/* New goal CTA */}
            <div style={{padding:'12px 12px',borderTop:'1px solid rgba(255,255,255,0.07)'}}>
              <button onClick={() => { setShowGoalsSidebar(false); router.push('/onboarding') }} style={{
                width:'100%',padding:'13px',
                background:T.primaryGradient,
                border:'none',borderRadius:14,
                color:T.ink,fontWeight:800,fontSize:14,
                cursor:'pointer',fontFamily:T.font,
                boxShadow:'0 0 24px rgba(14,245,194,0.25)',
              }}>+ New Goal</button>
            </div>
          </div>
        </>
      )}

      {/* XP toasts */}
      {xpToasts.map(t => <XPToast key={t.id} {...t} onDone={removeXpToast}/>)}

      {/* Module mastery + utility toasts */}
      {moduleRewardToasts.length > 0 && (
        <div style={{
          position:'fixed',
          top:92,
          right:16,
          zIndex:9400,
          display:'flex',
          flexDirection:'column',
          gap:10,
          width:'min(320px, calc(100vw - 32px))',
          pointerEvents:'none',
        }}>
          {moduleRewardToasts.map((toast) => {
            const isReward = Number.isFinite(Number(toast.rewardAmount)) && Number(toast.rewardAmount) > 0
            return (
              <div key={toast.id} style={{
                borderRadius:18,
                border:`1px solid ${isReward ? 'rgba(251,191,36,0.24)' : T.tealBorder}`,
                background:isReward
                  ? 'linear-gradient(145deg, rgba(251,191,36,0.12), rgba(255,255,255,0.06))'
                  : 'rgba(6,6,15,0.88)',
                boxShadow:isReward
                  ? '0 20px 38px rgba(251,191,36,0.14)'
                  : '0 18px 34px rgba(0,0,0,0.28)',
                padding:'14px 16px',
                backdropFilter:'blur(18px)',
                WebkitBackdropFilter:'blur(18px)',
                animation:'fadeUp 0.24s ease both',
                pointerEvents:'auto',
              }}>
                <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                  <div style={{
                    width:38,height:38,borderRadius:14,flexShrink:0,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    background:isReward ? 'rgba(251,191,36,0.14)' : 'rgba(14,245,194,0.10)',
                    border:`1px solid ${isReward ? 'rgba(251,191,36,0.22)' : T.tealBorder}`,
                    color:isReward ? T.amber : T.teal,
                  }}>
                    <IconGlyph name={isReward ? 'gem' : 'shield_check'} size={18} strokeWidth={2.4} color={isReward ? T.amber : T.teal}/>
                  </div>
                  <div style={{minWidth:0,flex:1}}>
                    <div style={{
                      fontSize:11,
                      fontWeight:900,
                      letterSpacing:'0.12em',
                      textTransform:'uppercase',
                      color:isReward ? T.amber : T.teal,
                      marginBottom:5,
                    }}>
                      {isReward ? 'Module mastery' : 'Path update'}
                    </div>
                    <div style={{fontSize:14,fontWeight:800,color:T.text,lineHeight:1.35,marginBottom:4}}>
                      {toast.title || 'Update'}
                    </div>
                    {toast.message && (
                      <div style={{fontSize:12,color:T.textSec,lineHeight:1.5}}>
                        {toast.message}
                      </div>
                    )}
                    {isReward && (
                      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginTop:6}}>
                        <span style={{fontSize:12,fontWeight:800,color:T.amber}}>+{toast.rewardAmount} gems</span>
                        {toast.identityLabel && (
                          <span style={{
                            display:'inline-flex',alignItems:'center',gap:6,
                            padding:'4px 8px',borderRadius:9999,
                            background:'rgba(255,255,255,0.06)',border:`1px solid ${T.border}`,
                            fontSize:10,fontWeight:900,color:T.textSec,letterSpacing:'0.08em',textTransform:'uppercase',
                          }}>
                            <IconGlyph name="badge" size={11} strokeWidth={2.2} color={T.amber}/>
                            {toast.identityLabel}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Level-up banner */}
      {levelUpData && <LevelUpBanner data={levelUpData} onDismiss={() => setLevelUpData(null)}/>}

      <MissionConfettiBurst active={showMissionConfetti}/>

      <CourseCompleteOverlay
        data={courseCompleteData}
        onDismiss={() => setCourseCompleteData(null)}
        onOpenPortfolio={() => {
          setCourseCompleteData(null)
          router.push('/portfolio')
        }}
      />

      {/* Treasure Chest */}
      {chestReward && (
        <TreasureChest
          reward={chestReward}
          onClaim={(reward) => {
            // Gems already included in newGemTotal from server — only animate
            if (reward.type === 'gems') {
              setGemPulse(true)
              setTimeout(() => setGemPulse(false), 400)
              setGemToasts(prev => [...prev, { id: Date.now() + 3, amount: reward.amount }])
            } else if (reward.type === 'streakFreeze') {
              setFreezeCount(f => f + 1)
            } else if (reward.type === 'xpBoost') {
              setXpBoostUntil(new Date(Date.now() + 15 * 60 * 1000))
            }
            setChestReward(null)
          }}
        />
      )}

      {/* Badge earned toasts */}
      {badgeToasts.length > 0 && (
        <div style={{ position:'fixed', top:80, left:'50%', transform:'translateX(-50%)', zIndex:9500, display:'flex', flexDirection:'column', gap:10, alignItems:'center', pointerEvents:'none' }}>
          {badgeToasts.map((badge, i) => (
            <div key={badge.id + i} style={{
              padding:'14px 22px', borderRadius:18,
              background:'rgba(6,6,15,0.92)', backdropFilter:'blur(20px)',
              border:`1.5px solid ${RARITY_COLORS[badge.rarity] || '#0ef5c2'}40`,
              boxShadow:`0 0 30px ${RARITY_COLORS[badge.rarity] || '#0ef5c2'}20`,
              display:'flex', alignItems:'center', gap:14,
              animation:'badgeSlideIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
              animationDelay:`${i * 0.15}s`,
              pointerEvents:'auto', cursor:'pointer', fontFamily:T.font,
            }} onClick={() => setBadgeToasts(prev => prev.filter((_, j) => j !== i))}>
              <div style={{
                width:38,height:38,borderRadius:12,
                display:'flex',alignItems:'center',justifyContent:'center',
                background:`${RARITY_COLORS[badge.rarity] || '#0ef5c2'}12`,
                color:RARITY_COLORS[badge.rarity] || '#0ef5c2',
                flexShrink:0,
              }}>
                <IconGlyph name={badge.icon} size={20} strokeWidth={2.3}/>
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:800, color:RARITY_COLORS[badge.rarity] || '#0ef5c2', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:2 }}>
                  Badge Earned!
                </div>
                <div style={{ fontSize:16, fontWeight:800, color:'#f5f5f7' }}>{badge.name}</div>
                <div style={{ fontSize:12, color:'#8e8e93', marginTop:2 }}>{badge.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* XP Boost Event overlay */}
      {showBoostEvent && (
        <div style={{
          position:'fixed',inset:0,zIndex:500,
          background:'rgba(0,0,0,0.75)',backdropFilter:'blur(12px)',
          display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',
          animation:'fadeInBg 0.2s ease both',fontFamily:T.font,
        }} onClick={() => setShowBoostEvent(false)}>
        <div style={{
            width:72,height:72,marginBottom:16,borderRadius:24,
            display:'flex',alignItems:'center',justifyContent:'center',
            background:'rgba(251,191,36,0.12)',color:'#FBBF24',
            animation:'checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1)',
          }}><IconGlyph name="bolt" size={34} strokeWidth={2.3}/></div>
          <div style={{
            fontSize:28,fontWeight:900,
            background:T.highlightGradient,
            WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
            backgroundClip:'text',
            animation:'levelPop 0.5s 0.15s cubic-bezier(0.34,1.3,0.64,1) both',
            marginBottom:8,
          }}>DOUBLE XP ACTIVATED!</div>
          <div style={{
            fontSize:16,fontWeight:700,color:T.textSec,
            animation:'fadeUp 0.4s 0.3s ease both',
          }}>15:00 remaining</div>
        </div>
      )}

      {/* Task preview modal */}
      {previewTask && (
        <TaskPreview
          task={previewTask}
          isCompleting={completing}
          rerollingTaskId={rerollingTaskId}
          rerollCount={inventoryCounts.taskReroll || 0}
          onClose={() => setPreviewTask(null)}
          onStart={t => {
            const lockState = getTaskLockState(t, tasks)
            if (lockState.locked) {
              setError(lockState.reason)
              return
            }
            setPreviewTask(null)
            if (heartsRemaining === 0) { setShowNoHearts(true); return }
            const normalizedPreviewTask = normalizeLearningTask(t)
            setShowLesson(normalizeLearningTask({
              ...normalizedPreviewTask,
              _concept: normalizedPreviewTask._concept || todayRow?.covered_topics?.[0] || normalizedPreviewTask.title,
            }))
          }}
          onComplete={(t, e) => {
            setPreviewTask(null)
            completeTask(t, e)
          }}
          onReroll={(t) => {
            setPreviewTask(null)
            handleTaskReroll(t)
          }}
        />
      )}

      {/* No-hearts overlay removed (hearts/gamification gone — lessons have unlimited retries) */}
      {false && showNoHearts && (
        <NoHeartsOverlay
          refillAt={heartsRefillAt}
          onClose={() => setShowNoHearts(false)}
          onPractice={() => { setShowNoHearts(false) }}
        />
      )}

      {/* Task viewer — routed by canonical task family */}

      {activeViewerTask && activeViewerDomainTaskType && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--theme-bg)', overflowY: 'auto' }}>
          <div style={{ position: 'sticky', top: 0, zIndex: 4, height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', background: 'var(--theme-chrome)', borderBottom: `1px solid ${T.border}`, backdropFilter: 'blur(18px)' }}>
            <button
              onClick={() => setShowLesson(null)}
              className="interactive-button"
              style={{ border: `1px solid ${T.border}`, background: T.surface, color: T.text, borderRadius: 10, padding: '9px 12px', fontWeight: 900, cursor: 'pointer' }}
            >
              Close
            </button>
            <span style={{ color: T.textMuted, fontSize: 12, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {storedViewerTaskIsInvalidCode ? getDomainTaskLabel(activeViewerDomainTaskType) : (activeViewerTask.domainTaskLabel || getDomainTaskLabel(activeViewerDomainTaskType))}
            </span>
          </div>
          <DomainTaskBase
            taskType={activeViewerDomainTaskType}
            domain={activeViewerPracticeDomain}
            topic={activeViewerTask._concept || activeViewerTask.title}
            goal={goal?.goal_text}
            taskTitle={activeViewerTask.title}
            lessonContent={[activeViewerTask.description, activeViewerTask.action, activeViewerTask.outcome].filter(Boolean).join('\n')}
            userLevel={activeViewerTask._learningContract?.learnerProfile?.level || activeViewerTask.learningContract?.learnerProfile?.level || xpDisplay?.level || 'beginner'}
            onComplete={(payload) => handleLessonComplete(activeViewerTask, payload)}
          />
        </div>
      )}

      {activeViewerTask && activeViewerType === 'concept' && (
        <LessonViewer
          concept={activeViewerTask._concept || activeViewerTask.title}
          taskTitle={activeViewerTask.title}
          goal={goal?.goal_text}
          knowledge={goalKnowledge}
          lessonKey={`${goal?.id || 'g'}::${activeViewerTask.id || activeViewerTask.title}`}
          sourceTask={activeViewerTask}
          domain={activeDomain}
          domainConfig={activeDomainConfig}
          aiMode={activeViewerTask._aiMode || 'hint'}
          onClose={() => setShowLesson(null)}
          onComplete={(payload) => handleLessonComplete(activeViewerTask, payload)}
          onHeartLost={handleHeartLost}
        />
      )}
      {activeViewerTask && !activeViewerDomainTaskType && activeViewerType === 'guided_practice' && activeViewerPresentation === 'exercise' && (
        <ProjectView
          task={activeViewerTask}
          goal={goal?.goal_text}
          knowledge={goalKnowledge}
          domain={activeDomain}
          domainConfig={activeDomainConfig}
          onClose={() => setShowLesson(null)}
          onComplete={(payload) => handleLessonComplete(activeViewerTask, payload)}
        />
      )}
      {activeViewerTask && !activeViewerDomainTaskType && activeViewerType === 'guided_practice' && activeViewerPresentation !== 'exercise' && (
        <GuidedPracticeView
          task={activeViewerTask}
          goal={goal?.goal_text}
          knowledge={goalKnowledge}
          domain={activeDomain}
          domainConfig={activeDomainConfig}
          onClose={() => setShowLesson(null)}
          onComplete={(payload) => handleLessonComplete(activeViewerTask, payload)}
        />
      )}
      {activeViewerTask && !activeViewerDomainTaskType && activeViewerType === 'challenge' && (
        <ChallengeView
          task={activeViewerTask}
          goal={goal?.goal_text}
          knowledge={goalKnowledge}
          domain={activeDomain}
          domainConfig={activeDomainConfig}
          onClose={() => setShowLesson(null)}
          onComplete={(payload) => handleLessonComplete(activeViewerTask, payload)}
        />
      )}
      {activeViewerTask && !activeViewerDomainTaskType && activeViewerType === 'explain' && (
        <AIInteractionView
          task={activeViewerTask}
          goal={goal?.goal_text}
          knowledge={goalKnowledge}
          domain={activeDomain}
          domainConfig={activeDomainConfig}
          onClose={() => setShowLesson(null)}
          onComplete={(payload) => handleLessonComplete(activeViewerTask, payload)}
        />
      )}
      {activeViewerTask && !activeViewerDomainTaskType && activeViewerType === 'recall' && activeViewerPresentation === 'flashcard' && (
        <FlashcardView
          task={activeViewerTask}
          goal={goal?.goal_text}
          knowledge={goalKnowledge}
          domain={activeDomain}
          domainConfig={activeDomainConfig}
          onClose={() => setShowLesson(null)}
          onComplete={(payload) => handleLessonComplete(activeViewerTask, payload)}
        />
      )}
      {activeViewerTask && !activeViewerDomainTaskType && ['quiz', 'recall', 'final_exam'].includes(activeViewerType) && !(activeViewerType === 'recall' && activeViewerPresentation === 'flashcard') && (
        <MultiQuizView
          task={activeViewerTask}
          goal={goal?.goal_text}
          knowledge={goalKnowledge}
          domain={activeDomain}
          domainConfig={activeDomainConfig}
          onClose={() => setShowLesson(null)}
          onComplete={(payload) => handleLessonComplete(activeViewerTask, payload)}
        />
      )}
      {activeViewerTask && activeViewerType === 'reflect' && (
        <ReflectionView
          task={activeViewerTask}
          goal={goal?.goal_text}
          knowledge={goalKnowledge}
          domain={activeDomain}
          domainConfig={activeDomainConfig}
          onClose={() => setShowLesson(null)}
          onComplete={(payload) => handleLessonComplete(activeViewerTask, payload)}
        />
      )}
      {activeViewerTask && activeViewerType === 'boss' && (
        <BossChallengeView
          task={activeViewerTask}
          goal={goal?.goal_text}
          knowledge={goalKnowledge}
          domain={activeDomain}
          domainConfig={activeDomainConfig}
          onClose={() => setShowLesson(null)}
          onComplete={(payload) => handleLessonComplete(activeViewerTask, payload)}
        />
      )}
      {activeViewerTask && activeViewerType === 'project' && (
        <ProjectViewer
          task={activeViewerTask}
          goal={goal?.goal_text}
          knowledge={goalKnowledge}
          domain={activeDomain}
          domainConfig={activeDomainConfig}
          goalId={goal?.id}
          autoGenerateMode={activeViewerTask?._devAutoProjectMode || null}
          onClose={() => setShowLesson(null)}
          onComplete={(payload) => handleLessonComplete(activeViewerTask, payload)}
        />
      )}
      {activeViewerTask && !['concept', 'guided_practice', 'challenge', 'explain', 'quiz', 'recall', 'reflect', 'boss', 'project', 'final_exam'].includes(activeViewerType) && (
        <LessonViewer
          concept={activeViewerTask._concept || activeViewerTask.title}
          taskTitle={activeViewerTask.title}
          goal={goal?.goal_text}
          knowledge={goalKnowledge}
          lessonKey={`${goal?.id || 'g'}::${activeViewerTask.id || activeViewerTask.title}`}
          sourceTask={activeViewerTask}
          domain={activeDomain}
          domainConfig={activeDomainConfig}
          aiMode={activeViewerTask._aiMode || 'hint'}
          onClose={() => setShowLesson(null)}
          onComplete={(payload) => handleLessonComplete(activeViewerTask, payload)}
          onHeartLost={handleHeartLost}
        />
      )}

      {/* ── Practice Round interstitial (concept tasks only) ── */}
      {practiceRoundTask && (
        <PracticeRound
          taughtPoints={practiceRoundTask.task?._learningContract?.taughtPoints || []}
          learningContract={practiceRoundTask.task?._learningContract || null}
          goalId={goal?.id}
          previousConcepts={[]}
          onComplete={(practiceMetrics) => {
            const { task, metrics } = practiceRoundTask
            setPracticeRoundTask(null)
            setTimeout(() => completeTask(task, null, { ...metrics, practiceScore: practiceMetrics?.score, practiceXp: practiceMetrics?.xp }), 80)
          }}
          onSkip={() => {
            const { task, metrics } = practiceRoundTask
            setPracticeRoundTask(null)
            setTimeout(() => completeTask(task, null, metrics), 80)
          }}
        />
      )}

      <div className="dashboard-lovable-reference" style={{...pageThemeStyle,minHeight:'100vh',fontFamily:T.font,paddingBottom:90}}>

        {/* ── Sticky top bar ── */}
        <div style={{
          position:'sticky',top:0,zIndex:60,
          background:T.chrome,
          backdropFilter:'blur(28px) saturate(200%)',
          WebkitBackdropFilter:'blur(28px) saturate(200%)',
          borderBottom:`1px solid ${T.border}`,
        }} className="safe-top-shell">
          <div className="dashboard-top-inner" style={{height:58,
            display:'flex',alignItems:'center',gap:12,padding:'0 16px',justifyContent:'space-between'}}>
            <button onClick={() => setShowGoalsSidebar(true)} className="dashboard-brand-button interactive-icon" style={{
              minWidth:0,maxWidth:'min(280px,52vw)',background:'none',border:'none',
              cursor:'pointer',fontFamily:T.font,textAlign:'left',padding:0,
              display:'flex',alignItems:'center',gap:10,
              minHeight:44,
            }}>
              <PathBoltLogo />
              <div style={{minWidth:0}}>
                <div style={{
                  fontSize:20,fontWeight:950,color:T.text,
                  letterSpacing:'-0.04em',
                  whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',
                  display:'flex',alignItems:'center',gap:7,
                }}>
                  PathAI
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="dashboard-command-trigger interactive-secondary"
            >
              <IconGlyph name="compass" size={16} strokeWidth={2.35} color={T.teal}/>
              <span style={{fontSize:13,fontWeight:850,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                Find anything
              </span>
            </button>

            <div style={{display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
              {/* gamification pills (gems / hearts / streak) removed */}

              <button onClick={() => handleTabSelect('settings')} className="interactive-icon" style={{
                display:'flex',alignItems:'center',justifyContent:'center',
                width:28,height:28,padding:0,background:'none',border:'none',
                cursor:'pointer',fontFamily:T.font,
                minHeight:44,
                minWidth:44,
              }}>
                <MiniProgressRing
                  size={24}
                  value={xpDisplay.xpInLevel}
                  total={xpDisplay.xpForLevel}
                  stroke="var(--theme-mastery)"
                  track="rgba(129,140,248,0.12)"
                  label={xpDisplay.level}
                  labelColor="#fff"
                  textSize={9}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{maxWidth:600,margin:'8px auto 0',padding:'0 20px'}}>
            <div style={{
              background:'rgba(255,69,58,0.10)',border:'1px solid rgba(255,69,58,0.24)',
              borderRadius:12,padding:'10px 14px',
              display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,
            }}>
              <span style={{fontSize:13,color:T.red}}>{error}</span>
              <button onClick={() => setError('')}
                style={{background:'none',border:'none',color:T.red,cursor:'pointer',fontSize:16}}>×</button>
            </div>
          </div>
        )}

        <div className="dashboard-main-shell">
          <DashboardDesktopNav
            activeTab={activeTab}
            onSelect={handleTabSelect}
            onOpenCommand={() => setCommandOpen(true)}
            goalText={shortGoalText}
            dayNumber={dayNumber}
            focusProgress={focusProgress}
          />

          <main className="dashboard-main-content lovable-app">
        {/* ══════════════════════════════════════════════════════════════ */}
        {/* HOME TAB                                                       */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'home' && (
          <div className="shell-transition-fade learner-home-v2 lovable-app">
            <LovableHome
              goalTitle={shortGoalText}
              dayNumber={dayNumber}
              tasks={visibleTasks.map((task) => {
                const n = normalizeLearningTask(task)
                const info = getTaskDisplayConfig(n)
                return {
                  kind: n.domainTaskLabel || n.domainTaskType || info.chipLabel || 'Lesson',
                  title: n.title,
                  minutes: n.estimatedTimeMin || n.durationMin || 0,
                  xp: xpForTask(n),
                  done: Boolean(task.completed),
                  locked: Boolean(n._locked),
                  raw: task,
                }
              })}
              streak={streakData?.current || 0}
              gems={gems}
              level={xpDisplay?.level || 1}
              xpValue={xpDisplay?.xpInLevel || 0}
              onContinue={() => {
                const t = nextActionTask || visibleTasks.find((x) => !x.completed) || visibleTasks[0]
                if (t) setPreviewTask(t)
                else handleContinueToday()
              }}
              onViewPath={() => handleTabSelect('path')}
              onTaskClick={(rawTask) => { if (rawTask) setPreviewTask(rawTask) }}
            />
            {false && (<>
            <StaggerBlock index={0}>
              <TodayQuestHero
                goal={goal}
                todayRow={todayRow}
                tasks={tasks}
                visibleTasks={visibleTasks}
                dayNumber={dayNumber}
                focusProgress={focusProgress}
                showMissionSurface={showP5MissionSurface}
                missionLoading={missionFlowLoading}
                onContinue={handleContinueToday}
                onOpenPath={() => handleTabSelect('path')}
              />
            </StaggerBlock>

            <StaggerBlock index={1}>
              <DashboardStatRow
                xpDisplay={xpDisplay}
                streakData={streakData}
                gems={gems}
                tasks={tasks}
              />
            </StaggerBlock>

            {showP5MissionSurface ? (
              <StaggerBlock index={2}>
                <div id="today-mission-surface">
                {missionFlowLoading || !todayMission ? (
                  <div style={{maxWidth:860,margin:'18px auto 0',padding:'0 20px'}}>
                    <div style={{
                      border:`1px solid ${T.border}`,
                      borderRadius:24,
                      background:T.surface,
                      padding:'22px 24px',
                      color:T.textSec,
                      fontSize:14,
                      fontWeight:800,
                      display:'flex',
                      alignItems:'center',
                      gap:12,
                    }}>
                      <div style={{
                        width:18,
                        height:18,
                        borderRadius:'50%',
                        border:`2px solid ${T.teal}`,
                        borderTopColor:'transparent',
                        animation:'spin 0.7s linear infinite',
                      }}/>
                      Assembling today&apos;s mission...
                    </div>
                  </div>
                ) : (
                  <MissionRunner
                    mission={todayMission}
                    onCompleted={handleP5MissionCompleted}
                  />
                )}
                </div>
              </StaggerBlock>
            ) : (
              <StaggerBlock index={2}>
                <MissionHeroCard todayRow={todayRow} tasks={tasks} dayNumber={dayNumber}/>
              </StaggerBlock>
            )}

            {goal?.proof_target && (
              <StaggerBlock index={3}>
                <ProofTargetCard proofTarget={goal.proof_target}/>
              </StaggerBlock>
            )}

            {p5MissionEligible && (
              <StaggerBlock index={4}>
                <LearningStatusCard
                  status={learningStatus}
                  loading={learningStatusLoading}
                  missionCapable={p5MissionEligible}
                />
              </StaggerBlock>
            )}

            {boostTimeLeft > 0 && (
              <StaggerBlock index={5}>
                <div className="dashboard-support-shell" style={{maxWidth:920,margin:'0 auto',padding:'0 20px'}}>
                <div className="dashboard-boost-card" style={{
                  background:'linear-gradient(90deg,rgba(251,191,36,0.12),rgba(14,245,194,0.10),rgba(0,212,255,0.10))',
                  border:'1px solid rgba(251,191,36,0.22)',
                  borderRadius:18,padding:'14px 18px',
                  display:'flex',alignItems:'center',justifyContent:'space-between',
                  animation:'pulseActive 2s ease-in-out infinite',
                  boxShadow:'0 0 30px rgba(251,191,36,0.08)',
                }}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <IconGlyph name="bolt" size={16} strokeWidth={2.3} color="#FBBF24"/>
                    <span style={{fontSize:15,fontWeight:900,color:'#FBBF24'}}>Double XP is live</span>
                  </div>
                  <span style={{fontSize:15,fontWeight:900,color:'#FBBF24',fontFamily:T.fontMono}}>
                    {Math.floor(boostTimeLeft/60)}:{String(boostTimeLeft%60).padStart(2,'0')}
                  </span>
                </div>
                </div>
              </StaggerBlock>
            )}

            {/* ── Weekly Challenge ── */}
            {weeklyChallenge && (
              <StaggerBlock index={6}>
              <div className="dashboard-support-shell" style={{maxWidth:920,margin:'12px auto 0',padding:'0 20px'}}>
                <div className="dashboard-support-card dashboard-weekly-card" style={{
                  background: weeklyChallenge.completed
                    ? 'linear-gradient(135deg,rgba(255,215,0,0.12),rgba(251,191,36,0.06))'
                    : 'linear-gradient(135deg,var(--theme-primary-dim),rgba(0,212,255,0.04))',
                  border: `1.5px solid ${weeklyChallenge.completed ? 'rgba(255,215,0,0.30)' : T.tealBorder}`,
                  borderRadius:20,padding:'16px 18px',position:'relative',overflow:'hidden',
                }}>
                  {/* Animated gradient border overlay */}
                  {!weeklyChallenge.completed && (
                    <div style={{
                      position:'absolute',inset:-1,borderRadius:20,
                      background:'conic-gradient(from var(--chal-angle,0deg),transparent 60%,rgba(14,245,194,0.18) 80%,rgba(255,215,0,0.15) 90%,transparent 100%)',
                      animation:'chalBorderSpin 10s linear infinite',
                      pointerEvents:'none',zIndex:0,
                    }}/>
                  )}
                  <div style={{position:'relative',zIndex:1}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <IconGlyph name={weeklyChallenge.completed ? 'trophy' : 'challenge'} size={16} strokeWidth={2.3} color={weeklyChallenge.completed ? '#FFD700' : T.teal}/>
                        <span style={{fontSize:10,fontWeight:800,letterSpacing:'1.5px',
                          color:weeklyChallenge.completed ? '#FFD700' : T.teal,textTransform:'uppercase'}}>
                          {weeklyChallenge.completed ? 'Challenge Complete!' : 'Weekly Challenge'}
                        </span>
                      </div>
                      {!weeklyChallenge.completed && (
                        <span style={{fontSize:11,color:T.textMuted,fontWeight:600}}>
                          {challengeDaysLeft}d left
                        </span>
                      )}
                    </div>
                    <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:10}}>
                      {weeklyChallenge.description}
                    </div>
                    {/* Progress bar */}
                    <div style={{marginBottom:8}}>
                      <div style={{height:8,background:'rgba(255,255,255,0.06)',borderRadius:9999,overflow:'hidden'}}>
                        <div style={{
                          height:'100%',
                          width:`${Math.min(100, ((weeklyChallenge.current_value || 0) / (weeklyChallenge.target_value || 1)) * 100)}%`,
                          background: weeklyChallenge.completed
                            ? 'linear-gradient(90deg,#FFD700,#FFA500)'
                            : T.primaryGradientSoft,
                          borderRadius:9999,transition:'width 0.5s',
                          boxShadow: weeklyChallenge.completed
                            ? '0 0 12px rgba(255,215,0,0.50)'
                            : '0 0 10px rgba(14,245,194,0.45)',
                        }}/>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
                        <span style={{fontSize:11,fontWeight:700,color:weeklyChallenge.completed ? '#FFD700' : T.teal}}>
                          {weeklyChallenge.current_value || 0}/{weeklyChallenge.target_value}
                        </span>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{fontSize:11,fontWeight:700,color:T.teal,display:'flex',alignItems:'center',gap:3}}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                              <path d="M6 3L2 9l10 12L22 9l-4-6H6z" fill={T.teal} opacity="0.85"/>
                            </svg>
                            {weeklyChallenge.gem_reward}
                          </span>
                          <span style={{fontSize:11,fontWeight:700,color:'#FBBF24',display:'flex',alignItems:'center',gap:3}}>
                            <BoltIcon sz={10}/>{weeklyChallenge.xp_reward} XP
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              </StaggerBlock>
            )}

            {/* ── Reward Calendar ── */}
            <StaggerBlock index={8}>
              <div className="dashboard-support-shell" style={{maxWidth:920,margin:'12px auto 0',padding:'0 20px'}}>
                <div className="dashboard-support-card dashboard-rewards-card" style={{
                  background:T.surface,border:`1px solid ${T.border}`,
                  borderRadius:24,padding:'18px 20px',
                  backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',
                }}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <IconGlyph name="trophy" size={16} strokeWidth={2.3} color="#FBBF24"/>
                      <span style={{fontSize:13,fontWeight:900,letterSpacing:'1px',color:T.textSec,textTransform:'uppercase'}}>
                        Weekly chest
                      </span>
                    </div>
                    {rewardCalendar.days_claimed?.length === 7 && (
                      <span style={{fontSize:11,fontWeight:700,color:'#FFD700'}}>Perfect Week +50 gems</span>
                    )}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:6}}>
                    {CAL_DAYS.map((day, i) => {
                      const claimed = rewardCalendar.days_claimed?.includes(i)
                      const todayIdx = new Date().getDay()
                      const calToday = todayIdx === 0 ? 6 : todayIdx - 1
                      const isToday = i === calToday
                      const isPast = i < calToday
                      const missed = isPast && !claimed
                      const isSunday = i === 6

                      return (
                        <div key={i}
                          onClick={isToday && !claimed ? handleClaimReward : undefined}
                          style={{
                            display:'flex',flexDirection:'column',alignItems:'center',gap:4,
                            cursor: isToday && !claimed ? 'pointer' : 'default',
                          }}>
                          <div style={{
                            width: isSunday ? 40 : 36, height: isSunday ? 40 : 36,
                            borderRadius:'50%',
                            background: claimed ? T.primaryGradient
                              : isToday ? 'rgba(14,245,194,0.06)'
                              : missed ? 'rgba(255,255,255,0.02)'
                              : 'rgba(255,255,255,0.03)',
                            border: claimed ? `2px solid ${T.teal}`
                              : isToday ? '2px solid rgba(14,245,194,0.50)'
                              : isSunday && !missed ? '2px solid rgba(255,215,0,0.30)'
                              : `1px solid ${missed ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)'}`,
                            display:'flex',alignItems:'center',justifyContent:'center',
                            animation: isToday && !claimed ? 'pulseActive 2s ease-in-out infinite' : 'none',
                            transition:'all 0.2s',
                            boxShadow: claimed ? '0 0 10px rgba(14,245,194,0.30)' : 'none',
                          }}>
                            {claimed ? (
                              <IconGlyph name="check" size={14} strokeWidth={2.8} color={T.ink}/>
                            ) : missed ? (
                              <IconGlyph name="x" size={12} strokeWidth={2.6} color={T.textDead}/>
                            ) : isSunday ? (
                              <IconGlyph name="trophy" size={14} strokeWidth={2.2} color="#FFD700"/>
                            ) : (
                              <span style={{
                                fontSize:12,fontWeight:800,
                                color: isToday ? T.teal : T.textMuted,
                              }}>{CAL_REWARDS[i]}</span>
                            )}
                          </div>
                          <span style={{
                            fontSize:9,fontWeight:700,letterSpacing:'0.5px',
                            color: claimed ? T.teal : isToday ? T.textSec : T.textMuted,
                          }}>{day}</span>
                        </div>
                      )
                    })}
                  </div>
                  {/* Claim CTA for today */}
                  {(() => {
                    const todayIdx = new Date().getDay()
                    const calToday = todayIdx === 0 ? 6 : todayIdx - 1
                    const alreadyClaimed = rewardCalendar.days_claimed?.includes(calToday)
                    if (alreadyClaimed) return null
                    return (
                      <button onClick={handleClaimReward} disabled={claimingReward} style={{
                        width:'100%',marginTop:12,padding:'10px',
                        background:'rgba(14,245,194,0.08)',border:`1px solid ${T.tealBorder}`,
                        borderRadius:14,color:T.teal,fontSize:15,fontWeight:900,
                        cursor:claimingReward?'default':'pointer',fontFamily:T.font,
                        display:'flex',alignItems:'center',justifyContent:'center',gap:6,
                      }}>
                        {claimingReward ? (
                          <div style={{width:12,height:12,border:`2px solid ${T.teal}`,borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.6s linear infinite'}}/>
                        ) : (
                          <>Claim today&apos;s reward: +{CAL_REWARDS[calToday]} gems</>
                        )}
                      </button>
                    )
                  })()}
                </div>
              </div>
            </StaggerBlock>

            {/* ── Quest Master Toast ── */}
            {questMasterToast && (
              <div style={{
                position:'fixed',top:80,left:'50%',transform:'translateX(-50%)',zIndex:9990,
                background:'linear-gradient(135deg,rgba(255,215,0,0.20),rgba(14,245,194,0.12))',
                border:'1px solid rgba(255,215,0,0.40)',borderRadius:14,
                padding:'12px 24px',display:'flex',alignItems:'center',gap:10,
                boxShadow:'0 8px 32px rgba(255,215,0,0.25)',
                backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
                animation:'levelPop 0.50s cubic-bezier(0.34,1.3,0.64,1)',
                fontFamily:T.font,whiteSpace:'nowrap',
              }}>
                <IconGlyph name="target" size={18} strokeWidth={2.3} color="#FFD700"/>
                <div>
                  <div style={{fontSize:14,fontWeight:800,color:'#FFD700'}}>Quest Master!</div>
                  <div style={{fontSize:11,color:T.textMuted}}>+30 bonus gems earned</div>
                </div>
              </div>
            )}

            {/* ── Streak freeze toast ── */}
            {freezeToast && (
              <div style={{maxWidth:600,margin:'10px auto 0',padding:'0 20px'}}>
                <div style={{
                  background:'rgba(14,245,194,0.08)',border:`1px solid ${T.tealBorder}`,
                  borderRadius:14,padding:'10px 16px',
                  display:'flex',alignItems:'center',gap:10,
                  animation:'fadeUp 0.30s ease',
                }}>
                  <IconGlyph name="shield_check" size={18} strokeWidth={2.3} color={T.teal}/>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:T.teal}}>Streak protected</div>
                    <div style={{fontSize:11,color:T.textMuted}}>{freezeCount} freeze{freezeCount===1?'':'s'} remaining</div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Streak freeze button (show when streak at risk) ── */}
            {isComeback && freezeCount > 0 && !freezeToast && (
              <div style={{maxWidth:600,margin:'10px auto 0',padding:'0 20px'}}>
                <button onClick={handleFreeze} disabled={freezing} style={{
                  width:'100%',padding:'11px 16px',
                  background:'rgba(255,107,53,0.08)',border:`1px solid ${T.flameBorder}`,
                  borderRadius:14,cursor:freezing?'default':'pointer',
                  display:'flex',alignItems:'center',gap:10,fontFamily:T.font,
                }}>
                  <IconGlyph name="shield" size={18} strokeWidth={2.3} color={T.flame}/>
                  <div style={{textAlign:'left'}}>
                    <div style={{fontSize:13,fontWeight:700,color:T.flame}}>
                      {freezing ? 'Protecting streak…' : 'Use streak freeze'}
                    </div>
                    <div style={{fontSize:11,color:T.textMuted}}>
                      {freezeCount} freeze{freezeCount===1?'':'s'} available · keeps your streak safe
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* Mastery decay warning */}
            {decayingConcepts.length > 0 && (
              <StaggerBlock index={10}>
              <div style={{maxWidth:600,margin:'0 auto',padding:'10px 20px 0'}}>
                <div style={{
                  padding:'14px 16px',borderRadius:16,
                  background:'rgba(251,191,36,0.06)',
                  border:'1px solid rgba(251,191,36,0.20)',
                  display:'flex',alignItems:'center',gap:12,
                  animation:'fadeUp 0.3s ease both',
                }}>
                  <div style={{width:36,height:36,borderRadius:'50%',background:'rgba(251,191,36,0.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:'#FBBF24'}}><IconGlyph name="alert" size={18} strokeWidth={2.3}/></div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#FBBF24',marginBottom:2}}>
                      {decayingConcepts.length} concept{decayingConcepts.length !== 1 ? 's' : ''} need{decayingConcepts.length === 1 ? 's' : ''} review
                    </div>
                    <div style={{fontSize:11,color:'#8e8e93'}}>
                      {decayingConcepts.slice(0,3).map(c => c.conceptId).join(', ')}{decayingConcepts.length > 3 ? ` +${decayingConcepts.length - 3} more` : ''}
                    </div>
                  </div>
                </div>
              </div>
              </StaggerBlock>
            )}

            {/* Task list */}
            {!showP5MissionSurface && (
            <StaggerBlock index={11}>
              <div id="today-task-list" className="dashboard-task-stage" style={{maxWidth:920,margin:'0 auto',padding:'18px 20px 0'}}>
                {/* Section header */}
                {visibleTasks.length > 0 && (
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{
                        width:3,height:16,borderRadius:9999,
                        background:T.primaryGradient,
                      }}/>
                      <span style={{fontSize:13,fontWeight:900,color:T.textSec,letterSpacing:'1.2px',textTransform:'uppercase'}}>
                        Today&apos;s Tasks
                      </span>
                    </div>
                    <span style={{
                      fontSize:12,fontWeight:800,color:T.textSec,
                    }}>
                      {visibleTasks.filter(t=>t.completed).length}/{visibleTasks.length} done
                    </span>
                  </div>
                )}

                <div style={{display:'grid',gap:10}}>
                {todayRow ? visibleTasks.length > 0 ? (
                  visibleTasks.map((task, i) => (
                    <TaskItem key={`${String(task.id || 'task')}:${i}`} task={task} isCompleting={completing}
                      onComplete={completeTask}
                      onOpenLesson={t => {
                        const lockState = getTaskLockState(t, tasks)
                        if (lockState.locked) { setError(lockState.reason); return }
                        if (heartsRemaining === 0) { setShowNoHearts(true); return }
                        const normalizedOpenTask = normalizeLearningTask(t)
                        setShowLesson(normalizeLearningTask({
                          ...normalizedOpenTask,
                          _concept: normalizedOpenTask._concept || todayRow?.covered_topics?.[0] || normalizedOpenTask.title,
                        }))
                      }}
                      onPreview={t => setPreviewTask(t)}
                      index={i}/>
                  ))
                ) : (
                  <div style={{
                    textAlign:'center',padding:'48px 24px',
                    background:'rgba(255,255,255,0.02)',border:`1px solid ${T.border}`,
                    borderRadius:20,
                  }}>
                    <div style={{fontSize:32,marginBottom:12}}>
                      {tasks.every(t=>t.completed) ? '🎉' : '📋'}
                    </div>
                    <div style={{fontSize:15,fontWeight:700,color:T.text,marginBottom:6}}>
                      {tasks.every(t=>t.completed) ? 'All done!' : 'No tasks available'}
                    </div>
                    <div style={{fontSize:13,color:T.textMuted,lineHeight:1.6}}>
                      {tasks.every(t=>t.completed)
                        ? 'Great work today. Come back tomorrow for more.'
                        : 'Check back soon.'}
                    </div>
                  </div>
                ) : (
                  <div style={{textAlign:'center',padding:'40px 0',color:T.textMuted,fontSize:14}}>
                    Your plan is being generated...
                  </div>
                )}

                </div>
              </div>
            </StaggerBlock>
            )}

            {/* Tomorrow preview */}
            {!showP5MissionSurface && !isTodayComplete && (
              <StaggerBlock index={12}>
                <TomorrowPreview tomorrowRow={tomorrowRow}/>
              </StaggerBlock>
            )}

            {/* Comeback note */}
            {streakData.current === 0 && doneRows > 0 && (
              <div style={{maxWidth:600,margin:'12px auto 0',padding:'0 20px'}}>
                <div style={{
                  background:'rgba(255,107,53,0.06)',border:`1px solid ${T.flameBorder}`,
                  borderRadius:14,padding:'12px 16px',
                  display:'flex',alignItems:'center',gap:10,
                }}>
                  <IconGlyph name="shield_check" size={18} strokeWidth={2.3} color={T.flame}/>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:T.flame}}>Good to have you back</div>
                    <div style={{fontSize:12,color:T.textMuted}}>Path adjusted — you&apos;re right on track.</div>
                  </div>
                </div>
              </div>
            )}

            {showInlineNextDayProgress && (
              <div style={{maxWidth:600,margin:'12px auto 0',padding:'0 20px'}}>
                <div style={{
                  width:'100%',
                  padding:'16px 18px',
                  background:'rgba(255,255,255,0.04)',
                  border:`1px solid ${T.tealBorder}`,
                  borderRadius:18,
                  boxShadow:'0 16px 32px rgba(0,0,0,0.16)',
                  animation:'fadeUp 0.30s ease both',
                }}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,marginBottom:10}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:800,color:T.text,marginBottom:4}}>
                        {nextDayStatusLabel}
                      </div>
                      <div style={{fontSize:11,color:T.textMuted,lineHeight:1.5}}>
                        {nextDayStatusDetail}
                      </div>
                    </div>
                    <div style={{width:14,height:14,borderRadius:'50%',border:`2px solid ${T.teal}`,borderTopColor:'transparent',animation:'spin 0.7s linear infinite',flexShrink:0}}/>
                  </div>
                  <div style={{
                    position:'relative',
                    height:8,
                    borderRadius:9999,
                    overflow:'hidden',
                    background:'rgba(255,255,255,0.06)',
                  }}>
                    <div style={{
                      position:'absolute',
                      inset:0,
                      width:'42%',
                      borderRadius:9999,
                      background:T.primaryGradientSoft,
                      boxShadow:'0 0 20px rgba(14,245,194,0.28)',
                      animation:'nextDayProgress 1.15s ease-in-out infinite',
                    }}/>
                  </div>
                </div>
              </div>
            )}

            {!showInlineNextDayProgress && showInlineNextDayCTA && (
              <div style={{maxWidth:600,margin:'12px auto 0',padding:'0 20px'}}>
                <button
                  onClick={handleStartNextDay}
                  disabled={nextDayBusy}
                  className="interactive-cta"
                  style={{
                    width:'100%',
                    padding:'16px 18px',
                    background: nextDayBusy ? T.tealDim : T.primaryGradient,
                    border: nextDayBusy ? `1px solid ${T.tealBorder}` : 'none',
                    borderRadius:18,
                    color: nextDayBusy ? T.teal : T.ink,
                    fontSize:15,
                    fontWeight:800,
                    cursor: nextDayBusy ? 'default' : 'pointer',
                    fontFamily:T.font,
                    boxShadow:'0 16px 32px rgba(0,0,0,0.22), 0 0 24px rgba(14,245,194,0.18)',
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center',
                    gap:10,
                    animation:'fadeUp 0.30s ease both',
                  }}
                >
                  <>{nextDayCtaLabel}</>
                </button>
              </div>
            )}

            <div style={{height:showInlineNextDayCTA || showInlineNextDayProgress ? 36 : 24}}/>
            </>)}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* STATS TAB                                                      */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'stats' && (
          <div className="shell-transition-fade" style={{maxWidth:980,margin:'0 auto',padding:'20px 20px 0'}}>
            <h2 style={{fontSize:22,fontWeight:800,color:T.text,letterSpacing:'-0.4px',marginBottom:16}}>
              Your Progress
            </h2>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:10,marginBottom:20}}>
              <StatCard label="Total XP"       value={xpDisplay.totalXp.toLocaleString()} sub="lifetime"        color={T.amber}/>
              <StatCard label="Streak"         value={`${streakData.current}d`}             sub={streakData.current>=7?'Strong momentum':'Keep going'} color={T.flame}/>
              <StatCard label="Best Streak"    value={`${streakData.longest}d`}             sub="personal best"/>
              <StatCard label="Days Done"      value={doneRows}                             sub={`of ${totalRows}`} color={T.teal}/>
            </div>

            {/* Level card */}
            <div style={{
              background:T.surface,border:`2px solid ${T.border}`,
              borderRadius:20,padding:'20px',marginBottom:14,
              boxShadow:'inset 0 1px 0 rgba(255,255,255,0.06), 0 6px 0 0 color-mix(in oklab, var(--color-background) 55%, #000)',
            }}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:T.text}}>
                    Level {xpDisplay.level} — {xpDisplay.title}
                  </div>
                  <div style={{fontSize:11,color:T.textMuted,marginTop:2}}>
                    {xpDisplay.xpInLevel} / {xpDisplay.xpForLevel} XP to next level
                  </div>
                </div>
                <div style={{
                  width:44,height:44,borderRadius:'50%',
                  background:T.masteryGradient,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontWeight:900,fontSize:18,color:'#fff',
                  boxShadow:'0 0 24px rgba(129,140,248,0.40)',
                }}>{xpDisplay.level}</div>
              </div>
              <div style={{height:8,background:'rgba(255,255,255,0.06)',borderRadius:9999,overflow:'hidden'}}>
                <div style={{
                  height:'100%',width:`${Math.round(xpDisplay.pct*100)}%`,
                  background:T.masteryGradientSoft,borderRadius:9999,
                  transition:'width 0.5s',boxShadow:'0 0 10px rgba(129,140,248,0.45)',
                }}/>
              </div>
            </div>

            {/* Weekly */}
            <div style={{
              background:T.surface,border:`2px solid ${T.border}`,
              borderRadius:20,padding:'20px',marginBottom:14,
              boxShadow:'inset 0 1px 0 rgba(255,255,255,0.06), 0 6px 0 0 color-mix(in oklab, var(--color-background) 55%, #000)',
            }}>
              <div className="font-display" style={{fontSize:15,fontWeight:800,color:T.text,marginBottom:12}}>This Week</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div>
                  <div style={{fontSize:11,color:T.textMuted,marginBottom:2}}>Days active</div>
                  <div style={{fontSize:20,fontWeight:900,color:T.teal}}>{weekDays}/7</div>
                </div>
                <div>
                  <div style={{fontSize:11,color:T.textMuted,marginBottom:2}}>Minutes studied</div>
                  <div style={{fontSize:20,fontWeight:900,color:T.text}}>{totalMins}m</div>
                </div>
              </div>
            </div>

            <div style={{marginBottom:12}}>
              <ConceptHeatMap
                rows={allRows}
                masteries={conceptMasteryRows}
                title="Learned concepts"
                subtitle="Your concept heat map across lessons, practice, recall, application, and explanation"
              />
            </div>

            {weekDays >= 5 && (
              <div style={{background:'rgba(14,245,194,0.05)',border:`1px solid ${T.tealBorder}`,
                borderRadius:14,padding:'12px 16px',marginBottom:12,
                fontSize:13,color:T.teal,fontWeight:600}}>
                You&apos;re ahead of last week — outstanding consistency.
              </div>
            )}
            {weekDays < 3 && doneRows > 0 && (
              <div style={{background:T.surface,border:`1px solid ${T.border}`,
                borderRadius:14,padding:'12px 16px',marginBottom:12,
                fontSize:13,color:T.textSec,fontWeight:500}}>
                Complete today&apos;s mission to build momentum. Every session counts.
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* PATH TAB                                                       */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'path' && (
          <div className="shell-transition-fade" style={{maxWidth:760,margin:'0 auto',padding:'18px 0 0'}}>
            {pathTracker.modules.length > 0 ? (
              <>
                <PathTrackerSummary tracker={pathTracker}/>
                <div style={{display:'grid',gap:12,padding:'14px 20px 28px'}}>
                  {pathTracker.modules.map((module, index) => (
                    <PathModuleCard
                      key={module.id}
                      module={module}
                      expanded={Boolean(expandedPathModules[module.id])}
                      onToggle={() => togglePathModule(module.id)}
                      expandedUnits={expandedPathUnits}
                      onToggleUnit={togglePathUnit}
                      index={index}
                    />
                  ))}
                  {pathTracker.tailItems.map((item, index) => (
                    <StaggerBlock key={item.id} index={pathTracker.modules.length + index}>
                      <PathProjectCard item={item}/>
                    </StaggerBlock>
                  ))}
                </div>
              </>
            ) : (
              <div style={{maxWidth:680,margin:'0 auto',padding:'0 20px'}}>
                <div style={{
                  borderRadius:24,
                  border:`1px solid ${T.border}`,
                  background:'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                  padding:'28px 22px',
                  textAlign:'center',
                  boxShadow:'0 14px 34px rgba(0,0,0,0.22)',
                }}>
                  <div style={{
                    width:56,height:56,borderRadius:18,
                    margin:'0 auto 14px',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    background:'rgba(14,245,194,0.08)',border:`1px solid ${T.tealBorder}`,
                    color:T.teal,
                  }}>
                    <IconGlyph name="map" size={24} strokeWidth={2.3}/>
                  </div>
                  <h2 style={{fontSize:22,fontWeight:800,color:T.text,marginBottom:8,letterSpacing:'-0.4px'}}>
                    Your curriculum tracker is getting ready
                  </h2>
                  <p style={{color:T.textMuted,fontSize:14,lineHeight:1.65,maxWidth:440,margin:'0 auto'}}>
                    As soon as your course outline is available, this tab will show every module, unit, sub-unit, and milestone project in one place.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* SETTINGS TAB                                                   */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'settings' && (
          <div className="shell-transition-fade" style={{maxWidth:600,margin:'0 auto',padding:'20px 20px 0'}}>
            <h2 style={{fontSize:22,fontWeight:800,color:T.text,letterSpacing:'-0.4px',marginBottom:20}}>
              Settings
            </h2>

            {/* Account card */}
            <div style={{background:T.surface,border:`1px solid ${T.border}`,
              borderRadius:18,overflow:'hidden',marginBottom:12}}>
              <div style={{padding:'14px 18px',borderBottom:`1px solid ${T.borderAlt}`,
                display:'flex',alignItems:'center',gap:12}}>
                <div style={{
                  width:40,height:40,borderRadius:'50%',
                  background:T.masteryGradient,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontWeight:900,fontSize:16,color:'#fff',flexShrink:0,
                }}>{user?.email?.[0]?.toUpperCase()||'?'}</div>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:T.text,
                    whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                    {user?.email||'Account'}
                  </div>
                  <div style={{fontSize:11,color:T.textMuted}}>
                    Level {xpDisplay.level} · {xpDisplay.title}
                  </div>
                </div>
              </div>
              <div style={{padding:'14px 18px'}}>
                <div style={{fontSize:11,color:T.textMuted,marginBottom:4}}>Current goal</div>
                <div style={{fontSize:14,fontWeight:600,color:T.text}}>{goal?.goal_text}</div>
              </div>
            </div>

            {/* Streak info */}
            <div style={{background:T.surface,border:`1px solid ${T.border}`,
              borderRadius:18,padding:'16px 18px',marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:10}}>
                Streak
              </div>
              {[
                {label:'Current', sub:'Complete a mission to keep it', val:`${streakData.current} days`, color:T.flame},
                {label:'Best',    sub:'Personal record',                val:`${streakData.longest}d`,  color:T.text},
              ].map((row,i) => (
                <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                  padding:'10px 0',borderTop:`1px solid ${T.borderAlt}`}}>
                  <div>
                    <div style={{fontSize:13,color:T.textSec,fontWeight:600}}>{row.label}</div>
                    <div style={{fontSize:11,color:T.textMuted}}>{row.sub}</div>
                  </div>
                  <span style={{fontSize:16,fontWeight:900,color:row.color}}>{row.val}</span>
                </div>
              ))}
            </div>

            <div style={{background:T.surface,border:`1px solid ${T.border}`,
              borderRadius:18,padding:'16px 18px',marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:10}}>
                Energy
              </div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div>
                  <div style={{fontSize:13,color:T.textSec,fontWeight:600}}>Max hearts</div>
                  <div style={{fontSize:11,color:T.textMuted}}>Upgrade this in the gem shop</div>
                </div>
                <span style={{fontSize:16,fontWeight:900,color:T.teal}}>{maxHearts}</span>
              </div>
            </div>

            <div style={{background:T.surface,border:`1px solid ${T.border}`,
              borderRadius:18,padding:'16px 18px',marginBottom:12}}>
              <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:12,marginBottom:12}}>
                <div>
                  <div style={{fontSize:13,fontWeight:850,color:T.text,marginBottom:3}}>
                    Color palette
                  </div>
                  <div style={{fontSize:11,color:T.textMuted,lineHeight:1.45}}>
                    Re-skin the full learner app instantly.
                  </div>
                </div>
                <span style={{
                  fontSize:10,
                  fontWeight:900,
                  letterSpacing:'0.12em',
                  textTransform:'uppercase',
                  color:T.teal,
                  padding:'5px 8px',
                  borderRadius:9999,
                  border:`1px solid ${T.tealBorder}`,
                  background:T.tealDim,
                  whiteSpace:'nowrap',
                }}>
                  {Object.keys(APP_THEMES).length} styles
                </span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(190px, 1fr))',gap:10}}>
                {Object.keys(APP_THEMES).map((themeId) => {
                  const theme = APP_THEMES[themeId]
                  const isActive = activeTheme === themeId
                  const vars = theme.dashboardVars
                  const swatches = [
                    vars['--theme-bg'],
                    vars['--theme-shell'],
                    vars['--theme-primary'],
                    vars['--theme-secondary'],
                    vars['--theme-highlight'],
                  ]
                  return (
                    <button
                      key={themeId}
                      onClick={() => applyTheme(themeId)}
                      style={{
                        width:'100%',
                        minHeight:116,
                        padding:12,
                        background:isActive ? T.tealDim : 'rgba(255,255,255,0.025)',
                        border:`1px solid ${isActive ? T.tealBorder : T.borderAlt}`,
                        borderRadius:18,
                        cursor:'pointer',
                        fontFamily:T.font,
                        textAlign:'left',
                        boxShadow:isActive ? `0 0 0 1px ${T.tealBorder}, 0 18px 36px ${T.tealDim}` : 'none',
                        transition:'transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
                      }}
                      onMouseEnter={(event) => { event.currentTarget.style.transform = 'translateY(-2px)' }}
                      onMouseLeave={(event) => { event.currentTarget.style.transform = 'translateY(0)' }}
                    >
                      <div style={{
                        height:34,
                        borderRadius:13,
                        overflow:'hidden',
                        display:'grid',
                        gridTemplateColumns:`repeat(${swatches.length}, 1fr)`,
                        border:`1px solid ${isActive ? T.tealBorder : T.borderAlt}`,
                        marginBottom:10,
                      }}>
                        {swatches.map((color, index) => (
                          <span key={`${themeId}-${index}`} style={{background:color}}/>
                        ))}
                      </div>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
                        <div style={{minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:850,color:isActive ? T.teal : T.text}}>
                            {theme.name}
                          </div>
                          <div style={{fontSize:11,color:T.textMuted,lineHeight:1.35,marginTop:2}}>
                            {theme.description}
                          </div>
                        </div>
                        <span style={{
                          width:26,
                          height:26,
                          flexShrink:0,
                          display:'inline-flex',
                          alignItems:'center',
                          justifyContent:'center',
                          borderRadius:9999,
                          background:isActive ? T.teal : 'rgba(255,255,255,0.04)',
                          border:`1px solid ${isActive ? T.teal : T.border}`,
                          color:isActive ? T.ink : T.textMuted,
                          fontSize:12,
                          fontWeight:950,
                        }}>
                          {isActive ? '✓' : ''}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
              <div style={{fontSize:11,color:T.textMuted,marginTop:12,lineHeight:1.45}}>
                Palettes are open for testing here. Shop theme purchases can stay as rewards later, but this picker lets us tune the look fast.
              </div>
            </div>

            {/* Appearance */}
            <div style={{background:T.surface,border:`1px solid ${T.border}`,
              borderRadius:18,overflow:'hidden',marginBottom:12}}>
              <button onClick={() => router.push('/appearance')} style={{
                width:'100%',padding:'16px 18px',background:'none',border:'none',
                cursor:'pointer',fontFamily:T.font,
                display:'flex',alignItems:'center',justifyContent:'space-between',
                color:T.textSec,fontSize:14,fontWeight:600,
              }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:10 }}>
                  <IconGlyph name="design" size={16} strokeWidth={2.3}/>
                  Appearance
                </span>
                <ArrowRight/>
              </button>
            </div>

            {/* Portfolio */}
            <div style={{background:T.surface,border:`1px solid ${T.border}`,
              borderRadius:18,overflow:'hidden',marginBottom:12}}>
              <button onClick={() => router.push('/portfolio')} style={{
                width:'100%',padding:'16px 18px',background:'none',border:'none',
                cursor:'pointer',fontFamily:T.font,
                display:'flex',alignItems:'center',justifyContent:'space-between',
                color:T.textSec,fontSize:14,fontWeight:600,
              }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:10 }}>
                  <IconGlyph name="rocket" size={16} strokeWidth={2.3}/>
                  My Portfolio
                </span>
                <ArrowRight/>
              </button>
            </div>

            {/* New goal */}
            <div style={{background:T.surface,border:`1px solid ${T.border}`,
              borderRadius:18,overflow:'hidden',marginBottom:12}}>
              <button onClick={() => router.push('/onboarding')} style={{
                width:'100%',padding:'16px 18px',background:'none',border:'none',
                cursor:'pointer',fontFamily:T.font,
                display:'flex',alignItems:'center',justifyContent:'space-between',
                color:T.textSec,fontSize:14,fontWeight:600,
              }}>
                Start a new goal <ArrowRight/>
              </button>
            </div>

            {/* Sign out */}
            <button onClick={() => { clearStoredSupabaseSession(); router.push('/login') }} style={{
              width:'100%',padding:'14px 18px',
              background:'rgba(255,69,58,0.07)',border:'1px solid rgba(255,69,58,0.18)',
              borderRadius:14,color:T.red,fontSize:14,fontWeight:700,
              cursor:'pointer',fontFamily:T.font,
            }}>
              Sign out
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* SHOP TAB                                                       */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'badges' && (
          <div className="shell-transition-fade" style={{ paddingTop: 20, paddingBottom: 40 }}>
            <BadgeShowcase
              earnedIds={earnedBadgeIds}
              rows={allRows}
              goalText={goal?.goal_text || ''}
              maxWidth={1120}
              outerPadding="0 18px 40px"
            />
          </div>
        )}

        {activeTab === 'shop' && (
          <div className="shell-transition-fade">
            <GemShop
              user={user}
              goal={goal}
              gems={gems}
              goalId={goal?.id}
              activeTheme={activeTheme}
              maxHearts={maxHearts}
              inventoryCounts={inventoryCounts}
              onPurchase={(data) => {
                if (data.newGemTotal != null) setGems(data.newGemTotal)
                if (data.heartsRemaining != null) { setPrevHearts(heartsRemaining); setHeartsRemaining(data.heartsRemaining) }
                if (data.maxHearts != null) {
                  setMaxHearts(data.maxHearts)
                  setStoredMaxHearts(data.maxHearts)
                }
                if (data.freezeCount != null) setFreezeCount(data.freezeCount)
                if (data.xpBoostUntil) setXpBoostUntil(new Date(data.xpBoostUntil))
                if (Array.isArray(data.ownedThemes)) {
                  setStoredOwnedThemes(data.ownedThemes)
                  setOwnedThemes(data.ownedThemes)
                }
                if (data.inventoryCounts) setInventoryCounts(data.inventoryCounts)
                if (data.streakRepaired) {
                  setStreakData(prev => ({ ...prev, current: data.currentStreak || prev.current }))
                }
                setGemPulse(true)
                setTimeout(() => setGemPulse(false), 400)
                // Reload to sync all state from server
                load(true)
              }}
            />
          </div>
        )}
          </main>
        </div>
      </div>

      {/* ── iOS bottom tab bar ── */}
      <div style={{
        position:'fixed',bottom:0,left:0,right:0,zIndex:70,
        background:T.chrome,
        backdropFilter:'blur(36px) saturate(200%)',
        WebkitBackdropFilter:'blur(36px) saturate(200%)',
        borderTop:`1px solid ${T.border}`,
      }} className="safe-bottom-nav dashboard-bottom-nav">
        <div style={{maxWidth:600,margin:'0 auto',
          display:'grid',gridTemplateColumns:'repeat(3, 1fr)',padding:'6px 8px 0'}}>
          {[
            {key:'home',     label:'Home',   Icon:HomeIcon    },
            {key:'path',     label:'Path',   Icon:PathIcon    },
            {key:'settings', label:'More',   Icon:SettingsIcon},
          ].map(({key,label,Icon}) => {
            const active = activeTab === key
            return (
              <button key={key} onClick={() => handleTabSelect(key)} className="interactive-icon" style={{
                background:'none',border:'none',
                padding:'8px 0 10px',
                display:'flex',flexDirection:'column',alignItems:'center',gap:4,
                cursor:'pointer',
                color:active ? T.teal : T.textDead,
                fontFamily:T.font,
                transition:'color 0.2s',
                position:'relative',
                minHeight:52,
              }}>
                {active && (
                  <div style={{
                    position:'absolute',
                    inset:'0 4px',
                    borderRadius:14,
                    background:`${T.teal}12`,
                    border:`1px solid ${T.teal}22`,
                  }}/>
                )}
                <div style={{position:'relative',zIndex:1,transition:'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',transform:active?'scale(1.12)':'scale(1)'}}>
                  <Icon/>
                </div>
                <span style={{
                  position:'relative',zIndex:1,
                  fontSize:10,fontWeight:active?800:500,letterSpacing:'0.2px',
                  transition:'all 0.18s',
                }}>
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
