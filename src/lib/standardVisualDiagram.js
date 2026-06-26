import 'server-only'
import { JSDOM } from 'jsdom'
import { getOpenAIModel } from '@/lib/openaiModels'
import {
  FULL_AI_SVG_RESPONSE_FORMAT,
  buildFullAiSvgPrompt,
} from '@/lib/prompts/components/fullAiSvg_v1'
import { renderTemplateSvg, TEMPLATE_KINDS } from '@/lib/templateSvgRenderers'

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function frame({ title, subtitle = '', body = '', aria = '' }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" role="img" aria-label="${escapeXml(aria || title)}">
  <rect x="18" y="18" width="864" height="564" rx="24" fill="#07111f" stroke="#23404f" stroke-width="2"/>
  <text x="450" y="56" text-anchor="middle" font-size="29" font-weight="800" fill="#f8fafc">${escapeXml(title)}</text>
  ${subtitle ? `<text x="450" y="86" text-anchor="middle" font-size="15" fill="#94a3b8">${escapeXml(subtitle)}</text>` : ''}
  ${body}
</svg>`
}

const CONCEPT_STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'basic',
  'basics',
  'canvas',
  'clean',
  'concept',
  'create',
  'diagram',
  'draw',
  'educational',
  'explain',
  'explaining',
  'generate',
  'generated',
  'for',
  'format',
  'formatted',
  'fresh',
  'from',
  'how',
  'intro',
  'introduction',
  'layout',
  'learn',
  'make',
  'of',
  'one',
  'requested',
  'show',
  'simple',
  'static',
  'svg',
  'the',
  'this',
  'to',
  'understand',
  'visual',
  'what',
  'with',
])

function extractGroundingSubject(concept = '') {
  const raw = String(concept || '').replace(/\s+/g, ' ').trim()
  if (!raw) return ''

  // Users often paste full diagram instructions here. Grounding should verify
  // the subject being taught, not boilerplate like "Create one clean SVG...".
  const subjectMatch = raw.match(/\b(?:explaining|explain|about|showing|visualizing|illustrating)\s+([^.!?]+)/i)
    || raw.match(/\bdiagram\s+(?:for|of|about)\s+([^.!?]+)/i)
    || raw.match(/\b(?:visual|svg)\s+(?:for|of|about)\s+([^.!?]+)/i)

  let subject = subjectMatch?.[1] || raw
  subject = subject
    .replace(/^(?:how|why|what|when|where|a|an|the)\s+/i, '')
    .replace(/\b(?:use|draw|show|label|formatting rules|formatting|layout|colors?|palette|canvas|no overlapping|no clipped)\b[\s\S]*$/i, '')
    .trim()

  return subject || raw
}

function conceptKeywords(concept = '') {
  return extractGroundingSubject(concept)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((word) => word.replace(/^-+|-+$/g, ''))
    .filter((word) => word.length >= 3 && !CONCEPT_STOPWORDS.has(word))
    .slice(0, 8)
}

function textContentFromSvg(svg = '') {
  return String(svg || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
}

function validateConceptGrounding(concept = '', result = {}) {
  const subject = extractGroundingSubject(concept)
  const keywords = conceptKeywords(concept)
  if (!keywords.length) return { passed: true, detail: 'No distinctive concept keywords to verify.' }

  const haystack = `${result.title || ''} ${textContentFromSvg(result.svg || '')}`.toLowerCase()
  const hits = keywords.filter((keyword) => haystack.includes(keyword))
  const requiredHits = keywords.length <= 2 ? 1 : Math.min(2, keywords.length)
  if (hits.length >= requiredHits) {
    return { passed: true, detail: `Grounded in requested subject "${subject}" via: ${hits.join(', ')}.` }
  }
  return {
    passed: false,
    detail: `Diagram did not visibly ground itself in the requested subject "${subject}". Needed ${requiredHits} of: ${keywords.join(', ')}.`,
  }
}

function buildArduinoCircuitSvg() {
  return frame({
    title: 'Arduino LED Circuit',
    subtitle: 'D9 -> 220 ohm resistor -> LED anode; LED cathode -> GND.',
    aria: 'Arduino LED circuit with resistor and ground return',
    body: `
  <defs>
    <marker id="arrowRed" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#ef4444"/></marker>
  </defs>
  <rect x="72" y="142" width="292" height="282" rx="24" fill="#0f766e" stroke="#5eead4" stroke-width="3"/>
  <text x="218" y="462" text-anchor="middle" font-size="24" font-weight="800" fill="#ecfeff">Arduino Uno</text>
  <rect x="98" y="178" width="110" height="70" rx="10" fill="#0b1120" stroke="#99f6e4" stroke-width="2"/>
  <text x="153" y="220" text-anchor="middle" font-size="18" font-weight="700" fill="#e0f2fe">USB</text>
  <circle cx="302" cy="205" r="28" fill="#042f2e" stroke="#99f6e4" stroke-width="2"/>
  <rect x="330" y="184" width="18" height="36" rx="4" fill="#e2e8f0"/>
  <rect x="330" y="294" width="18" height="36" rx="4" fill="#e2e8f0"/>
  <text x="316" y="207" text-anchor="end" font-size="17" font-weight="800" fill="#fee2e2">D9</text>
  <text x="316" y="318" text-anchor="end" font-size="17" font-weight="800" fill="#f8fafc">GND</text>
  <path d="M348 202 H430" fill="none" stroke="#ef4444" stroke-width="7" stroke-linecap="round" marker-end="url(#arrowRed)"/>
  <path d="M430 202 l20 -28 l28 56 l28 -56 l28 56 l28 -56 l28 56 l20 -28" fill="none" stroke="#f97316" stroke-width="6" stroke-linejoin="round"/>
  <text x="520" y="156" text-anchor="middle" font-size="18" font-weight="800" fill="#fed7aa">220&amp;Omega; resistor</text>
  <path d="M610 202 H672" fill="none" stroke="#ef4444" stroke-width="7" stroke-linecap="round"/>
  <line x1="704" y1="165" x2="704" y2="239" stroke="#f8fafc" stroke-width="7" stroke-linecap="round"/>
  <polygon points="704,165 704,239 760,202" fill="none" stroke="#f8fafc" stroke-width="6" stroke-linejoin="round"/>
  <line x1="768" y1="165" x2="768" y2="239" stroke="#f8fafc" stroke-width="7" stroke-linecap="round"/>
  <path d="M785 169 l24 -24 M799 198 l26 -26" stroke="#facc15" stroke-width="4" stroke-linecap="round"/>
  <text x="735" y="283" text-anchor="middle" font-size="20" font-weight="800" fill="#fef08a">LED</text>
  <text x="702" y="313" text-anchor="middle" font-size="14" fill="#cbd5e1">anode +</text>
  <text x="783" y="313" text-anchor="middle" font-size="14" fill="#cbd5e1">cathode -</text>
  <path d="M768 202 H820 V318 H348" fill="none" stroke="#e5e7eb" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <g transform="translate(820 318)">
    <line x1="0" y1="0" x2="0" y2="22" stroke="#e5e7eb" stroke-width="6"/>
    <line x1="-28" y1="22" x2="28" y2="22" stroke="#e5e7eb" stroke-width="5"/>
    <line x1="-18" y1="34" x2="18" y2="34" stroke="#e5e7eb" stroke-width="5"/>
    <line x1="-8" y1="46" x2="8" y2="46" stroke="#e5e7eb" stroke-width="5"/>
  </g>
  <text x="815" y="397" text-anchor="middle" font-size="18" font-weight="800" fill="#f1f5f9">GND</text>
  <rect x="92" y="500" width="716" height="44" rx="14" fill="#0b1725" stroke="#334155" stroke-width="1.5"/>
  <text x="450" y="528" text-anchor="middle" font-size="17" fill="#dbeafe">The resistor limits current so the LED does not burn out.</text>`,
  })
}

function buildChessSvg(concept = '') {
  const text = String(concept || '').toLowerCase()
  const isFork = /fork|forking/.test(text)
  const title = isFork ? 'Knight Fork: King and Rook' : 'Italian Game Opening'
  const subtitle = isFork ? 'A knight attacks two high-value pieces at once.' : 'Position after 1. e4 e5 2. Nf3 Nc6 3. Bc4.'
  const size = 56
  const originX = 226
  const originY = 82
  const pieces = isFork
    ? { e8: '&#9818;', h8: '&#9820;', f6: '&#9816;', e1: '&#9812;', a1: '&#9814;', h1: '&#9814;' }
    : {
      a1: '&#9814;', b1: '&#9816;', c1: '&#9815;', d1: '&#9813;', e1: '&#9812;', h1: '&#9814;', f3: '&#9816;', c4: '&#9815;',
      a2: '&#9817;', b2: '&#9817;', c2: '&#9817;', d2: '&#9817;', e4: '&#9817;', f2: '&#9817;', g2: '&#9817;', h2: '&#9817;',
      a8: '&#9820;', c8: '&#9821;', d8: '&#9819;', e8: '&#9818;', f8: '&#9821;', h8: '&#9820;', c6: '&#9822;', g8: '&#9822;',
      a7: '&#9823;', b7: '&#9823;', c7: '&#9823;', d7: '&#9823;', e5: '&#9823;', f7: '&#9823;', g7: '&#9823;', h7: '&#9823;',
    }
  const highlights = isFork ? ['f6', 'e8', 'h8'] : ['e4', 'e5', 'f3', 'c6', 'c4']
  const files = 'abcdefgh'.split('')
  const rows = []
  for (let rank = 8; rank >= 1; rank -= 1) {
    for (let fileIndex = 0; fileIndex < 8; fileIndex += 1) {
      const file = files[fileIndex]
      const square = `${file}${rank}`
      const x = originX + fileIndex * size
      const y = originY + (8 - rank) * size
      const isLight = (fileIndex + rank) % 2 === 1
      rows.push(`<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${isLight ? '#f0d9b5' : '#b58863'}"${highlights.includes(square) ? ' stroke="#14f1c9" stroke-width="3"' : ''}/>` )
      if (pieces[square]) {
        const code = pieces[square]
        const whitePiece = code.includes('981')
        rows.push(`<text x="${x + size / 2}" y="${y + 40}" text-anchor="middle" font-size="39" font-weight="700" fill="${whitePiece ? '#f8fafc' : '#0f172a'}" stroke="${whitePiece ? '#334155' : '#e2e8f0'}" stroke-width="0.7">${code}</text>`)
      }
    }
  }
  const coords = files.map((file, index) => `<text x="${originX + index * size + size / 2}" y="${originY + size * 8 + 24}" text-anchor="middle" font-size="14" fill="#cbd5e1">${file}</text>`)
  for (let rank = 8; rank >= 1; rank -= 1) coords.push(`<text x="${originX - 18}" y="${originY + (8 - rank) * size + 35}" text-anchor="middle" font-size="14" fill="#cbd5e1">${rank}</text>`)
  return frame({
    title,
    subtitle,
    aria: title,
    body: `
  <rect x="${originX - 8}" y="${originY - 8}" width="${size * 8 + 16}" height="${size * 8 + 16}" rx="12" fill="#111827" stroke="#475569" stroke-width="2"/>
  ${rows.join('\n  ')}
  ${coords.join('\n  ')}
  ${isFork ? '<path d="M535 200 L480 88 M535 200 L703 88" fill="none" stroke="#14f1c9" stroke-width="5" stroke-linecap="round"/>' : '<path d="M478 364 C430 324 410 262 394 192" fill="none" stroke="#14f1c9" stroke-width="5" stroke-linecap="round"/><circle cx="394" cy="192" r="8" fill="#14f1c9"/>'}
  <text x="88" y="184" font-size="18" font-weight="800" fill="#f8fafc">Teaching point</text>
  <text x="88" y="216" font-size="15" fill="#cbd5e1">${isFork ? 'The knight attacks both targets' : 'White develops bishop and knight'}</text>
  <text x="88" y="240" font-size="15" fill="#cbd5e1">${isFork ? 'from one square, winning material.' : 'toward the center and f7.'}</text>`,
  })
}

function parseNumberLineFocus(concept = '') {
  const text = String(concept || '').toLowerCase()
  const inequality = text.match(/\b([a-z])\s*(<=|>=|<|>)\s*(-?\d+(?:\.\d+)?)\b/)
  if (inequality) {
    return {
      variable: inequality[1],
      operator: inequality[2],
      value: Number(inequality[3]),
    }
  }
  const number = text.match(/\b-?\d+(?:\.\d+)?\b/)
  return number ? { variable: 'x', operator: '=', value: Number(number[0]) } : null
}

function buildNumberLineSvg(concept = '') {
  const focus = parseNumberLineFocus(concept)
  const center = Number.isFinite(focus?.value) ? Math.round(focus.value) : 0
  const start = Number.isFinite(focus?.value) ? center - 5 : -5
  const end = Number.isFinite(focus?.value) ? center + 5 : 5
  const tickCount = end - start
  const axisStart = 116
  const axisEnd = 784
  const axisY = 330
  const scale = (axisEnd - axisStart) / tickCount
  const xFor = (value) => axisStart + (value - start) * scale
  const ticks = []

  for (let value = start; value <= end; value += 1) {
    const x = xFor(value)
    const isZero = value === 0
    const isFocus = Number.isFinite(focus?.value) && Math.abs(value - focus.value) < 0.001
    ticks.push(`
      <line x1="${x}" y1="${axisY - (isZero ? 26 : 16)}" x2="${x}" y2="${axisY + (isZero ? 26 : 16)}" stroke="${isZero ? '#facc15' : '#94a3b8'}" stroke-width="${isZero ? 4 : 2}"/>
      <text x="${x}" y="${axisY + 52}" text-anchor="middle" font-size="${isFocus ? 20 : 16}" font-weight="${isFocus ? 800 : 600}" fill="${isFocus ? '#5eead4' : '#cbd5e1'}">${value}</text>`)
  }

  let focusMarkup = ''
  let subtitle = 'Numbers increase as you move right and decrease as you move left.'
  if (focus && Number.isFinite(focus.value)) {
    const valueX = xFor(focus.value)
    const closed = focus.operator === '>=' || focus.operator === '<=' || focus.operator === '='
    const rightRay = focus.operator === '>' || focus.operator === '>='
    const leftRay = focus.operator === '<' || focus.operator === '<='
    const label = focus.operator === '='
      ? `${focus.variable} = ${focus.value}`
      : `${focus.variable} ${focus.operator} ${focus.value}`
    subtitle = focus.operator === '='
      ? `The highlighted point marks ${label}.`
      : `The highlighted ray shows every value where ${label}.`

    if (rightRay || leftRay) {
      focusMarkup += `<line x1="${leftRay ? axisStart : valueX}" y1="${axisY}" x2="${rightRay ? axisEnd : valueX}" y2="${axisY}" stroke="#14f1c9" stroke-width="9" stroke-linecap="round"/>`
    }
    focusMarkup += `<circle cx="${valueX}" cy="${axisY}" r="14" fill="${closed ? '#14f1c9' : '#07111f'}" stroke="#5eead4" stroke-width="5"/>`
    focusMarkup += `<rect x="${Math.max(54, Math.min(690, valueX - 84))}" y="${axisY - 110}" width="168" height="54" rx="16" fill="#0b1725" stroke="#14f1c9" stroke-width="2"/>
      <text x="${Math.max(138, Math.min(774, valueX))}" y="${axisY - 77}" text-anchor="middle" font-size="18" font-weight="800" fill="#ccfbf1">${escapeXml(label)}</text>
      <path d="M${valueX} ${axisY - 55} V${axisY - 20}" stroke="#14f1c9" stroke-width="3"/>`
  }

  return frame({
    title: 'Number Line',
    subtitle,
    aria: `Number line diagram for ${concept || 'integers and inequalities'}`,
    body: `
  <defs>
    <marker id="numberLineArrow" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto"><path d="M0,0 L10,4 L0,8 Z" fill="#94a3b8"/></marker>
    <marker id="numberLineArrowLeft" markerWidth="12" markerHeight="12" refX="2" refY="4" orient="auto"><path d="M10,0 L0,4 L10,8 Z" fill="#94a3b8"/></marker>
  </defs>
  <rect x="80" y="156" width="740" height="300" rx="24" fill="#0b1220" stroke="#334155" stroke-width="2"/>
  <line x1="${axisStart}" y1="${axisY}" x2="${axisEnd}" y2="${axisY}" stroke="#94a3b8" stroke-width="5" stroke-linecap="round" marker-start="url(#numberLineArrowLeft)" marker-end="url(#numberLineArrow)"/>
  ${focusMarkup}
  ${ticks.join('\n  ')}
  <text x="164" y="240" font-size="18" font-weight="800" fill="#bfdbfe">negative</text>
  <text x="664" y="240" font-size="18" font-weight="800" fill="#bfdbfe">positive</text>
  <text x="${xFor(0)}" y="${axisY - 38}" text-anchor="middle" font-size="15" font-weight="800" fill="#fde68a">zero</text>
  <rect x="160" y="480" width="580" height="42" rx="14" fill="#0b1725" stroke="#334155" stroke-width="1.5"/>
  <text x="450" y="507" text-anchor="middle" font-size="16" fill="#dbeafe">Use the spacing between ticks to compare, add, subtract, or graph inequalities.</text>`,
  })
}

function buildMathSvg(concept = '') {
  const text = String(concept || '').toLowerCase()
  if (/number line|integer line|integers|inequality|greater than|less than|x\s*(?:<=|>=|<|>)\s*-?\d/.test(text)) {
    return buildNumberLineSvg(concept)
  }
  if (/pythagorean|right triangle|hypotenuse/.test(text)) {
    return frame({
      title: 'Pythagorean Theorem',
      subtitle: 'In a right triangle, the squares on the legs add to the square on the hypotenuse.',
      body: `
  <polygon points="260,430 260,170 660,430" fill="#0f172a" stroke="#38bdf8" stroke-width="6" stroke-linejoin="round"/>
  <rect x="260" y="392" width="38" height="38" fill="none" stroke="#facc15" stroke-width="4"/>
  <text x="236" y="304" text-anchor="middle" font-size="30" font-weight="800" fill="#f8fafc">a</text>
  <text x="460" y="468" text-anchor="middle" font-size="30" font-weight="800" fill="#f8fafc">b</text>
  <text x="485" y="285" text-anchor="middle" font-size="30" font-weight="800" fill="#f8fafc">c</text>
  <rect x="118" y="472" width="664" height="62" rx="18" fill="#0b1725" stroke="#334155" stroke-width="2"/>
  <text x="450" y="513" text-anchor="middle" font-size="25" font-weight="800" fill="#ccfbf1">a<tspan baseline-shift="super" font-size="16">2</tspan> + b<tspan baseline-shift="super" font-size="16">2</tspan> = c<tspan baseline-shift="super" font-size="16">2</tspan></text>`,
    })
  }
  if (/unit circle|sine|cosine|trig/.test(text)) {
    return frame({
      title: 'Unit Circle',
      subtitle: 'Cosine is the x-coordinate; sine is the y-coordinate.',
      body: `
  <circle cx="450" cy="310" r="160" fill="#0b1220" stroke="#38bdf8" stroke-width="5"/>
  <line x1="250" y1="310" x2="650" y2="310" stroke="#94a3b8" stroke-width="2"/>
  <line x1="450" y1="110" x2="450" y2="510" stroke="#94a3b8" stroke-width="2"/>
  <path d="M450 310 L570 206" stroke="#14f1c9" stroke-width="6" stroke-linecap="round"/>
  <path d="M450 310 H570 V206" fill="none" stroke="#facc15" stroke-width="4"/>
  <circle cx="570" cy="206" r="8" fill="#14f1c9"/>
  <text x="586" y="206" font-size="18" font-weight="800" fill="#ccfbf1">(cos theta, sin theta)</text>
  <text x="510" y="337" font-size="17" fill="#fde68a">cos theta</text>
  <text x="580" y="265" font-size="17" fill="#fde68a">sin theta</text>`,
    })
  }
  return frame({
    title: 'Plot of y = x^2',
    subtitle: 'A parabola is symmetric around the y-axis and grows as x moves away from 0.',
    body: `
  <rect x="130" y="120" width="640" height="390" rx="18" fill="#0b1220" stroke="#334155" stroke-width="2"/>
  <line x1="170" y1="440" x2="730" y2="440" stroke="#94a3b8" stroke-width="2"/>
  <line x1="450" y1="145" x2="450" y2="470" stroke="#94a3b8" stroke-width="2"/>
  <path d="M190 175 C285 400 360 440 450 440 C540 440 615 400 710 175" fill="none" stroke="#38bdf8" stroke-width="6" stroke-linecap="round"/>
  <circle cx="450" cy="440" r="8" fill="#14f1c9"/>
  <text x="466" y="468" font-size="16" font-weight="700" fill="#ccfbf1">vertex (0, 0)</text>
  <text x="715" y="464" font-size="16" fill="#cbd5e1">x</text>
  <text x="424" y="154" font-size="16" fill="#cbd5e1">y</text>`,
  })
}

function buildPhysicsSvg(concept = '') {
  const text = String(concept || '').toLowerCase()
  if (/projectile|trajectory|parabolic motion/.test(text)) {
    return frame({
      title: 'Projectile Motion',
      subtitle: 'Horizontal velocity stays constant while gravity accelerates downward.',
      body: `
  <defs><marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto"><path d="M0,0 L10,4 L0,8 Z" fill="#38bdf8"/></marker></defs>
  <line x1="120" y1="455" x2="790" y2="455" stroke="#64748b" stroke-width="4"/>
  <path d="M150 430 C285 220 500 220 720 430" fill="none" stroke="#14f1c9" stroke-width="6"/>
  <circle cx="150" cy="430" r="10" fill="#facc15"/><circle cx="410" cy="255" r="10" fill="#facc15"/><circle cx="720" cy="430" r="10" fill="#facc15"/>
  <path d="M150 430 l80 -92" stroke="#38bdf8" stroke-width="6" marker-end="url(#arrow)"/>
  <path d="M410 255 v105" stroke="#ef4444" stroke-width="6" marker-end="url(#arrow)"/>
  <text x="214" y="330" font-size="18" font-weight="800" fill="#bae6fd">initial velocity</text>
  <text x="430" y="330" font-size="18" font-weight="800" fill="#fecaca">gravity</text>`,
    })
  }
  return frame({
    title: "Newton's Second Law",
    subtitle: 'Force, mass, and acceleration are linked by F = m a.',
    body: `
  <defs>
    <marker id="forceArrow" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto"><path d="M0,0 L10,4 L0,8 Z" fill="#ef4444"/></marker>
    <marker id="accelArrow" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto"><path d="M0,0 L10,4 L0,8 Z" fill="#38bdf8"/></marker>
  </defs>
  <line x1="110" y1="392" x2="790" y2="392" stroke="#64748b" stroke-width="4"/>
  <rect x="350" y="258" width="200" height="130" rx="16" fill="#1d4ed8" stroke="#93c5fd" stroke-width="3"/>
  <text x="450" y="332" text-anchor="middle" font-size="27" font-weight="800" fill="#eff6ff">mass m</text>
  <path d="M180 323 H338" stroke="#ef4444" stroke-width="9" stroke-linecap="round" marker-end="url(#forceArrow)"/>
  <text x="210" y="294" font-size="20" font-weight="800" fill="#fecaca">force F</text>
  <path d="M560 218 H715" stroke="#38bdf8" stroke-width="7" stroke-linecap="round" marker-end="url(#accelArrow)"/>
  <text x="600" y="200" font-size="20" font-weight="800" fill="#bae6fd">acceleration a</text>
  <text x="450" y="494" text-anchor="middle" font-size="24" font-weight="800" fill="#bfdbfe">F = m a</text>`,
  })
}

function buildDnaSvg() {
  const rungs = Array.from({ length: 9 }, (_, i) => {
    const y = 130 + i * 42
    const phase = i % 2 === 0
    return `<line x1="${phase ? 360 : 520}" y1="${y}" x2="${phase ? 520 : 360}" y2="${y}" stroke="#facc15" stroke-width="5"/>
    <circle cx="${phase ? 360 : 520}" cy="${y}" r="11" fill="#14f1c9"/>
    <circle cx="${phase ? 520 : 360}" cy="${y}" r="11" fill="#38bdf8"/>`
  }).join('\n  ')
  return frame({
    title: 'DNA Double Helix',
    subtitle: 'Two sugar-phosphate backbones twist around paired bases.',
    body: `
  <path d="M360 120 C520 180 520 240 360 300 C200 360 200 420 360 480" fill="none" stroke="#14f1c9" stroke-width="8" stroke-linecap="round"/>
  <path d="M520 120 C360 180 360 240 520 300 C680 360 680 420 520 480" fill="none" stroke="#38bdf8" stroke-width="8" stroke-linecap="round"/>
  ${rungs}
  <text x="130" y="225" font-size="18" fill="#cbd5e1">Backbone</text>
  <text x="628" y="315" font-size="18" fill="#cbd5e1">Base pairs</text>`,
  })
}

function buildBiologySvg(concept = '') {
  const text = String(concept || '').toLowerCase()
  if (/dna|helix|genetic/.test(text)) return buildDnaSvg()
  return frame({
    title: 'Animal Cell',
    subtitle: 'Organelles divide up the work needed for the cell to live.',
    body: `
  <ellipse cx="450" cy="315" rx="250" ry="170" fill="#0f172a" stroke="#38bdf8" stroke-width="6"/>
  <circle cx="455" cy="315" r="62" fill="#312e81" stroke="#a5b4fc" stroke-width="4"/>
  <text x="455" y="322" text-anchor="middle" font-size="18" font-weight="800" fill="#e0e7ff">nucleus</text>
  <ellipse cx="310" cy="260" rx="58" ry="24" fill="#7c2d12" stroke="#fed7aa" stroke-width="3"/>
  <text x="310" y="265" text-anchor="middle" font-size="14" fill="#ffedd5">mitochondrion</text>
  <path d="M540 235 C610 250 610 310 540 325" fill="none" stroke="#14f1c9" stroke-width="8"/>
  <text x="625" y="290" font-size="16" fill="#ccfbf1">ER</text>
  <circle cx="600" cy="390" r="20" fill="#facc15"/><text x="622" y="397" font-size="15" fill="#fde68a">vesicle</text>`,
  })
}

function buildChemistrySvg() {
  return frame({
    title: 'Molecule Structure',
    subtitle: 'Atoms connect through bonds to form a stable arrangement.',
    body: `
  <line x1="360" y1="300" x2="450" y2="240" stroke="#cbd5e1" stroke-width="7"/>
  <line x1="450" y1="240" x2="540" y2="300" stroke="#cbd5e1" stroke-width="7"/>
  <line x1="450" y1="240" x2="450" y2="385" stroke="#cbd5e1" stroke-width="7"/>
  <circle cx="450" cy="240" r="38" fill="#38bdf8"/><text x="450" y="249" text-anchor="middle" font-size="26" font-weight="800" fill="#082f49">O</text>
  <circle cx="360" cy="300" r="30" fill="#f8fafc"/><text x="360" y="309" text-anchor="middle" font-size="22" font-weight="800" fill="#111827">H</text>
  <circle cx="540" cy="300" r="30" fill="#f8fafc"/><text x="540" y="309" text-anchor="middle" font-size="22" font-weight="800" fill="#111827">H</text>
  <circle cx="450" cy="385" r="30" fill="#f8fafc"/><text x="450" y="394" text-anchor="middle" font-size="22" font-weight="800" fill="#111827">H</text>
  <text x="450" y="482" text-anchor="middle" font-size="18" fill="#cbd5e1">Bonds show which atoms share electrons.</text>`,
  })
}

function buildSystemSvg(concept = '') {
  const title = /oauth|login|auth/.test(String(concept).toLowerCase()) ? 'OAuth Login Flow' : 'How an HTTP Request Works'
  const nodes = title.includes('OAuth')
    ? ['User', 'App', 'Auth Server', 'Token', 'Protected API']
    : ['Browser', 'DNS', 'Server', 'Application', 'Response']
  return frame({
    title,
    subtitle: 'A system diagram shows the main actors and the direction of information flow.',
    body: `
  <defs><marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto"><path d="M0,0 L10,4 L0,8 Z" fill="#14f1c9"/></marker></defs>
  ${nodes.map((node, i) => `<rect x="${86 + i * 158}" y="${230 + (i % 2) * 70}" width="120" height="62" rx="16" fill="#0b1725" stroke="#14f1c9" stroke-width="2"/><text x="${146 + i * 158}" y="${268 + (i % 2) * 70}" text-anchor="middle" font-size="15" font-weight="800" fill="#e2e8f0">${escapeXml(node)}</text>`).join('\n  ')}
  ${nodes.slice(0, -1).map((_, i) => `<path d="M${206 + i * 158} ${261 + (i % 2) * 70} C${240 + i * 158} ${210 + (i % 2) * 70}, ${280 + i * 158} ${210 + ((i + 1) % 2) * 70}, ${86 + (i + 1) * 158} ${261 + ((i + 1) % 2) * 70}" fill="none" stroke="#14f1c9" stroke-width="4" marker-end="url(#arrow)"/>`).join('\n  ')}`,
  })
}

function buildWaterCycleSvg() {
  return frame({
    title: 'The Water Cycle',
    subtitle: 'Water moves between Earth and atmosphere through repeating phase changes.',
    body: `
  <defs><marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto"><path d="M0,0 L10,4 L0,8 Z" fill="#38bdf8"/></marker></defs>
  <ellipse cx="450" cy="454" rx="300" ry="42" fill="#075985" stroke="#38bdf8" stroke-width="3"/>
  <path d="M235 390 C275 320 335 292 390 315 C450 240 560 260 596 330 C655 330 700 365 710 410 Z" fill="#e0f2fe" stroke="#bae6fd" stroke-width="4"/>
  <circle cx="690" cy="160" r="48" fill="#facc15"/>
  <path d="M360 430 C300 350 290 260 360 205" fill="none" stroke="#38bdf8" stroke-width="6" marker-end="url(#arrow)"/>
  <path d="M430 210 C500 175 595 208 630 292" fill="none" stroke="#38bdf8" stroke-width="6" marker-end="url(#arrow)"/>
  <path d="M610 340 C560 390 520 420 470 445" fill="none" stroke="#38bdf8" stroke-width="6" marker-end="url(#arrow)"/>
  <path d="M330 360 l-12 34 M384 350 l-12 34 M438 360 l-12 34" stroke="#38bdf8" stroke-width="5" stroke-linecap="round"/>
  <text x="280" y="255" font-size="18" font-weight="800" fill="#bae6fd">evaporation</text>
  <text x="500" y="180" font-size="18" font-weight="800" fill="#bae6fd">condensation</text>
  <text x="295" y="420" font-size="18" font-weight="800" fill="#bae6fd">precipitation</text>
  <text x="610" y="455" font-size="18" font-weight="800" fill="#bae6fd">collection</text>`,
  })
}

function buildNeuralNetworkSvg() {
  const layers = [
    { x: 200, labels: ['x1', 'x2', 'x3'] },
    { x: 450, labels: ['h1', 'h2', 'h3', 'h4'] },
    { x: 700, labels: ['y'] },
  ]
  const nodes = layers.flatMap((layer) => layer.labels.map((label, index) => ({
    x: layer.x,
    y: 190 + index * (220 / Math.max(layer.labels.length - 1, 1)),
    label,
  })))
  const edges = []
  layers[0].labels.forEach((_, i) => layers[1].labels.forEach((__, j) => edges.push([nodes[i], nodes[3 + j]])))
  layers[1].labels.forEach((_, j) => edges.push([nodes[3 + j], nodes[7]]))
  return frame({
    title: 'Neural Network Architecture',
    subtitle: 'Inputs flow through weighted hidden units to produce an output.',
    body: `
  ${edges.map(([a, b]) => `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#334155" stroke-width="2"/>`).join('\n  ')}
  ${nodes.map((node) => `<circle cx="${node.x}" cy="${node.y}" r="28" fill="#0f766e" stroke="#5eead4" stroke-width="4"/><text x="${node.x}" y="${node.y + 6}" text-anchor="middle" font-size="16" font-weight="800" fill="#ecfeff">${node.label}</text>`).join('\n  ')}
  <text x="200" y="485" text-anchor="middle" font-size="18" font-weight="800" fill="#cbd5e1">input layer</text>
  <text x="450" y="485" text-anchor="middle" font-size="18" font-weight="800" fill="#cbd5e1">hidden layer</text>
  <text x="700" y="485" text-anchor="middle" font-size="18" font-weight="800" fill="#cbd5e1">output</text>`,
  })
}

function buildTimelineSvg(concept = '') {
  const title = String(concept || 'Timeline').slice(0, 80)
  const events = ['Start', 'Key change', 'Turning point', 'Result']
  return frame({
    title,
    subtitle: 'A timeline keeps events in chronological order.',
    body: `
  <line x1="150" y1="310" x2="750" y2="310" stroke="#38bdf8" stroke-width="6" stroke-linecap="round"/>
  ${events.map((event, index) => {
    const x = 170 + index * 190
    return `<circle cx="${x}" cy="310" r="18" fill="#14f1c9" stroke="#ccfbf1" stroke-width="4"/><rect x="${x - 70}" y="${index % 2 ? 350 : 210}" width="140" height="62" rx="14" fill="#0b1725" stroke="#334155" stroke-width="2"/><text x="${x}" y="${index % 2 ? 388 : 248}" text-anchor="middle" font-size="15" font-weight="800" fill="#e2e8f0">${event}</text>`
  }).join('\n  ')}`,
  })
}

function buildLanguageSvg(concept = '') {
  const title = String(concept || 'Sentence structure').slice(0, 80)
  return frame({
    title,
    subtitle: 'Language diagrams map meaning to grammar and examples.',
    body: `
  <rect x="160" y="180" width="580" height="70" rx="16" fill="#0b1725" stroke="#38bdf8" stroke-width="3"/>
  <text x="450" y="223" text-anchor="middle" font-size="22" font-weight="800" fill="#e0f2fe">Subject + Verb + Object</text>
  <rect x="190" y="330" width="145" height="72" rx="16" fill="#0f766e" stroke="#5eead4" stroke-width="3"/>
  <rect x="378" y="330" width="145" height="72" rx="16" fill="#1d4ed8" stroke="#93c5fd" stroke-width="3"/>
  <rect x="565" y="330" width="145" height="72" rx="16" fill="#7c2d12" stroke="#fed7aa" stroke-width="3"/>
  <text x="262" y="372" text-anchor="middle" font-size="18" font-weight="800" fill="#ecfeff">who/what</text>
  <text x="450" y="372" text-anchor="middle" font-size="18" font-weight="800" fill="#eff6ff">action</text>
  <text x="638" y="372" text-anchor="middle" font-size="18" font-weight="800" fill="#ffedd5">receiver</text>`,
  })
}

function buildGenericSvg(concept = '') {
  const title = String(concept || 'Concept map').slice(0, 80)
  const words = title.split(/\s+/).filter(Boolean).slice(0, 5)
  const labels = words.length >= 3 ? words : ['Definition', 'Example', 'Practice', 'Common mistake', 'Proof']
  return frame({
    title,
    subtitle: 'A concept map for the core relationships to learn first.',
    body: `
  <defs><marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto"><path d="M0,0 L10,4 L0,8 Z" fill="#94a3b8"/></marker></defs>
  <circle cx="450" cy="300" r="78" fill="#0f766e" stroke="#5eead4" stroke-width="4"/>
  <text x="450" y="294" text-anchor="middle" font-size="17" font-weight="800" fill="#ecfeff">Core</text>
  <text x="450" y="318" text-anchor="middle" font-size="15" fill="#ccfbf1">idea</text>
  ${labels.map((label, i) => {
    const angle = (-90 + i * (360 / labels.length)) * Math.PI / 180
    const x = Math.round(450 + Math.cos(angle) * 245)
    const y = Math.round(300 + Math.sin(angle) * 165)
    return `<path d="M450 300 L${x} ${y}" stroke="#94a3b8" stroke-width="3" marker-end="url(#arrow)"/><rect x="${x - 70}" y="${y - 28}" width="140" height="56" rx="16" fill="#0b1725" stroke="#334155" stroke-width="2"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="15" font-weight="800" fill="#e2e8f0">${escapeXml(label)}</text>`
  }).join('\n  ')}`,
  })
}

function buildDeterministicVisual(concept = '') {
  const text = String(concept || '').toLowerCase()
  if (/(arduino|breadboard|resistor|led|circuit|electronics)/.test(text)) return { title: 'Arduino circuit with a resistor and LED', svg: buildArduinoCircuitSvg(), visualKind: 'circuit_diagram' }
  if (/(chess|italian game|opening|king and rook|knight fork|forking)/.test(text)) return { title: /fork/.test(text) ? 'Knight fork chessboard' : 'Chess board with Italian Game opening', svg: buildChessSvg(concept), visualKind: 'chess_board' }
  if (/(number line|integer line|integers|inequality|greater than|less than|x\s*(?:<=|>=|<|>)\s*-?\d)/.test(text)) return { title: 'Number line', svg: buildNumberLineSvg(concept), visualKind: 'number_line' }
  if (/(pythagorean|right triangle|hypotenuse|plot|parabola|quadratic|y\s*=|unit circle|sine|cosine|trig|math)/.test(text)) return { title: 'Math diagram', svg: buildMathSvg(concept), visualKind: 'math_diagram' }
  if (/(newton|f\s*=\s*m\s*a|force|acceleration|projectile|trajectory|physics|free[- ]body)/.test(text)) return { title: 'Physics diagram', svg: buildPhysicsSvg(concept), visualKind: 'physics_diagram' }
  if (/(dna|cell|biology|neuron|anatomy|mitochondria|organelles|helix)/.test(text)) return { title: /dna|helix/.test(text) ? 'DNA double helix' : 'Biology diagram', svg: buildBiologySvg(concept), visualKind: 'biology_diagram' }
  if (/(molecule|chemistry|atom|bond|reaction)/.test(text)) return { title: 'Chemistry diagram', svg: buildChemistrySvg(), visualKind: 'chemistry_diagram' }
  if (/(water cycle|evaporation|condensation|precipitation)/.test(text)) return { title: 'The water cycle', svg: buildWaterCycleSvg(), visualKind: 'cycle_diagram' }
  if (/(neural network|machine learning|deep learning|classifier)/.test(text)) return { title: 'Neural network architecture', svg: buildNeuralNetworkSvg(), visualKind: 'network_diagram' }
  if (/(http|oauth|network|architecture|api|request|server|database|login)/.test(text)) return { title: 'System flow diagram', svg: buildSystemSvg(concept), visualKind: 'system_diagram' }
  if (/(timeline|history|sequence|chronology|evolution of)/.test(text)) return { title: 'Timeline diagram', svg: buildTimelineSvg(concept), visualKind: 'timeline_diagram' }
  if (/(grammar|sentence|language|spanish|mandarin|french|verb|noun)/.test(text)) return { title: 'Language structure diagram', svg: buildLanguageSvg(concept), visualKind: 'language_diagram' }
  return null
}

function decodeJsonStringFragment(fragment = '') {
  try {
    return JSON.parse(`"${String(fragment).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
  } catch {
    return String(fragment)
  }
}

function extractJsonString(raw = '', key = 'svg') {
  const source = String(raw || '')
  const keyIndex = source.indexOf(`"${key}"`)
  if (keyIndex < 0) return null
  const colon = source.indexOf(':', keyIndex)
  if (colon < 0) return null
  let cursor = colon + 1
  while (/\s/.test(source[cursor] || '')) cursor += 1
  if (source[cursor] !== '"') return null
  cursor += 1
  let value = ''
  let escaped = false
  for (; cursor < source.length; cursor += 1) {
    const ch = source[cursor]
    if (escaped) {
      value += `\\${ch}`
      escaped = false
      continue
    }
    if (ch === '\\') {
      escaped = true
      continue
    }
    if (ch === '"') return decodeJsonStringFragment(value)
    value += ch
  }
  return null
}

function extractSvgFromRaw(raw = '') {
  const asJsonString = extractJsonString(raw, 'svg')
  if (asJsonString && asJsonString.includes('<svg')) return asJsonString
  const source = String(raw || '')
  const start = source.indexOf('<svg')
  const end = source.lastIndexOf('</svg>')
  if (start >= 0 && end > start) return source.slice(start, end + 6)
  return ''
}

function parseModelJson(raw = '') {
  try {
    const parsed = JSON.parse(raw)
    if (!parsed.kind && parsed.svg) return { ...parsed, kind: 'freeform' }
    return parsed
  } catch {
    const title = extractJsonString(raw, 'title') || 'AI-generated diagram'
    const svg = extractSvgFromRaw(raw)
    if (svg) return { kind: 'freeform', title, svg }
    throw new Error('Model returned invalid JSON and no recoverable SVG.')
  }
}

function numberAttr(node, attr, fallback = 0) {
  const raw = node?.getAttribute?.(attr)
  if (raw === null || raw === undefined || raw === '') return fallback
  const value = Number(raw)
  return Number.isFinite(value) ? value : fallback
}

function boxesOverlap(a, b) {
  return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1
}

function boxGap(a, b) {
  const dx = Math.max(0, b.x1 - a.x2, a.x1 - b.x2)
  const dy = Math.max(0, b.y1 - a.y2, a.y1 - b.y2)
  return Math.sqrt(dx * dx + dy * dy)
}

function containsBox(outer, inner) {
  return outer.x1 <= inner.x1 && outer.y1 <= inner.y1 && outer.x2 >= inner.x2 && outer.y2 >= inner.y2
}

function multiplyMatrix(left, right) {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    e: left.a * right.e + left.c * right.f + left.e,
    f: left.b * right.e + left.d * right.f + left.f,
  }
}

function parseTransform(value = '') {
  let matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }
  const matches = String(value || '').matchAll(/(matrix|translate|scale)\(([^)]+)\)/g)
  for (const match of matches) {
    const type = match[1]
    const parts = match[2].trim().split(/[\s,]+/).map(Number).filter(Number.isFinite)
    let next = null
    if (type === 'matrix' && parts.length >= 6) {
      next = { a: parts[0], b: parts[1], c: parts[2], d: parts[3], e: parts[4], f: parts[5] }
    } else if (type === 'translate' && parts.length >= 1) {
      next = { a: 1, b: 0, c: 0, d: 1, e: parts[0], f: parts[1] || 0 }
    } else if (type === 'scale' && parts.length >= 1) {
      next = { a: parts[0], b: 0, c: 0, d: parts[1] || parts[0], e: 0, f: 0 }
    }
    if (next) matrix = multiplyMatrix(matrix, next)
  }
  return matrix
}

function matrixForNode(node) {
  const chain = []
  let cursor = node
  while (cursor && cursor.nodeType === 1 && cursor.tagName?.toLowerCase() !== 'svg') {
    chain.unshift(cursor)
    cursor = cursor.parentElement
  }
  return chain.reduce((matrix, item) => {
    const transform = item.getAttribute?.('transform')
    return transform ? multiplyMatrix(matrix, parseTransform(transform)) : matrix
  }, { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
}

function transformPoint(matrix, x, y) {
  return {
    x: matrix.a * x + matrix.c * y + matrix.e,
    y: matrix.b * x + matrix.d * y + matrix.f,
  }
}

function transformBox(box, matrix) {
  const points = [
    transformPoint(matrix, box.x1, box.y1),
    transformPoint(matrix, box.x2, box.y1),
    transformPoint(matrix, box.x1, box.y2),
    transformPoint(matrix, box.x2, box.y2),
  ]
  return {
    ...box,
    x1: Math.min(...points.map((point) => point.x)),
    y1: Math.min(...points.map((point) => point.y)),
    x2: Math.max(...points.map((point) => point.x)),
    y2: Math.max(...points.map((point) => point.y)),
  }
}

function unionBoxes(boxes = []) {
  const usable = boxes.filter((box) => (
    Number.isFinite(box.x1) &&
    Number.isFinite(box.y1) &&
    Number.isFinite(box.x2) &&
    Number.isFinite(box.y2) &&
    box.x2 > box.x1 &&
    box.y2 > box.y1
  ))
  if (!usable.length) return null
  return {
    x1: Math.min(...usable.map((box) => box.x1)),
    y1: Math.min(...usable.map((box) => box.y1)),
    x2: Math.max(...usable.map((box) => box.x2)),
    y2: Math.max(...usable.map((box) => box.y2)),
  }
}

function getTextBoxes(document) {
  return Array.from(document.querySelectorAll('text')).map((node) => {
    const content = (node.textContent || '').replace(/\s+/g, ' ').trim()
    const fontSize = numberAttr(node, 'font-size', numberAttr(node.parentElement, 'font-size', 16))
    const tspanCount = Math.max(1, node.querySelectorAll('tspan').length)
    const lines = tspanCount > 1 ? tspanCount : Math.max(1, Math.ceil(content.length / 34))
    const longestLine = tspanCount > 1
      ? Math.max(...Array.from(node.querySelectorAll('tspan')).map((tspan) => (tspan.textContent || '').trim().length), 1)
      : content.length
    const width = Math.max(10, longestLine * fontSize * 0.58)
    const height = Math.max(fontSize * 1.2, lines * fontSize * 1.25)
    const x = numberAttr(node, 'x', numberAttr(node.querySelector('tspan'), 'x', 0))
    const y = numberAttr(node, 'y', numberAttr(node.querySelector('tspan'), 'y', 0))
    const anchor = node.getAttribute('text-anchor') || 'start'
    const x1 = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x
    return transformBox({
      node,
      content,
      fontSize,
      lines,
      x1,
      y1: y - height * 0.82,
      x2: x1 + width,
      y2: y + height * 0.28,
    }, matrixForNode(node))
  }).filter((box) => box.content)
}

function getSmallRectBoxes(document) {
  return Array.from(document.querySelectorAll('rect')).map((node) => {
    const x = numberAttr(node, 'x')
    const y = numberAttr(node, 'y')
    const width = numberAttr(node, 'width')
    const height = numberAttr(node, 'height')
    const box = transformBox({ node, x1: x, y1: y, x2: x + width, y2: y + height, width, height }, matrixForNode(node))
    return { ...box, width: box.x2 - box.x1, height: box.y2 - box.y1 }
  }).filter((box) => (
    box.width >= 24 &&
    box.height >= 18 &&
    box.width <= 320 &&
    box.height <= 140
  ))
}

function getElementBounds(document) {
  const boxes = []
  Array.from(document.querySelectorAll('rect,image,use')).forEach((node) => {
    const x = numberAttr(node, 'x')
    const y = numberAttr(node, 'y')
    const width = numberAttr(node, 'width')
    const height = numberAttr(node, 'height')
    if (width > 0 && height > 0) boxes.push(transformBox({ x1: x, y1: y, x2: x + width, y2: y + height }, matrixForNode(node)))
  })
  Array.from(document.querySelectorAll('circle')).forEach((node) => {
    const cx = numberAttr(node, 'cx')
    const cy = numberAttr(node, 'cy')
    const r = numberAttr(node, 'r')
    if (r > 0) boxes.push(transformBox({ x1: cx - r, y1: cy - r, x2: cx + r, y2: cy + r }, matrixForNode(node)))
  })
  Array.from(document.querySelectorAll('ellipse')).forEach((node) => {
    const cx = numberAttr(node, 'cx')
    const cy = numberAttr(node, 'cy')
    const rx = numberAttr(node, 'rx')
    const ry = numberAttr(node, 'ry')
    if (rx > 0 && ry > 0) boxes.push(transformBox({ x1: cx - rx, y1: cy - ry, x2: cx + rx, y2: cy + ry }, matrixForNode(node)))
  })
  Array.from(document.querySelectorAll('line')).forEach((node) => {
    const x1 = numberAttr(node, 'x1')
    const y1 = numberAttr(node, 'y1')
    const x2 = numberAttr(node, 'x2')
    const y2 = numberAttr(node, 'y2')
    const strokePad = Math.max(2, numberAttr(node, 'stroke-width', 2) / 2)
    boxes.push(transformBox({
      x1: Math.min(x1, x2) - strokePad,
      y1: Math.min(y1, y2) - strokePad,
      x2: Math.max(x1, x2) + strokePad,
      y2: Math.max(y1, y2) + strokePad,
    }, matrixForNode(node)))
  })
  Array.from(document.querySelectorAll('polyline,polygon')).forEach((node) => {
    const values = String(node.getAttribute('points') || '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) || []
    const xs = []
    const ys = []
    for (let i = 0; i < values.length - 1; i += 2) {
      xs.push(values[i])
      ys.push(values[i + 1])
    }
    if (xs.length) {
      const strokePad = Math.max(2, numberAttr(node, 'stroke-width', 2) / 2)
      boxes.push(transformBox({
        x1: Math.min(...xs) - strokePad,
        y1: Math.min(...ys) - strokePad,
        x2: Math.max(...xs) + strokePad,
        y2: Math.max(...ys) + strokePad,
      }, matrixForNode(node)))
    }
  })
  Array.from(document.querySelectorAll('path')).forEach((node) => {
    const values = String(node.getAttribute('d') || '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) || []
    const xs = []
    const ys = []
    for (let i = 0; i < values.length - 1; i += 2) {
      xs.push(values[i])
      ys.push(values[i + 1])
    }
    if (xs.length) {
      const strokePad = Math.max(4, numberAttr(node, 'stroke-width', 2) / 2 + 4)
      boxes.push(transformBox({
        x1: Math.min(...xs) - strokePad,
        y1: Math.min(...ys) - strokePad,
        x2: Math.max(...xs) + strokePad,
        y2: Math.max(...ys) + strokePad,
      }, matrixForNode(node)))
    }
  })
  return boxes
}

function isDefinitionNode(node) {
  return Boolean(node?.closest?.('defs,marker,clipPath,mask,pattern,symbol'))
}

function getConnectorBounds(document) {
  const boxes = []
  Array.from(document.querySelectorAll('line')).forEach((node) => {
    if (isDefinitionNode(node)) return
    const stroke = String(node.getAttribute('stroke') || '').trim().toLowerCase()
    if (!stroke || stroke === 'none') return
    const x1 = numberAttr(node, 'x1')
    const y1 = numberAttr(node, 'y1')
    const x2 = numberAttr(node, 'x2')
    const y2 = numberAttr(node, 'y2')
    const strokePad = Math.max(6, numberAttr(node, 'stroke-width', 2) / 2 + 6)
    boxes.push(transformBox({
      x1: Math.min(x1, x2) - strokePad,
      y1: Math.min(y1, y2) - strokePad,
      x2: Math.max(x1, x2) + strokePad,
      y2: Math.max(y1, y2) + strokePad,
    }, matrixForNode(node)))
  })
  Array.from(document.querySelectorAll('polyline')).forEach((node) => {
    if (isDefinitionNode(node)) return
    const stroke = String(node.getAttribute('stroke') || '').trim().toLowerCase()
    if (!stroke || stroke === 'none') return
    const values = String(node.getAttribute('points') || '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) || []
    const xs = []
    const ys = []
    for (let i = 0; i < values.length - 1; i += 2) {
      xs.push(values[i])
      ys.push(values[i + 1])
    }
    if (xs.length) {
      const strokePad = Math.max(6, numberAttr(node, 'stroke-width', 2) / 2 + 6)
      boxes.push(transformBox({
        x1: Math.min(...xs) - strokePad,
        y1: Math.min(...ys) - strokePad,
        x2: Math.max(...xs) + strokePad,
        y2: Math.max(...ys) + strokePad,
      }, matrixForNode(node)))
    }
  })
  Array.from(document.querySelectorAll('path')).forEach((node) => {
    if (isDefinitionNode(node)) return
    const stroke = String(node.getAttribute('stroke') || '').trim().toLowerCase()
    if (!stroke || stroke === 'none') return
    const values = String(node.getAttribute('d') || '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) || []
    const xs = []
    const ys = []
    for (let i = 0; i < values.length - 1; i += 2) {
      xs.push(values[i])
      ys.push(values[i + 1])
    }
    if (xs.length) {
      const strokePad = Math.max(8, numberAttr(node, 'stroke-width', 2) / 2 + 8)
      boxes.push(transformBox({
        x1: Math.min(...xs) - strokePad,
        y1: Math.min(...ys) - strokePad,
        x2: Math.max(...xs) + strokePad,
        y2: Math.max(...ys) + strokePad,
      }, matrixForNode(node)))
    }
  })
  return boxes
}

function fitSvgIntoCanvas(svg = '') {
  try {
    const parsed = new JSDOM(String(svg || ''), { contentType: 'image/svg+xml' })
    const document = parsed.window.document
    const root = document.querySelector('svg')
    if (!root) return svg
    const viewBoxParts = (root.getAttribute('viewBox') || '0 0 900 600').trim().split(/\s+/).map(Number)
    if (viewBoxParts.length !== 4 || !viewBoxParts.every(Number.isFinite)) return svg
    const [minX, minY, width, height] = viewBoxParts
    const margin = 28
    const boxes = [
      ...getElementBounds(document),
      ...getTextBoxes(document),
    ]
    const bounds = unionBoxes(boxes)
    if (!bounds) return svg
    const target = {
      x1: minX + margin,
      y1: minY + margin,
      x2: minX + width - margin,
      y2: minY + height - margin,
    }
    const alreadyFits = containsBox(target, bounds)
    if (alreadyFits) return svg

    const availableWidth = target.x2 - target.x1
    const availableHeight = target.y2 - target.y1
    const currentWidth = bounds.x2 - bounds.x1
    const currentHeight = bounds.y2 - bounds.y1
    const scale = Math.min(1, availableWidth / currentWidth, availableHeight / currentHeight)
    const fittedWidth = currentWidth * scale
    const fittedHeight = currentHeight * scale
    const tx = target.x1 + (availableWidth - fittedWidth) / 2 - bounds.x1 * scale
    const ty = target.y1 + (availableHeight - fittedHeight) / 2 - bounds.y1 * scale
    const children = Array.from(root.childNodes).map((child) => child.outerHTML || child.textContent || '').join('')
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" role="img" aria-label="${escapeXml(root.getAttribute('aria-label') || 'Generated diagram')}"><g transform="translate(${Number(tx.toFixed(2))} ${Number(ty.toFixed(2))}) scale(${Number(scale.toFixed(4))})">${children}</g></svg>`
  } catch {
    return svg
  }
}

function validateLayoutQuality(document, viewBoxParts) {
  const checks = []
  if (!viewBoxParts || viewBoxParts.length !== 4 || !viewBoxParts.every(Number.isFinite)) return checks
  const [minX, minY, width, height] = viewBoxParts
  const maxX = minX + width
  const maxY = minY + height
  const textBoxes = getTextBoxes(document)
  const diagramLabels = textBoxes.filter((box) => box.y2 > minY + 96)
  const safetyMargin = 8
  const bounds = [...getElementBounds(document), ...textBoxes]
  const outOfBounds = bounds.filter((box) => (
    box.x1 < minX + safetyMargin ||
    box.y1 < minY + safetyMargin ||
    box.x2 > maxX - safetyMargin ||
    box.y2 > maxY - safetyMargin
  ))
  checks.push({
    name: 'content_inside_canvas',
    passed: outOfBounds.length === 0,
    detail: outOfBounds.length ? `${outOfBounds.length} visual elements extend beyond the safe canvas bounds.` : 'All visual elements stay inside safe canvas bounds.',
  })

  const offCanvas = textBoxes.filter((box) => (
    box.x1 < minX ||
    box.y1 < minY ||
    box.x2 > maxX ||
    box.y2 > maxY
  ))
  checks.push({
    name: 'text_inside_canvas',
    passed: offCanvas.length === 0,
    detail: offCanvas.length ? `${offCanvas.length} text labels extend outside the viewBox.` : 'All text stays inside the viewBox.',
  })

  const longLabels = textBoxes.filter((box) => {
    const isTitle = box.y2 <= minY + 96
    const maxChars = isTitle ? 64 : 42
    return box.lines === 1 && box.content.length > maxChars
  })
  checks.push({
    name: 'wrapped_long_text',
    passed: longLabels.length === 0,
    detail: longLabels.length ? `${longLabels.length} long labels should be wrapped or moved to a caption.` : 'No long single-line labels.',
  })

  const closePairs = []
  for (let i = 0; i < diagramLabels.length; i += 1) {
    for (let j = i + 1; j < diagramLabels.length; j += 1) {
      if (boxGap(diagramLabels[i], diagramLabels[j]) < 24) closePairs.push([diagramLabels[i], diagramLabels[j]])
    }
  }
  checks.push({
    name: 'label_spacing',
    passed: closePairs.length === 0,
    detail: closePairs.length ? `${closePairs.length} label pairs are closer than 24px.` : 'Labels have at least 24px spacing.',
  })

  const rects = getSmallRectBoxes(document)
  const overlappingRects = []
  for (let i = 0; i < rects.length; i += 1) {
    for (let j = i + 1; j < rects.length; j += 1) {
      if (!boxesOverlap(rects[i], rects[j])) continue
      if (containsBox(rects[i], rects[j]) || containsBox(rects[j], rects[i])) continue
      overlappingRects.push([rects[i], rects[j]])
    }
  }
  checks.push({
    name: 'no_overlapping_boxes',
    passed: overlappingRects.length === 0,
    detail: overlappingRects.length ? `${overlappingRects.length} small boxes overlap.` : 'No overlapping small boxes detected.',
  })

  const textConnectorOverlaps = []
  const connectorBoxes = getConnectorBounds(document)
  diagramLabels.forEach((label) => {
    connectorBoxes.forEach((connector) => {
      if (boxesOverlap(label, connector)) textConnectorOverlaps.push([label, connector])
    })
  })
  checks.push({
    name: 'text_diagram_overlap',
    passed: textConnectorOverlaps.length === 0,
    detail: textConnectorOverlaps.length
      ? `${textConnectorOverlaps.length} estimated text/connector overlaps; route wires, arrows, and curves around labels or move labels to clear lanes.`
      : 'No estimated text/connector overlaps detected.',
  })

  const rectCount = document.querySelectorAll('rect').length
  const labelBoxCount = rects.length
  const shapeCount = document.querySelectorAll('rect,circle,ellipse,line,path,polygon,polyline').length
  const tooManyLabelBoxes = labelBoxCount > Math.max(10, textBoxes.length + 4)
  checks.push({
    name: 'visual_clutter',
    passed: !tooManyLabelBoxes && shapeCount <= 140 && rectCount <= 55,
    detail: tooManyLabelBoxes
      ? `${labelBoxCount} small boxes for ${textBoxes.length} text labels; prefer plain labels and fewer nested boxes.`
      : shapeCount > 140 || rectCount > 55
        ? `${shapeCount} shapes / ${rectCount} rectangles; simplify the diagram structure.`
        : 'Visual structure is not overly box-heavy.',
  })

  const bottomCrowding = textBoxes.filter((box) => box.y1 > maxY - 92)
  checks.push({
    name: 'caption_zone',
    passed: bottomCrowding.length <= 2 && bottomCrowding.every((box) => box.x1 >= minX + 60 && box.x2 <= maxX - 60),
    detail: bottomCrowding.length > 2
      ? `${bottomCrowding.length} text blocks crowd the bottom caption zone.`
      : bottomCrowding.some((box) => box.x1 < minX + 60 || box.x2 > maxX - 60)
        ? 'Bottom caption text is too close to the canvas edge.'
        : 'Bottom caption zone is clean.',
  })
  return checks
}

// Layout checks rely on estimated text geometry (JSDOM does no real layout), so
// they over-flag well-rendered diagrams. They stay in the report for review but
// must not reject the SVG or trigger a regeneration on their own.
const ADVISORY_CHECK_NAMES = new Set([
  'content_inside_canvas',
  'text_inside_canvas',
  'wrapped_long_text',
  'label_spacing',
  'no_overlapping_boxes',
  'text_diagram_overlap',
  'visual_clutter',
  'caption_zone',
])

export function summarizeChecks(checks = []) {
  const blockingFailures = checks.filter((check) => !check.passed && !ADVISORY_CHECK_NAMES.has(check.name))
  return {
    passed: blockingFailures.length === 0,
    failureSummary: blockingFailures.map((check) => `${check.name}: ${check.detail}`).join(' '),
  }
}

const configuredVisualAttempts = Number(process.env.PATHAI_VISUAL_MAX_ATTEMPTS)
const MAX_VISUAL_ATTEMPTS = Number.isFinite(configuredVisualAttempts) && configuredVisualAttempts > 0
  ? Math.min(3, Math.max(1, Math.round(configuredVisualAttempts)))
  : 2

export function isVisualRateLimitError(error) {
  const message = String(error?.message || '')
  return error?.status === 429 || error?.code === 'rate_limited' || /429|rate.?limit|quota/i.test(message)
}

function listFailures(report) {
  return (Array.isArray(report?.checks) ? report.checks : [])
    .filter((check) => !check.passed)
    .map((check) => `${check.name}: ${check.detail}`)
    .join(' ')
}

// Weighs blocking failures far above advisory layout heuristics, so the best
// attempt is chosen for structural correctness first and tidiness second.
function validationScore(report) {
  return (Array.isArray(report?.checks) ? report.checks : []).reduce((score, check) => {
    if (check.passed) return score
    return score + (ADVISORY_CHECK_NAMES.has(check.name) ? 1 : 100)
  }, 0)
}

export function validateSvgQuality(svg) {
  const checks = []
  try {
    const parsed = new JSDOM(String(svg || ''), { contentType: 'image/svg+xml' })
    const document = parsed.window.document
    const root = document.querySelector('svg')
    checks.push({ name: 'well_formed_xml', passed: Boolean(root), detail: root ? 'SVG root parsed.' : 'Missing SVG root.' })
    const viewBox = root?.getAttribute('viewBox') || ''
    const viewBoxParts = viewBox.trim().split(/\s+/).map(Number)
    const viewBoxOk = viewBoxParts.length === 4 && viewBoxParts.every(Number.isFinite) && viewBoxParts[2] > 0 && viewBoxParts[3] > 0
    checks.push({ name: 'view_box', passed: viewBoxOk, detail: viewBoxOk ? viewBox : 'Missing or invalid viewBox.' })
    const textNodes = Array.from(document.querySelectorAll('text,tspan'))
    const tinyText = textNodes.filter((node) => {
      const value = Number(node.getAttribute('font-size') || node.parentElement?.getAttribute('font-size') || 16)
      return Number.isFinite(value) && value < 12
    })
    checks.push({ name: 'readable_text', passed: tinyText.length === 0 && textNodes.length >= 2, detail: tinyText.length ? `${tinyText.length} text nodes below 12px.` : `${textNodes.length} labels present.` })
    const dangerous = document.querySelectorAll('script,foreignObject,iframe,object,embed').length
    checks.push({ name: 'safe_svg_tags', passed: dangerous === 0, detail: dangerous ? `${dangerous} unsafe tags present.` : 'No unsafe tags.' })
    if (root && viewBoxOk) checks.push(...validateLayoutQuality(document, viewBoxParts))
  } catch (error) {
    checks.push({ name: 'well_formed_xml', passed: false, detail: error?.message || 'SVG parse failed.' })
  }
  return { ...summarizeChecks(checks), checks }
}

const TEMPLATE_VALIDATION_CHECKS = new Set([
  'well_formed_xml',
  'view_box',
  'readable_text',
  'safe_svg_tags',
])

function validateTemplateSvgQuality(svg) {
  const report = validateSvgQuality(svg)
  const checks = (report.checks || []).filter((check) => TEMPLATE_VALIDATION_CHECKS.has(check.name))
  return {
    ...report,
    ...summarizeChecks(checks),
    checks,
  }
}

function withGroundingCheck(validation, grounding) {
  const checks = [
    ...(Array.isArray(validation?.checks) ? validation.checks : []),
    {
      name: 'concept_grounding',
      passed: Boolean(grounding?.passed),
      detail: grounding?.detail || 'Concept grounding was not checked.',
    },
  ]
  return {
    ...validation,
    ...summarizeChecks(checks),
    checks,
  }
}

async function requestAiSvg({ concept, validationFeedback = '' }) {
  if (!process.env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY.')
  const model = getOpenAIModel('fullAiSvg')
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      max_completion_tokens: 5000,
      temperature: 0.2,
      response_format: FULL_AI_SVG_RESPONSE_FORMAT,
      messages: [
        { role: 'system', content: 'You create accurate educational diagram payloads. Prefer structured template data when it fits; use freeform SVG only when needed. Return schema-valid JSON only.' },
        { role: 'user', content: buildFullAiSvgPrompt({ concept, validationFeedback }) },
      ],
    }),
    signal: AbortSignal.timeout(65000),
  })
  if (!response.ok) {
    const message = await response.text().catch(() => '')
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after')
      const error = new Error(
        `OpenAI rate-limited SVG generation${retryAfter ? `; retry after about ${retryAfter}s` : ''}. ` +
        'Try again shortly, or set OPENAI_MODEL_FULL_AI_SVG to a lighter model for heavier diagram testing.'
      )
      error.status = 429
      error.code = 'rate_limited'
      error.retryAfter = retryAfter
      error.upstreamMessage = message.slice(0, 1000)
      throw error
    }
    const error = new Error(message || `OpenAI returned ${response.status}.`)
    error.status = response.status
    throw error
  }
  const payload = await response.json()
  const raw = payload?.choices?.[0]?.message?.content
  if (!raw) throw new Error('OpenAI returned an empty SVG payload.')
  return { ...parseModelJson(raw), modelUsed: model }
}

function renderResponseToSvg(payload = {}) {
  const kind = String(payload.kind || '').trim()
  const title = String(payload.title || 'AI-generated diagram').trim().slice(0, 120)
  if (kind === 'freeform') {
    if (!payload.svg) throw new Error('Freeform visual response is missing svg.')
    return {
      title,
      svg: payload.svg,
      visualKind: 'ai_svg',
      modelUsed: payload.modelUsed,
      templateKind: 'freeform',
      templatePath: 'freeform',
    }
  }
  if (!TEMPLATE_KINDS.includes(kind)) throw new Error(`Unsupported visual response kind: ${kind || 'missing'}.`)
  const svg = renderTemplateSvg(kind, payload[kind], title)
  return {
    title,
    svg,
    visualKind: `template_${kind}`,
    modelUsed: payload.modelUsed,
    templateKind: kind,
    templatePath: 'template',
  }
}

function staticFallbackResult(concept, startedAt, failureReason = null) {
  const svg = buildGenericSvg(concept)
  return {
    title: String(concept || 'Concept map').slice(0, 80),
    svg,
    visualKind: 'concept_map_fallback',
    modelUsed: 'emergency-static-fallback',
    validationReport: validateSvgQuality(svg),
    ms: Date.now() - startedAt,
    source: 'fallback',
    failureReason,
  }
}

export async function generateStandardVisualDiagram({ concept = '' } = {}) {
  const startedAt = Date.now()
  if (process.env.PATHAI_VISUAL_GENERATION_MODE === 'static_fallback_only') {
    return staticFallbackResult(concept, startedAt)
  }

  try {
    const attempts = []
    let repairFeedback = ''
    let lastGenerationError = null
    for (let attempt = 0; attempt < MAX_VISUAL_ATTEMPTS; attempt += 1) {
      let result
      try {
        const payload = await requestAiSvg({ concept, validationFeedback: repairFeedback })
        result = renderResponseToSvg(payload)
      } catch (error) {
        lastGenerationError = error
        repairFeedback = `Template response invalid: ${error?.message || 'unknown error'}`
        continue
      }
      if (result.templatePath === 'freeform') result.svg = fitSvgIntoCanvas(result.svg)
      const grounding = validateConceptGrounding(concept, result)
      const svgValidation = result.templatePath === 'template'
        ? validateTemplateSvgQuality(result.svg)
        : validateSvgQuality(result.svg)
      if (result.templatePath === 'template' && !svgValidation.passed) {
        throw new Error(`Template renderer produced invalid SVG for ${result.templateKind}: ${svgValidation.failureSummary}`)
      }
      const combined = withGroundingCheck(svgValidation, grounding)
      attempts.push({ result, combined })
      if (combined.checks.every((check) => check.passed)) {
        return { ...result, validationReport: combined, ms: Date.now() - startedAt, source: 'ai', failureReason: null }
      }
      // Feed the exact failing checks back so the next pass repairs those parts
      // rather than regenerating from scratch or dropping content.
      repairFeedback = listFailures(combined)
    }

    if (!attempts.length) throw lastGenerationError || new Error('Visual generation produced no renderable attempts.')

    const best = attempts.reduce((leader, candidate) => (
      validationScore(candidate.combined) < validationScore(leader.combined) ? candidate : leader
    ))

    // Blocking checks pass: show the best repaired diagram even if a layout
    // heuristic is still imperfect, rather than discarding good content.
    if (best.combined.passed) {
      return {
        ...best.result,
        validationReport: best.combined,
        ms: Date.now() - startedAt,
        source: 'ai',
        failureReason: listFailures(best.combined) || null,
      }
    }

    throw new Error(best.combined.failureSummary || 'Dynamic SVG generation failed validation.')
  } catch (error) {
    // Normal dev/prod behavior must not show a fake generic concept map. If
    // generation fails, surface the error so the prompt/repair loop can be
    // tuned. The only deterministic fallback is the explicit emergency mode
    // above: PATHAI_VISUAL_GENERATION_MODE=static_fallback_only.
    throw error
  }
}
