const BROAD_TOPIC_PATTERNS = [
  /\bintroduction to\b/i,
  /\bbasics?\b/i,
  /\bfundamentals?\b/i,
  /\bprogramming fundamentals?\b/i,
  /\bvariables?\s+and\s+data\s+types?\b/i,
  /\bcontrol flow\b/i,
  /\bfunctions?\s+and\s+scope\b/i,
  /\bdata structures?\b/i,
  /\bloops?\s+and\s+conditionals?\b/i,
  /\bconditionals?\s+and\s+loops?\b/i,
  /\bspanish basics?\b/i,
  /\bspanish fundamentals?\b/i,
  /\bcybersecurity overview\b/i,
  /\bphysics basics?\b/i,
  /\bmath basics?\b/i,
  /\bpython basics?\b/i,
  /\bpython fundamentals?\b/i,
]

const META_FILLER_PATTERNS = [
  /\bat the end of this lesson\b/i,
  /\bthis lesson will teach\b/i,
  /\byou will explore\b/i,
  /\blearning journey\b/i,
  /\bstrong foundation\b/i,
  /\bbuild(?:ing)? blocks?\b/i,
  /\bkey concepts\b/i,
  /\bsupports progress\b/i,
  /\bconcepts are tools\b/i,
  /\bexamples prove\b/i,
  /\bpractice turns memory\b/i,
]

const ALLOWED_SLIDE_TYPES = new Set([
  'concept_intro',
  'example',
  'visual_interactive',
  'code_breakdown',
  'mini_check',
  'final_check',
])

const INTERACTIVE_VISUAL_TYPES = new Set([
  'code_output_visual',
  'free_body_diagram',
  'graph_visual',
  'equation_builder',
  'dialogue_builder',
  'email_threat_scan',
  'terminal_log_visual',
  'circuit_diagram',
  'anatomy_diagram',
  'chemistry_particle_visual',
  'portfolio_chart_visual',
  'design_canvas_visual',
  'timeline_builder',
  'map_interaction',
  'molecule_builder',
  'probability_visualizer',
  'ecosystem_simulator',
  'architecture_stack_visual',
  'audio_wave_visual',
  'music_pattern_builder',
  'grammar_tree_visual',
  'body_motion_visual',
  'business_strategy_visual',
  'logic_flow_visual',
  'storytelling_scene_visual',
  'ui_layout_visual',
  'ai_model_flow_visual',
])

const INTERACTION_PRIMITIVES = new Set([
  'identify',
  'build',
  'predict',
  'trace',
  'fix',
  'manipulate',
  'compare',
])

const VISUAL_TYPES = new Set([
  'none',
  'diagram',
  'flow',
  'comparison',
  'code_flow',
  'variable_box',
  'check_card',
  'nested',
  'system_flow',
])

const PROGRAMMING_TOPIC_MAP = [
  { test: /\bvariables?\s+and\s+data\s+types?\b/i, topic: 'What is a variable?' },
  { test: /\bvariables?\s+and\b/i, topic: 'What is a variable?' },
  { test: /\bintroduction to python\b|\bpython basics?\b|\bpython fundamentals?\b/i, topic: 'How to use print()' },
  { test: /\bhtml\b.*\bdocument structure\b|\bdocument structure\b.*\bhtml\b/i, topic: 'How an HTML document is structured' },
  { test: /\bhtml basics?\b|\bintroduction to html\b|\bhtml fundamentals?\b/i, topic: 'What is an HTML tag?' },
  { test: /\bcontrol flow\b/i, topic: 'How an if statement chooses between branches' },
  { test: /\bfunctions?\s+and\s+scope\b|\bfunctions?\b/i, topic: 'How to call a function' },
  { test: /\bloops?\b/i, topic: 'How a for loop repeats code' },
  { test: /\brange\(\)\b|\brange\b/i, topic: 'How range() works in a for loop' },
  { test: /\breturn\b/i, topic: 'What a return statement does' },
  { test: /\bassignment\b|=\s*works\b/i, topic: 'How assignment with = works' },
  { test: /\bdata structures?\b/i, topic: 'What is a list?' },
]

const GENERAL_ATOMIC_TOPIC_MAP = [
  { test: /\bspanish basics?\b|\bspanish fundamentals?\b/i, topic: "How to say 'I want' with quiero" },
  { test: /\bcybersecurity overview\b|\bsecurity basics?\b/i, topic: 'How urgency is used in phishing' },
  { test: /\bphysics basics?\b|\bintroduction to physics\b/i, topic: 'How gravity points downward' },
  { test: /\bmath basics?\b|\bintroduction to algebra\b/i, topic: 'How slope means rise over run' },
  { test: /\barduino basics?\b|\bintroduction to arduino\b/i, topic: 'What Arduino controls' },
  { test: /\bfinance basics?\b|\binvesting basics?\b/i, topic: 'What diversification means' },
  { test: /\bdesign basics?\b|\bui basics?\b|\bux basics?\b/i, topic: 'How contrast makes text readable' },
  { test: /\bloops?\s+and\s+conditionals?\b|\bconditionals?\s+and\s+loops?\b/i, topic: 'How an if statement chooses between branches' },
]

function cleanText(value, fallback = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim()
}

function cleanMultiline(value, fallback = '') {
  const source = String(value ?? fallback ?? '').replace(/\r\n/g, '\n')
  return source
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trimEnd())
    .join('\n')
    .trim()
}

function stripLearningVerb(value) {
  return cleanText(value)
    .replace(/^what\s+is\s+(learn|understand|master|study|practice|explore|review|build|cover)\s+/i, '')
    .replace(/^how\s+to\s+(learn|understand|master|study|practice|explore|review|build|cover)\s+/i, 'How to ')
    .replace(/^(i\s+want\s+to\s+)?(learn|understand|master|study|practice|explore|review|build|cover)\s+(about\s+)?/i, '')
    .replace(/^(intro|introduction)\s+to\s+/i, '')
    .trim()
}

function sentenceCase(value) {
  const text = cleanText(value)
  if (!text) return text
  if (/^[A-Z0-9\s().#+/=:-]+$/.test(text)) return text
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function asSpecificQuestion(value, context = {}) {
  const text = sentenceCase(stripLearningVerb(value))
  if (!text) return isProgrammingContext(context, value) ? 'How to use print()' : 'What is this concept?'
  if (/^what\s+is\s+html\s+document\s+structure/i.test(text)) return 'How an HTML document is structured'
  if (/^what\s+is\s+python\s+basics/i.test(text)) return 'How to use print()'
  if (/\bhtml\b.*\bdocument structure\b|\bdocument structure\b.*\bhtml\b/i.test(text)) return 'How an HTML document is structured'
  if (/^html$/i.test(text)) return 'What is an HTML tag?'
  if (/^python$/i.test(text) || /\bpython\s+basics?\b/i.test(text)) return 'How to use print()'
  if (/[?]$/.test(text) || /^(how|what|why|when|where|which)\b/i.test(text)) return text
  if (/^(for|if|while)\s+loop/i.test(text)) return `How a ${text.replace(/\s+basics?$/i, '')} works`
  return `What is ${text}?`
}

function normalizedSlideTitle(slide, fallback, topic) {
  const title = cleanText(slide?.title, fallback?.title || topic)
  if (slide?.type === 'concept_intro') return topic
  if (/\bwhat\s+is\s+(learn|understand|master|study|practice|explore|review|build|cover)\b/i.test(title)) {
    return cleanText(fallback?.title, topic)
  }
  if (/\bwhat\s+is\s+html\s+document\s+structure/i.test(title)) return 'How an HTML document is structured'
  if (/\bwhat\s+is\s+python\s+basics/i.test(title)) return 'How to use print()'
  return title
}

function slugify(value) {
  return cleanText(value, 'concept')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 72) || 'concept'
}

function hasBroadJoiner(topic) {
  const normalized = cleanText(topic)
  if (!/\s+and\s+/i.test(normalized)) return false
  return !/^how\s+.*\s+and\s+/i.test(normalized)
}

export function narrowConceptTopic(rawTopic, context = {}) {
  const fallback = context?.taskTitle || context?.concept || 'How to use print()'
  const original = cleanText(rawTopic, fallback)
  const cleanedOriginal = stripLearningVerb(original)
  const lower = `${original} ${cleanedOriginal}`.toLowerCase()
  const programmingish = /python|html|css|javascript|code|program|function|loop|variable|print|if statement|return|range|list|tag|document structure/.test(
    `${lower} ${context?.goal || ''} ${context?.domain || ''}`.toLowerCase(),
  )

  let narrowed = cleanedOriginal || original
  let rejectedBroadTopic = null
  const broad = BROAD_TOPIC_PATTERNS.some((pattern) => pattern.test(original) || pattern.test(cleanedOriginal)) || hasBroadJoiner(original) || hasBroadJoiner(cleanedOriginal)

  if (broad) {
    rejectedBroadTopic = original
    if (programmingish) {
      const mapped = PROGRAMMING_TOPIC_MAP.find((entry) => entry.test.test(original) || entry.test.test(cleanedOriginal))
      narrowed = mapped?.topic || 'How to use print()'
    } else {
      const mapped = GENERAL_ATOMIC_TOPIC_MAP.find((entry) => entry.test.test(original) || entry.test.test(cleanedOriginal))
      if (mapped) {
        narrowed = mapped.topic
      } else if (/ and /i.test(cleanedOriginal || original)) {
        narrowed = asSpecificQuestion((cleanedOriginal || original).split(/\s+and\s+/i)[0].trim(), context)
      } else {
        narrowed = (cleanedOriginal || original)
          .replace(/\bintroduction to\b/i, 'How to use')
          .replace(/\bbasics?\b/i, '')
          .replace(/\bfundamentals?\b/i, '')
          .replace(/\boverview\b/i, '')
          .trim()
        narrowed = asSpecificQuestion(narrowed, context)
      }
    }
  }

  narrowed = asSpecificQuestion(narrowed, context)
    .replace(/\bwhat is\s+(learn|understand|master|study|practice|explore|review|build|cover)\s+/i, 'What is ')
    .replace(/\bhow to\s+(learn|understand|master|study|practice|explore|review|build|cover)\s+/i, 'How to ')

  if (!cleanText(narrowed)) narrowed = programmingish ? 'How to use print()' : asSpecificQuestion(original, context)

  return {
    topic: cleanText(narrowed),
    specificityCheck: {
      isSpecific: true,
      rejectedBroadTopic,
    },
  }
}

export function normalizeAtomicTopic(topic, domain = '') {
  const context = typeof domain === 'object' && domain
    ? domain
    : { domain }
  const originalTopic = cleanText(topic, context?.concept || context?.taskTitle || 'How to use print()')
  const narrowed = narrowConceptTopic(originalTopic, context)
  return {
    topic: narrowed.topic,
    wasNarrowed: Boolean(narrowed.specificityCheck.rejectedBroadTopic || cleanText(narrowed.topic) !== cleanText(originalTopic)),
    originalTopic,
  }
}

export function containsMetaFiller(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value || '')
  return META_FILLER_PATTERNS.some((pattern) => pattern.test(text))
}

function isProgrammingContext(context = {}, topic = '') {
  return /program|code|python|javascript|computer science|cs_coding/i.test(
    `${context?.domain || ''} ${context?.domainConfig?.workspaceType || ''} ${context?.goal || ''} ${topic}`,
  )
}

function visualDomainSignal(context = {}, topic = '') {
  return cleanText([
    context?.domain,
    context?.domainConfig?.workspaceType,
    context?.goal,
    context?.taskTitle,
    context?.concept,
    topic,
  ].filter(Boolean).join(' ')).toLowerCase()
}

function inferDomainVisualType(topic = '', context = {}) {
  const signal = visualDomainSignal(context, topic)
  if (isProgrammingContext(context, topic)) return 'code_output_visual'
  if (/\b(history|timeline|chronology|mitosis|project management|startup stages|economic events)\b/.test(signal)) return 'timeline_builder'
  if (/\b(geography|map|country|region|trade route|climate zone|geopolitics|environmental science)\b/.test(signal)) return 'map_interaction'
  if (/\b(music theory|rhythm|chord|melody|piano|drum)\b/.test(signal)) return 'music_pattern_builder'
  if (/\b(audio|waveform|frequency|pitch|amplitude|sound wave)\b/.test(signal)) return 'audio_wave_visual'
  if (/\b(grammar tree|syntax|subject|object|linguistics)\b/.test(signal)) return 'grammar_tree_visual'
  if (/\b(fitness|sports science|body motion|muscle|form|movement mechanics)\b/.test(signal)) return 'body_motion_visual'
  if (/\b(writing|literature|story|storytelling|tone|communication)\b/.test(signal)) return 'storytelling_scene_visual'
  if (/\b(architecture|networking|cloud|api|database|request flow|frontend|backend)\b/.test(signal)) return 'architecture_stack_visual'
  if (/\b(logic|boolean|decision tree|reasoning|algorithm path)\b/.test(signal)) return 'logic_flow_visual'
  if (/\b(ai model|neural net|overfitting|model performance|accuracy|loss)\b/.test(signal)) return 'ai_model_flow_visual'
  if (/\b(probability|expected value|risk reward|distribution|randomness)\b/.test(signal)) return 'probability_visualizer'
  if (/\b(ecosystem|predator|prey|food chain|population)\b/.test(signal)) return 'ecosystem_simulator'
  if (/\b(arduino|electronics?|circuit|led|resistor|battery)\b/.test(signal)) return 'circuit_diagram'
  if (/\b(cyber|security|phishing|social engineering|email threat|threat model)\b/.test(signal)) {
    if (/\b(logs?|terminal|login|ssh|system|devops)\b/.test(signal)) return 'terminal_log_visual'
    return 'email_threat_scan'
  }
  if (/\b(physics|force|gravity|friction|normal force|acceleration|motion)\b/.test(signal)) {
    if (/\b(graph|slope|position|velocity|time)\b/.test(signal)) return 'graph_visual'
    return 'free_body_diagram'
  }
  if (/\b(math|algebra|equation|formula|chemistry|balance|reaction|stoichiometry)\b/.test(signal)) {
    if (/\b(slope|graph|function|trend|line)\b/.test(signal)) return 'graph_visual'
    if (/\b(chemistry|atom|molecule|bond|particle|water)\b/.test(signal)) return /\bbuild|assemble|connect\b/.test(signal) ? 'molecule_builder' : 'chemistry_particle_visual'
    return 'equation_builder'
  }
  if (/\b(data science|statistics|statistic|trend|chart|graph|dataset|analytics|machine learning|ml_ai)\b/.test(signal)) return 'graph_visual'
  if (/\b(spanish|french|language|foreign_language|grammar|phrase|translation|conversation)\b/.test(signal)) return 'dialogue_builder'
  if (/\b(biology|anatomy|medicine|health|heart|body|cell|organ)\b/.test(signal)) return 'anatomy_diagram'
  if (/\b(finance|business|economics|portfolio|diversification|allocation|risk|market)\b/.test(signal)) return 'portfolio_chart_visual'
  if (/\b(strategy|funnel|pricing|customer acquisition|market positioning|startup scaling)\b/.test(signal)) return 'business_strategy_visual'
  if (/\b(ui layout|spacing hierarchy|ux issue|product design)\b/.test(signal)) return 'ui_layout_visual'
  if (/\b(design|ui|ux|art|contrast|layout|typography|visual hierarchy)\b/.test(signal)) return 'design_canvas_visual'
  return 'graph_visual'
}

function inferInteractionPrimitive(domainVisualType = '', topic = '', context = {}) {
  const signal = visualDomainSignal(context, topic)
  if (INTERACTION_PRIMITIVES.has(context?.interactionPrimitive)) return context.interactionPrimitive
  if (/fix|repair|debug|correct|mitigation|improve/i.test(signal)) return 'fix'
  if (/compare|versus|vs|safe vs|before.?after|correct vs|risky vs/i.test(signal)) return 'compare'
  if (/slider|adjust|change|increase|decrease|allocation|voltage|gravity|frequency|probability|temperature/i.test(signal)) return 'manipulate'
  if (/trace|flow|path|current|execution|request|packet|route/i.test(signal)) return 'trace'
  if (/predict|what happens|what prints|outcome|result/i.test(signal)) return 'predict'
  if (/build|assemble|arrange|order|construct/i.test(signal)) return 'build'
  if (['equation_builder', 'dialogue_builder', 'timeline_builder', 'molecule_builder', 'music_pattern_builder'].includes(domainVisualType)) return 'build'
  if (['terminal_log_visual', 'architecture_stack_visual', 'logic_flow_visual', 'ai_model_flow_visual'].includes(domainVisualType)) return 'trace'
  if (['probability_visualizer', 'ecosystem_simulator', 'audio_wave_visual'].includes(domainVisualType)) return 'manipulate'
  if (['portfolio_chart_visual', 'design_canvas_visual', 'ui_layout_visual', 'business_strategy_visual', 'storytelling_scene_visual'].includes(domainVisualType)) return 'compare'
  return 'identify'
}

function defaultInteractiveData(domainVisualType, topic = 'this concept', context = {}) {
  const signal = visualDomainSignal(context, topic)
  if (domainVisualType === 'code_output_visual') {
    if (/print/i.test(signal)) {
      return {
        code: 'print("Hi")',
        output: 'Hi',
        highlightedLine: 1,
      }
    }
    return {
      code: 'name = "Sri"\nprint(name)',
      output: 'Sri',
      highlightedLine: 2,
    }
  }
  if (domainVisualType === 'free_body_diagram') {
    return {
      objectLabel: /ball/i.test(signal) ? 'ball' : 'box',
      arrows: [
        { direction: 'down', label: 'gravity', correct: true },
        { direction: 'up', label: 'normal force', correct: false },
      ],
    }
  }
  if (domainVisualType === 'graph_visual') {
    if (/\bslope\b/i.test(signal)) {
      return {
        xLabel: 'run',
        yLabel: 'rise',
        points: [[0, 0], [1, 2], [2, 4]],
        highlight: 'slope',
      }
    }
    return {
      xLabel: 'time',
      yLabel: 'value',
      points: [[0, 0], [1, 2], [2, 4]],
      highlight: 'trend',
    }
  }
  if (domainVisualType === 'equation_builder') {
    if (/\bforce|acceleration|physics\b/i.test(signal)) {
      return {
        target: 'F = m x a',
        pieces: ['F', '=', 'm', 'x', 'a'],
        explanation: 'Force equals mass times acceleration.',
      }
    }
    return {
      target: 'rise / run',
      pieces: ['rise', '/', 'run'],
      explanation: 'Slope compares vertical change to horizontal change.',
    }
  }
  if (domainVisualType === 'dialogue_builder') {
    return {
      scenario: 'Ordering food',
      nativePrompt: 'I want water.',
      targetLanguage: 'Spanish',
      correctSentence: 'quiero agua',
      wordTiles: ['agua', 'quiero', 'yo', 'el'],
    }
  }
  if (domainVisualType === 'email_threat_scan') {
    return {
      sender: 'support@paypaI-security.com',
      subject: 'Urgent: Verify your account',
      body: 'Click this link now or your account will be closed.',
      redFlags: ['fake domain', 'urgency', 'threatening language'],
    }
  }
  if (domainVisualType === 'terminal_log_visual') {
    return {
      logs: [
        '10:01 login attempt user=admin failed',
        '10:02 login attempt user=admin failed',
        '10:03 login success user=admin ip=unknown',
      ],
      suspiciousIndex: 2,
    }
  }
  if (domainVisualType === 'circuit_diagram') {
    return {
      components: ['battery', 'resistor', 'LED'],
      question: 'Why is the resistor needed?',
      answer: 'To limit current and protect the LED.',
    }
  }
  if (domainVisualType === 'anatomy_diagram') {
    return {
      system: /heart/i.test(signal) ? 'heart' : 'body system',
      labels: /heart/i.test(signal) ? ['left ventricle', 'right atrium', 'aorta'] : ['structure', 'function', 'pathway'],
    }
  }
  if (domainVisualType === 'chemistry_particle_visual') {
    return {
      concept: /water/i.test(signal) ? 'water molecule' : cleanText(topic, 'molecule'),
      particles: /water/i.test(signal)
        ? [{ label: 'O', count: 1 }, { label: 'H', count: 2 }]
        : [{ label: 'A', count: 1 }, { label: 'B', count: 1 }],
    }
  }
  if (domainVisualType === 'portfolio_chart_visual') {
    return {
      allocations: [
        { label: 'Tech', value: 70 },
        { label: 'Healthcare', value: 15 },
        { label: 'Cash', value: 15 },
      ],
      insight: 'This portfolio is heavily concentrated in tech.',
    }
  }
  if (domainVisualType === 'design_canvas_visual') {
    return {
      issue: 'low contrast',
      before: 'gray text on black',
      after: 'brighter text with better spacing',
    }
  }
  if (domainVisualType === 'timeline_builder') {
    return {
      events: ['Start', 'Middle step', 'Result'],
      target: 'Start > Middle step > Result',
      explanation: 'The order shows how the concept progresses over time.',
    }
  }
  if (domainVisualType === 'map_interaction') {
    return {
      regions: ['Region A', 'Region B', 'Region C'],
      route: ['Region A', 'Region B', 'Region C'],
      target: 'Region B',
      explanation: 'The highlighted region or route is the key geographic signal.',
    }
  }
  if (domainVisualType === 'molecule_builder') {
    return {
      atoms: ['H', 'O', 'H'],
      bonds: ['H-O', 'O-H'],
      target: 'H O H',
      explanation: 'The molecule works when the atoms connect in the right pattern.',
    }
  }
  if (domainVisualType === 'probability_visualizer') {
    return {
      variableLabel: 'Probability',
      min: 0,
      max: 100,
      value: 60,
      target: 'higher probability means a larger expected bar',
      explanation: 'Changing probability changes the expected outcome size.',
    }
  }
  if (domainVisualType === 'ecosystem_simulator') {
    return {
      variableLabel: 'Predators',
      min: 0,
      max: 100,
      value: 45,
      target: 'balance',
      explanation: 'Changing one population affects the rest of the ecosystem.',
    }
  }
  if (domainVisualType === 'architecture_stack_visual') {
    return {
      layers: ['Client', 'API', 'Database'],
      route: ['Client', 'API', 'Database'],
      target: 'API',
      explanation: 'The request moves through each architecture layer in order.',
    }
  }
  if (domainVisualType === 'audio_wave_visual') {
    return {
      variableLabel: 'Frequency',
      min: 1,
      max: 10,
      value: 4,
      target: 'higher frequency makes tighter waves',
      explanation: 'Frequency controls how close together the wave peaks are.',
    }
  }
  if (domainVisualType === 'music_pattern_builder') {
    return {
      notes: ['C', 'E', 'G'],
      target: 'C E G',
      explanation: 'The pattern is correct when the notes are placed in order.',
    }
  }
  if (domainVisualType === 'grammar_tree_visual') {
    return {
      sentence: 'I want water',
      labels: ['subject', 'verb', 'object'],
      target: 'verb',
      explanation: 'The selected word/branch shows the grammar role.',
    }
  }
  if (domainVisualType === 'body_motion_visual') {
    return {
      muscleGroups: ['shoulder', 'core', 'knee'],
      target: 'core',
      explanation: 'The highlighted area is the mechanic the movement depends on.',
    }
  }
  if (domainVisualType === 'business_strategy_visual') {
    return {
      strategies: ['Low price', 'Premium niche', 'Mass market'],
      target: 'Premium niche',
      explanation: 'The selected strategy matches the business tradeoff in the concept.',
    }
  }
  if (domainVisualType === 'logic_flow_visual') {
    return {
      branches: ['Start', 'Condition', 'True branch'],
      target: 'Start > Condition > True branch',
      explanation: 'The logic path follows the condition to the correct branch.',
    }
  }
  if (domainVisualType === 'storytelling_scene_visual') {
    return {
      scenes: ['Setup', 'Conflict', 'Resolution'],
      target: 'Conflict',
      explanation: 'The selected scene carries the emotional or structural function.',
    }
  }
  if (domainVisualType === 'ui_layout_visual') {
    return {
      issue: 'spacing hierarchy',
      before: 'crowded controls',
      after: 'grouped controls with clear spacing',
      target: 'spacing hierarchy',
      explanation: 'The fix makes the visual hierarchy easier to scan.',
    }
  }
  if (domainVisualType === 'ai_model_flow_visual') {
    return {
      modelNodes: ['Data', 'Model', 'Prediction'],
      route: ['Data', 'Model', 'Prediction'],
      target: 'Model',
      explanation: 'Data flows through the model to create a prediction.',
    }
  }
  return {
    xLabel: 'input',
    yLabel: 'result',
    points: [[0, 0], [1, 1], [2, 2]],
    highlight: 'pattern',
  }
}

function defaultInteractivePrompt(domainVisualType, topic = 'this concept') {
  if (domainVisualType === 'code_output_visual') return 'Click the output that this code displays.'
  if (domainVisualType === 'free_body_diagram') return 'Click the arrow that matches the force in this topic.'
  if (domainVisualType === 'graph_visual') return 'Click the highlighted feature that explains the graph.'
  if (domainVisualType === 'equation_builder') return 'Build the formula in the correct order.'
  if (domainVisualType === 'dialogue_builder') return 'Build the target sentence from the word tiles.'
  if (domainVisualType === 'email_threat_scan') return 'Click the suspicious part that reveals the trick.'
  if (domainVisualType === 'terminal_log_visual') return 'Click the log line that needs investigation.'
  if (domainVisualType === 'circuit_diagram') return 'Choose the answer that explains the circuit part.'
  if (domainVisualType === 'anatomy_diagram') return 'Click the label connected to the concept.'
  if (domainVisualType === 'chemistry_particle_visual') return 'Click the particle model that matches the concept.'
  if (domainVisualType === 'portfolio_chart_visual') return 'Click the largest concentration or risk signal.'
  if (domainVisualType === 'design_canvas_visual') return 'Click the design issue shown in the before state.'
  if (domainVisualType === 'timeline_builder') return 'Build the timeline in the correct order.'
  if (domainVisualType === 'map_interaction') return 'Click the region or trace the route that matches the concept.'
  if (domainVisualType === 'molecule_builder') return 'Build the molecule by selecting atoms in the correct order.'
  if (domainVisualType === 'probability_visualizer') return 'Adjust the probability and notice how the outcome changes.'
  if (domainVisualType === 'ecosystem_simulator') return 'Change one ecosystem variable and identify the effect.'
  if (domainVisualType === 'architecture_stack_visual') return 'Trace the request through the architecture stack.'
  if (domainVisualType === 'audio_wave_visual') return 'Adjust the wave and identify what changed.'
  if (domainVisualType === 'music_pattern_builder') return 'Build the music pattern in order.'
  if (domainVisualType === 'grammar_tree_visual') return 'Click the grammar role or branch that matches the sentence.'
  if (domainVisualType === 'body_motion_visual') return 'Click the body area involved in the movement.'
  if (domainVisualType === 'business_strategy_visual') return 'Compare the strategy cards and choose the best match.'
  if (domainVisualType === 'logic_flow_visual') return 'Trace the logic path that the condition follows.'
  if (domainVisualType === 'storytelling_scene_visual') return 'Identify the scene card that carries the story function.'
  if (domainVisualType === 'ui_layout_visual') return 'Click the UI issue or fix shown in the layout.'
  if (domainVisualType === 'ai_model_flow_visual') return 'Trace data through the model flow.'
  return `Interact with the visual to identify ${topic}.`
}

function defaultInteractiveAnswer(domainVisualType, data = {}) {
  if (domainVisualType === 'code_output_visual') return cleanText(data.output, 'Sri')
  if (domainVisualType === 'free_body_diagram') return cleanText((data.arrows || []).find((arrow) => arrow?.correct)?.label, 'gravity')
  if (domainVisualType === 'graph_visual') return cleanText(data.highlight, 'slope')
  if (domainVisualType === 'equation_builder') return cleanText(data.target, 'F = m x a')
  if (domainVisualType === 'dialogue_builder') return cleanText(data.correctSentence, 'quiero agua')
  if (domainVisualType === 'email_threat_scan') return cleanText((data.redFlags || [])[0], 'fake domain')
  if (domainVisualType === 'terminal_log_visual') return String(Number.isInteger(data.suspiciousIndex) ? data.suspiciousIndex : 2)
  if (domainVisualType === 'circuit_diagram') return cleanText(data.answer, 'To limit current and protect the LED.')
  if (domainVisualType === 'anatomy_diagram') return cleanText((data.labels || [])[0], 'left ventricle')
  if (domainVisualType === 'chemistry_particle_visual') return cleanText(data.concept, 'water molecule')
  if (domainVisualType === 'portfolio_chart_visual') {
    const allocations = Array.isArray(data.allocations) ? data.allocations : []
    const largest = allocations.reduce((max, item) => ((Number(item?.value) || 0) > (Number(max?.value) || 0) ? item : max), allocations[0] || null)
    return cleanText(largest?.label, 'Tech')
  }
  if (domainVisualType === 'design_canvas_visual') return cleanText(data.issue, 'low contrast')
  if (domainVisualType === 'timeline_builder') return cleanText(data.target, (data.events || []).join(' > ') || 'Start > Middle step > Result')
  if (domainVisualType === 'map_interaction') return cleanText(data.target, (data.regions || [])[0] || 'Region B')
  if (domainVisualType === 'molecule_builder') return cleanText(data.target, (data.atoms || []).join(' ') || 'H O H')
  if (domainVisualType === 'probability_visualizer') return cleanText(data.target, 'manipulated probability')
  if (domainVisualType === 'ecosystem_simulator') return cleanText(data.target, 'balance')
  if (domainVisualType === 'architecture_stack_visual') return cleanText(data.target, (data.layers || [])[1] || 'API')
  if (domainVisualType === 'audio_wave_visual') return cleanText(data.target, 'higher frequency makes tighter waves')
  if (domainVisualType === 'music_pattern_builder') return cleanText(data.target, (data.notes || []).join(' ') || 'C E G')
  if (domainVisualType === 'grammar_tree_visual') return cleanText(data.target, (data.labels || [])[0] || 'verb')
  if (domainVisualType === 'body_motion_visual') return cleanText(data.target, (data.muscleGroups || [])[0] || 'core')
  if (domainVisualType === 'business_strategy_visual') return cleanText(data.target, (data.strategies || [])[0] || 'Premium niche')
  if (domainVisualType === 'logic_flow_visual') return cleanText(data.target, (data.branches || []).join(' > ') || 'Start > Condition > True branch')
  if (domainVisualType === 'storytelling_scene_visual') return cleanText(data.target, (data.scenes || [])[1] || 'Conflict')
  if (domainVisualType === 'ui_layout_visual') return cleanText(data.target || data.issue, 'spacing hierarchy')
  if (domainVisualType === 'ai_model_flow_visual') return cleanText(data.target, (data.modelNodes || [])[1] || 'Model')
  return ''
}

function normalizeInteractiveData(data, fallbackData = {}) {
  const source = data && typeof data === 'object' ? data : {}
  return Object.entries(source).reduce((acc, [key, value]) => {
    if (value == null) return acc
    if (typeof value === 'string' && !value.trim()) return acc
    if (Array.isArray(value) && value.length === 0) return acc
    return { ...acc, [key]: value }
  }, { ...fallbackData })
}

function buildDefaultInteractiveSlide(topic = 'this concept', context = {}) {
  const domainVisualType = inferDomainVisualType(topic, context)
  const interactionPrimitive = inferInteractionPrimitive(domainVisualType, topic, context)
  const data = defaultInteractiveData(domainVisualType, topic, context)
  return {
    type: 'visual_interactive',
    title: `Try ${topic}`,
    domainVisualType,
    interactionPrimitive,
    data,
    prompt: defaultInteractivePrompt(domainVisualType, topic),
    correctAnswer: defaultInteractiveAnswer(domainVisualType, data),
    explanation: cleanText(data.explanation, `This visual focuses on the exact idea: ${topic}.`),
  }
}

function optionArray(options, fallback) {
  const values = Array.isArray(options) ? options.map((option) => cleanText(option)).filter(Boolean) : []
  return values.length >= 2 ? values.slice(0, 4) : fallback
}

function nodeArray(nodes, fallback = []) {
  const values = Array.isArray(nodes)
    ? nodes.map((node) => {
      if (typeof node === 'string') return cleanText(node)
      return cleanText(node?.label || node?.title || node?.text || node?.detail)
    }).filter(Boolean)
    : []
  return values.length > 0 ? values.slice(0, 5) : fallback.slice(0, 5)
}

function normalizeVariableNodes(nodes = []) {
  const values = nodeArray(nodes, ['name', '=', 'value'])
  const first = values[0] || 'name'
  const assignmentMatch = first.match(/^([A-Za-z_$][\w$]*)\s*=\s*(.+)$/)
  if (assignmentMatch) return [assignmentMatch[1], '=', assignmentMatch[2]]

  const second = values[1] || '='
  const third = values[2] || 'value'
  if (/^(=|:=|<-)$/.test(second)) return [first, second, third]
  return [first, '=', second]
}

function noneVisual() {
  return { type: 'none', title: '', caption: '', imagePrompt: '', nodes: [] }
}

function visualSignal(topic = '', context = {}) {
  return cleanText([
    topic,
    context?.topic,
    context?.concept,
    context?.taskTitle,
    context?.goal,
    context?.domain,
  ].filter(Boolean).join(' '))
}

function isApiTopic(signal = '') {
  return /\b(api|apis|endpoint|http request|http response|request and response|request\/response|backend|server|database|fetch data)\b/i.test(signal)
}

function isAiHierarchyTopic(signal = '') {
  const text = signal.toLowerCase()
  const hasAi = /\b(ai|artificial intelligence)\b/.test(text)
  const hasMl = /\b(ml|machine learning)\b/.test(text)
  const hasDl = /\b(dl|deep learning|neural network)\b/.test(text)
  return [hasAi, hasMl, hasDl].filter(Boolean).length >= 2
    || /\b(model hierarchy|fit together|relationship between ai|difference between ai)\b/i.test(signal)
}

function isHtmlStructureTopic(signal = '') {
  return /\bhtml\b.*\b(document|structure|skeleton|tag)\b|\b(document structure|html tag)\b/i.test(signal)
}

function isCssBoxModelTopic(signal = '') {
  return /\bcss\b.*\bbox model\b|\bbox model\b/i.test(signal)
}

function isFunctionFlowTopic(signal = '') {
  return /\bfunction call\b|\bcall a function\b|\breturn statement\b|\breturn value\b/i.test(signal)
}

function isVariableAssignmentTopic(signal = '', context = {}) {
  if (!isProgrammingContext(context, signal)) return false
  return /\bvariables?\b|\bassignment\b|\bassign(?:ing)?\b|\bstores?\s+(?:a\s+)?value\b|\bname\s+used\s+to\s+store\b/i.test(signal)
}

function isPrintOutputTopic(signal = '', context = {}) {
  if (!isProgrammingContext(context, signal)) return false
  return /\bprint\s*\(\s*\)|\bprint(?:ing)?\s+(?:text|output|values?)\b|\bshows?\s+(?:text|output|information)\s+on\s+the\s+screen\b/i.test(signal)
}

function isIfBranchTopic(signal = '', context = {}) {
  if (!isProgrammingContext(context, signal)) return false
  return /\bif statement\b|\belse\b|\bcondition(?:al)?\b.*\bbranch\b|\bchooses?\s+between\s+branches\b/i.test(signal)
}

function isLoopTopic(signal = '', context = {}) {
  if (!isProgrammingContext(context, signal)) return false
  return /\bfor loop\b|\bwhile loop\b|\bloop\b.*\brepeats?\b|\brange\s*\(\s*\)/i.test(signal)
}

function isListTopic(signal = '', context = {}) {
  if (!isProgrammingContext(context, signal)) return false
  return /\blists?\b|\barray\b|\bindex(?:es|ing)?\b|\bitems?\s+in\s+order\b/i.test(signal)
}

function defaultVisualForSlide(slide = {}, topic = 'this concept', context = {}) {
  if (slide.type !== 'concept_intro') return noneVisual()

  const signal = visualSignal(topic, context)

  if (isVariableAssignmentTopic(signal, context)) {
    return {
      type: 'variable_box',
      title: 'Assignment stores a value',
      caption: '`age` is the name. `15` is the value stored there after the assignment runs.',
      imagePrompt: '',
      nodes: ['age', '=', '15'],
    }
  }

  if (isPrintOutputTopic(signal, context)) {
    return {
      type: 'system_flow',
      title: 'Code to screen output',
      caption: '`print()` sends a value to the screen so the learner can see the result.',
      imagePrompt: '',
      nodes: ['`print("Hi")` call', 'Python runs the call', 'Screen shows `Hi`'],
    }
  }

  if (isIfBranchTopic(signal, context)) {
    return {
      type: 'comparison',
      title: 'Condition chooses a branch',
      caption: 'Only the branch that matches the condition runs.',
      imagePrompt: '',
      nodes: ['True: run the if block', 'False: skip it or run else'],
    }
  }

  if (isLoopTopic(signal, context)) {
    return {
      type: 'flow',
      title: 'One loop pass at a time',
      caption: 'A loop repeats the same body for each item, then stops when no items remain.',
      imagePrompt: '',
      nodes: ['Get next item', 'Run loop body', 'Move to next item', 'Stop when done'],
    }
  }

  if (isListTopic(signal, context)) {
    return {
      type: 'diagram',
      title: 'List positions',
      caption: 'A list keeps values in order, and each value has an index position.',
      imagePrompt: '',
      nodes: ['Index 0: first item', 'Index 1: second item', 'Index 2: third item'],
    }
  }

  if (isAiHierarchyTopic(signal)) {
    return {
      type: 'nested',
      title: 'How the categories fit',
      caption: 'Deep learning sits inside machine learning, and machine learning sits inside AI.',
      imagePrompt: '',
      nodes: ['Artificial Intelligence', 'Machine Learning', 'Deep Learning'],
    }
  }

  if (isApiTopic(signal)) {
    return {
      type: 'system_flow',
      title: 'Request and response path',
      caption: 'The client asks for data. The server handles the request and sends a response back.',
      imagePrompt: '',
      nodes: ['Client app', 'HTTP request', 'API/server', 'Database or service', 'HTTP response'],
    }
  }

  if (isCssBoxModelTopic(signal)) {
    return {
      type: 'nested',
      title: 'CSS box model layers',
      caption: 'Content sits inside padding, padding sits inside the border, and margin creates outside space.',
      imagePrompt: '',
      nodes: ['Margin', 'Border', 'Padding', 'Content'],
    }
  }

  if (isHtmlStructureTopic(signal)) {
    return {
      type: 'diagram',
      title: 'HTML document hierarchy',
      caption: '`html` wraps the page. `head` stores page info. `body` holds what appears on screen.',
      imagePrompt: '',
      nodes: ['<!DOCTYPE html>', '<html>', '<head>', '<body>'],
    }
  }

  if (isFunctionFlowTopic(signal)) {
    return {
      type: 'system_flow',
      title: 'Call to result',
      caption: 'Code calls the function, the function runs its body, then a return value can go back to the caller.',
      imagePrompt: '',
      nodes: ['Caller code', 'Function body', 'Return value'],
    }
  }

  return noneVisual()
}

function hasCodeLikeText(value = '') {
  return /(`[^`]+`|<\/?[a-z][^>]*>|[A-Za-z_$][\w$]*\s*=|\bprint\s*\(|\bfor\s+\w+\s+in\b|\bif\s+.+:|[{};])/i.test(String(value || ''))
}

function slideHasCode(slide = {}) {
  return Boolean(cleanText(slide?.code)) || hasCodeLikeText(slide?.question) || hasCodeLikeText(slide?.body)
}

function hasMeaningfulVisualShape(visual = {}) {
  const type = VISUAL_TYPES.has(visual.type) ? visual.type : 'none'
  const nodes = nodeArray(visual.nodes, [])
  if (type === 'none') return true
  if (type === 'variable_box') {
    const [name, operator, value] = normalizeVariableNodes(nodes)
    return Boolean(name && value && /^(=|:=|<-)$/.test(operator) && name !== value)
  }
  if (type === 'code_flow') return nodes.length >= 2
  if (type === 'check_card') return false
  if (type === 'nested' || type === 'system_flow') return nodes.length >= 3
  if (type === 'comparison') return nodes.length >= 2
  if (type === 'diagram' || type === 'flow') return nodes.length >= 3
  return false
}

function isLowValueVisualLanguage(visual = {}) {
  const text = cleanText([
    visual?.title,
    visual?.caption,
    ...(Array.isArray(visual?.nodes) ? visual.nodes : []),
  ].join(' ')).toLowerCase()

  return /\b(mental model|concept map|visual anchor|foundation|journey|building block|key concept|read\s+track\s+choose|predict before you answer)\b/i.test(text)
}

function isUsefulVariableVisual(visual = {}, slide = {}) {
  if (slide.type !== 'concept_intro') return false
  const [name, operator, value] = normalizeVariableNodes(nodeArray(visual.nodes, []))
  if (!name || !value || !/^(=|:=|<-)$/.test(operator) || name === value) return false
  const slideText = cleanText([slide?.title, slide?.body, slide?.explanation].join(' '))
  return /\bvariable\b|\bassign(?:ment|s|ing)?\b|\bstores?\s+(?:a\s+)?value\b/i.test(slideText)
}

function isUsefulCodeFlowVisual(visual = {}, slide = {}) {
  if (slide.type !== 'concept_intro') return false
  if (!hasMeaningfulVisualShape(visual) || isLowValueVisualLanguage(visual)) return false
  const slideText = cleanText([slide?.title, slide?.body, slide?.explanation].join(' '))
  return /\bprint\s*\(|\breturn\b|\bfunction\b|\binput\b|\boutput\b|\brequest\b|\bresponse\b/i.test(slideText)
}

function visualRepeatsSlide(visual = {}, slide = {}) {
  const type = VISUAL_TYPES.has(visual.type) ? visual.type : 'none'
  if (type === 'none') return false
  if (!hasMeaningfulVisualShape(visual)) return true
  if (isLowValueVisualLanguage(visual)) return true
  if (type === 'check_card') return true
  if (type === 'variable_box') return !isUsefulVariableVisual(visual, slide)
  if (type === 'code_flow') return !isUsefulCodeFlowVisual(visual, slide)
  if (slide.type === 'code_breakdown' || slide.type === 'mini_check' || slide.type === 'final_check') return true
  if (slide.type === 'example' && slideHasCode(slide)) return true

  const nodes = nodeArray(visual.nodes, [])
  const slideText = cleanText([
    slide?.title,
    slide?.body,
    slide?.code,
    slide?.question,
    slide?.explanation,
  ].join(' ')).toLowerCase()

  if (!nodes.length || !slideText) return false
  const repeated = nodes.filter((node) => {
    const normalized = cleanText(node).toLowerCase()
    return normalized.length >= 4 && slideText.includes(normalized)
  }).length

  return repeated >= Math.max(2, Math.ceil(nodes.length * 0.75))
}

function normalizeHelpfulVisual(visual, fallback, slide) {
  const rawSource = visual && typeof visual === 'object' && visual.type !== 'none' ? visual : fallback
  const candidateType = VISUAL_TYPES.has(rawSource?.type) ? rawSource.type : fallback.type
  const candidate = {
    type: candidateType,
    title: cleanText(rawSource?.title, fallback.title),
    caption: cleanText(rawSource?.caption, fallback.caption),
    imagePrompt: '',
    nodes: candidateType === 'variable_box'
      ? normalizeVariableNodes(nodeArray(rawSource?.nodes, fallback.nodes || []))
      : nodeArray(rawSource?.nodes, fallback.nodes || []),
  }

  if (!visualRepeatsSlide(candidate, slide) && hasMeaningfulVisualShape(candidate)) return candidate

  const cleanFallback = {
    type: VISUAL_TYPES.has(fallback.type) ? fallback.type : 'none',
    title: cleanText(fallback.title),
    caption: cleanText(fallback.caption),
    imagePrompt: '',
    nodes: fallback.type === 'variable_box'
      ? normalizeVariableNodes(nodeArray(fallback.nodes, []))
      : nodeArray(fallback.nodes, []),
  }

  if (!visualRepeatsSlide(cleanFallback, slide) && hasMeaningfulVisualShape(cleanFallback)) return cleanFallback
  return noneVisual()
}

function normalizeVisual(visual, fallbackVisual, slide, context) {
  const fallback = fallbackVisual && typeof fallbackVisual === 'object'
    ? fallbackVisual
    : defaultVisualForSlide(slide, context?.topic || context?.concept || slide?.title, context)
  return normalizeHelpfulVisual(visual, fallback, slide)
}

function normalizeCheckSlide(slide, type, fallback, context) {
  const options = optionArray(slide?.options, fallback.options)
  const correctIndex = Number.isInteger(slide?.correctIndex) ? slide.correctIndex : fallback.correctIndex
  const normalized = {
    type,
    title: cleanText(slide?.title, fallback.title),
    question: cleanMultiline(slide?.question, fallback.question),
    options,
    correctIndex: Math.max(0, Math.min(options.length - 1, correctIndex)),
    explanation: cleanText(slide?.explanation, fallback.explanation),
    visual: normalizeVisual(slide?.visual, fallback.visual, { ...slide, type }, context),
    ...(type === 'final_check' ? {
      redemptionQuestion: normalizeRedemptionQuestion(slide?.redemptionQuestion, fallback.redemptionQuestion),
    } : {}),
  }
  return normalized
}

function normalizeRedemptionQuestion(question, fallback) {
  const options = optionArray(question?.options, fallback.options)
  const correctIndex = Number.isInteger(question?.correctIndex) ? question.correctIndex : fallback.correctIndex
  return {
    question: cleanMultiline(question?.question, fallback.question),
    options,
    correctIndex: Math.max(0, Math.min(options.length - 1, correctIndex)),
    explanation: cleanText(question?.explanation, fallback.explanation),
  }
}

function normalizeSlide(slide, fallbackSlides, context) {
  if (!slide || typeof slide !== 'object' || !ALLOWED_SLIDE_TYPES.has(slide.type)) return null
  const fallback = fallbackSlides.find((entry) => entry.type === slide.type) || {}
  const topic = context?.topic || fallback.title || slide.title
  if (slide.type === 'concept_intro') {
    return {
      type: 'concept_intro',
      title: normalizedSlideTitle(slide, fallback, topic),
      body: cleanText(slide.body, fallback.body),
      visual: normalizeVisual(slide.visual, fallback.visual, slide, { ...context, topic: context?.topic || fallback.title }),
    }
  }
  if (slide.type === 'example') {
    return {
      type: 'example',
      title: normalizedSlideTitle(slide, fallback, topic),
      code: cleanMultiline(slide.code, fallback.code),
      explanation: cleanText(slide.explanation, fallback.explanation),
      visual: normalizeVisual(slide.visual, fallback.visual, slide, { ...context, topic: context?.topic || fallback.title }),
    }
  }
  if (slide.type === 'visual_interactive') {
    const fallbackInteractive = fallback?.type === 'visual_interactive'
      ? fallback
      : buildDefaultInteractiveSlide(topic, context)
    const domainVisualType = INTERACTIVE_VISUAL_TYPES.has(slide.domainVisualType)
      ? slide.domainVisualType
      : fallbackInteractive.domainVisualType
    const interactionPrimitive = INTERACTION_PRIMITIVES.has(slide.interactionPrimitive)
      ? slide.interactionPrimitive
      : fallbackInteractive.interactionPrimitive || inferInteractionPrimitive(domainVisualType, topic, context)
    const fallbackData = fallbackInteractive.domainVisualType === domainVisualType
      ? fallbackInteractive.data
      : defaultInteractiveData(domainVisualType, topic, context)
    const data = normalizeInteractiveData(slide.data, fallbackData)
    return {
      type: 'visual_interactive',
      title: normalizedSlideTitle(slide, fallbackInteractive, topic),
      domainVisualType,
      interactionPrimitive,
      data,
      prompt: cleanText(slide.prompt, fallbackInteractive.prompt || defaultInteractivePrompt(domainVisualType, topic)),
      correctAnswer: cleanText(slide.correctAnswer, fallbackInteractive.correctAnswer || defaultInteractiveAnswer(domainVisualType, data)),
      explanation: cleanText(slide.explanation, fallbackInteractive.explanation || data.explanation || `This visual shows ${topic} in action.`),
    }
  }
  if (slide.type === 'code_breakdown') {
    const fallbackSteps = Array.isArray(fallback.steps) ? fallback.steps : []
    const rawSteps = Array.isArray(slide.steps) ? slide.steps : fallbackSteps
    return {
      type: 'code_breakdown',
      title: normalizedSlideTitle(slide, fallback, topic),
      code: cleanMultiline(slide.code, fallback.code),
      language: cleanText(slide.language, fallback.language || (isProgrammingContext(context) ? 'python' : 'text')),
      steps: rawSteps.slice(0, 6).map((step, index) => ({
        line: Number.isInteger(step?.line) ? step.line : index + 1,
        explanation: cleanText(step?.explanation, fallbackSteps[index]?.explanation || 'Read this line and state what it does.'),
      })),
      visual: normalizeVisual(slide.visual, fallback.visual, slide, { ...context, topic: context?.topic || fallback.title }),
    }
  }
  if (slide.type === 'mini_check') return normalizeCheckSlide(slide, 'mini_check', fallback, context)
  if (slide.type === 'final_check') return normalizeCheckSlide(slide, 'final_check', fallback, context)
  return null
}

function buildVariableSlides(topic) {
  return [
    {
      type: 'concept_intro',
      title: topic,
      body: 'A variable is a name that stores a value. In Python, `age = 15` creates a variable named `age` and stores the number `15`.',
    },
    {
      type: 'example',
      title: 'A variable stores one value',
      code: 'name = "Sri"\nprint(name)',
      explanation: 'The variable `name` stores the text `Sri`. `print(name)` displays the value stored inside `name`.',
    },
    {
      type: 'code_breakdown',
      title: 'Read this line by line',
      code: 'score = 10\nscore = 12\nprint(score)',
      language: 'python',
      steps: [
        { line: 1, explanation: '`score = 10` stores 10 in the variable `score`.' },
        { line: 2, explanation: '`score = 12` replaces the old value with 12.' },
        { line: 3, explanation: '`print(score)` prints the current value, which is 12.' },
      ],
    },
    {
      type: 'mini_check',
      title: 'What gets printed?',
      question: 'What does this print?\n\nx = 4\nprint(x)',
      options: ['x', '4', 'print', 'Nothing'],
      correctIndex: 1,
      explanation: '`print(x)` prints the value stored inside `x`, which is 4.',
    },
    {
      type: 'mini_check',
      title: 'Which one is the variable?',
      question: 'In this line, which part is the variable name?\n\nage = 15',
      options: ['age', '15', '=', 'None'],
      correctIndex: 0,
      explanation: '`age` is the variable name. `15` is the value being stored.',
    },
    {
      type: 'final_check',
      title: 'Final check',
      question: 'What does this print?\n\npoints = 3\npoints = 8\nprint(points)',
      options: ['3', '8', 'points', '11'],
      correctIndex: 1,
      explanation: 'The second assignment replaces 3 with 8, so the printed value is 8.',
      redemptionQuestion: {
        question: 'What is the value of `level`?\n\nlevel = 2\nlevel = 5',
        options: ['2', '5', 'level', 'Nothing'],
        correctIndex: 1,
        explanation: 'The latest assignment sets `level` to 5.',
      },
    },
  ]
}

function buildPrintSlides(topic) {
  return [
    {
      type: 'concept_intro',
      title: topic,
      body: '`print()` shows information on the screen. In Python, `print("Hi")` displays the text `Hi`.',
    },
    {
      type: 'example',
      title: 'Printing text',
      code: 'print("Hello, Python")',
      explanation: 'Python runs the line and displays the text inside the quotes.',
    },
    {
      type: 'code_breakdown',
      title: 'Read the print line',
      code: 'name = "Sri"\nprint(name)',
      language: 'python',
      steps: [
        { line: 1, explanation: '`name = "Sri"` stores the text `Sri`.' },
        { line: 2, explanation: '`print(name)` displays the stored value: Sri.' },
      ],
    },
    {
      type: 'mini_check',
      title: 'Predict the output',
      question: 'What does this print?\n\nprint("PathAI")',
      options: ['PathAI', '"PathAI"', 'print', 'Nothing'],
      correctIndex: 0,
      explanation: '`print()` displays the text inside the quotes, without showing the quote marks.',
    },
    {
      type: 'mini_check',
      title: 'Variable or text?',
      question: 'What does this print?\n\nname = "Mina"\nprint(name)',
      options: ['name', 'Mina', '"name"', 'Nothing'],
      correctIndex: 1,
      explanation: '`print(name)` displays the value stored in `name`, which is Mina.',
    },
    {
      type: 'final_check',
      title: 'Final check',
      question: 'What does this print?\n\nword = "Python"\nprint(word)',
      options: ['word', 'Python', '"word"', 'Nothing'],
      correctIndex: 1,
      explanation: '`print(word)` prints the value stored inside `word`.',
      redemptionQuestion: {
        question: 'What does this print?\n\nprint("Hi")',
        options: ['Hi', '"Hi"', 'print', 'Nothing'],
        correctIndex: 0,
        explanation: '`print("Hi")` displays Hi.',
      },
    },
  ]
}

function buildGenericProgrammingSlides(topic) {
  if (/variable/i.test(topic)) return buildVariableSlides(topic)
  if (/print/i.test(topic)) return buildPrintSlides(topic)
  return [
    {
      type: 'concept_intro',
      title: topic,
      body: `${topic} is one specific programming move. Read the code, name what changes, and predict the result.`,
    },
    {
      type: 'example',
      title: 'Small example',
      code: 'value = 1\nprint(value)',
      explanation: 'The code stores one value, then prints it so you can see the result.',
    },
    {
      type: 'mini_check',
      title: 'Tiny check',
      question: 'What should a good code prediction include?',
      options: ['The exact output', 'Only the topic name', 'A motivational sentence', 'Nothing'],
      correctIndex: 0,
      explanation: 'A code prediction should say exactly what the program outputs or changes.',
    },
    {
      type: 'mini_check',
      title: 'Specific or vague?',
      question: 'Which explanation is better?',
      options: ['The line prints 1', 'This builds a foundation', 'This is important', 'You will learn more later'],
      correctIndex: 0,
      explanation: 'The best explanation says what the code actually does.',
    },
    {
      type: 'final_check',
      title: 'Final check',
      question: 'Which answer is most specific?',
      options: ['The code prints 1', 'The code is useful', 'Programming matters', 'The topic is important'],
      correctIndex: 0,
      explanation: 'Specific answers describe what the code actually does.',
      redemptionQuestion: {
        question: 'Which sentence directly explains code?',
        options: ['`print(value)` displays the stored value', 'This builds a foundation', 'This is a key concept', 'You will learn this later'],
        correctIndex: 0,
        explanation: 'It names the line and the behavior.',
      },
    },
  ]
}

function buildGenericSlides(topic, context) {
  if (isProgrammingContext(context, topic)) return buildGenericProgrammingSlides(topic)
  return [
    {
      type: 'concept_intro',
      title: topic,
      body: `${topic} is one specific idea. A correct explanation names the rule, shows one example, and states the result.`,
    },
    {
      type: 'example',
      title: 'One concrete example',
      code: '',
      explanation: `Use ${topic} in one small case, then state exactly what changed because of it.`,
    },
    {
      type: 'mini_check',
      title: 'Tiny check',
      question: `What should an explanation of ${topic} include?`,
      options: ['A concrete result', 'A broad theme', 'Only motivation', 'A new unrelated topic'],
      correctIndex: 0,
      explanation: 'A specific concept lesson must show the result of the idea.',
    },
    {
      type: 'mini_check',
      title: 'Pick the specific answer',
      question: `Which response stays focused on ${topic}?`,
      options: ['It names the rule and result', 'It says learning is useful', 'It introduces another topic', 'It gives only a title'],
      correctIndex: 0,
      explanation: 'A focused response explains the exact rule and result.',
    },
    {
      type: 'final_check',
      title: 'Final check',
      question: `Which answer best proves ${topic}?`,
      options: ['A small example with a result', 'A vague summary', 'A course title', 'A confidence rating only'],
      correctIndex: 0,
      explanation: 'Proof needs a concrete use of the exact topic.',
      redemptionQuestion: {
        question: 'Which lesson title is more specific?',
        options: [topic, 'Introduction to the subject', 'Basics', 'Fundamentals'],
        correctIndex: 0,
        explanation: 'The exact topic is the specific lesson.',
      },
    },
  ]
}

function addDefaultVisuals(slides, topic, context) {
  const visualized = slides.map((slide) => (
    slide.type === 'visual_interactive'
      ? normalizeSlide(slide, [], { ...context, topic }) || slide
      : {
        ...slide,
        visual: normalizeVisual(slide.visual, null, slide, { ...context, topic }),
      }
  ))
  return ensureInteractiveSlide(visualized, topic, context)
}

function ensureInteractiveSlide(slides, topic, context) {
  if (!Array.isArray(slides) || slides.some((slide) => slide?.type === 'visual_interactive')) return slides
  const interactive = buildDefaultInteractiveSlide(topic, context)
  if (slides.length >= 8) {
    const replaceIndex = slides.findIndex((slide, index) => index > 0 && slide?.type !== 'final_check' && slide?.type !== 'concept_intro')
    if (replaceIndex >= 0) {
      return slides.map((slide, index) => (index === replaceIndex ? interactive : slide))
    }
    return slides
  }
  const afterExample = slides.findIndex((slide) => slide?.type === 'example')
  const insertAt = afterExample >= 0 ? afterExample + 1 : Math.min(2, Math.max(1, slides.length - 1))
  return [
    ...slides.slice(0, insertAt),
    interactive,
    ...slides.slice(insertAt),
  ].slice(0, 8)
}

function fallbackSlidesForTopic(topic, context) {
  if (/what is a variable/i.test(topic)) return addDefaultVisuals(buildVariableSlides(topic), topic, context)
  if (/print\(\)|use print/i.test(topic)) return addDefaultVisuals(buildPrintSlides(topic), topic, context)
  return addDefaultVisuals(buildGenericSlides(topic, context), topic, context)
}

function hasValidSlideShape(slides) {
  if (!Array.isArray(slides)) return false
  if (slides.length < 3 || slides.length > 8) return false
  if (slides[0]?.type !== 'concept_intro') return false
  if (slides[slides.length - 1]?.type !== 'final_check') return false
  return slides.every((slide) => ALLOWED_SLIDE_TYPES.has(slide?.type))
}

export function normalizeConceptSlideshowLesson(doc = {}, context = {}) {
  const rawTopic = doc.topic || doc.title || context?.concept || context?.taskTitle
  const narrowed = narrowConceptTopic(rawTopic, context)
  const topic = narrowed.topic
  const fallbackSlides = fallbackSlidesForTopic(topic, context)
  const incomingSlides = Array.isArray(doc.slides) ? doc.slides : []
  const normalizeContext = { ...context, topic }
  const normalizedIncoming = incomingSlides
    .map((slide) => normalizeSlide(slide, fallbackSlides, normalizeContext))
    .filter(Boolean)
    .filter((slide) => !containsMetaFiller(slide))

  const warnings = []
  let slides = normalizedIncoming
  if (!hasValidSlideShape(slides)) {
    warnings.push(`Invalid concept slideshow shape for "${rawTopic}". Rendered safe fallback for "${topic}".`)
    slides = fallbackSlides
  }

  const miniCheckCount = slides.filter((slide) => slide.type === 'mini_check').length
  if (miniCheckCount < 2 || miniCheckCount > 3) {
    warnings.push(`Concept slideshow "${topic}" has ${miniCheckCount} mini checks. Target is 2-3; allowed fallback was used.`)
    slides = fallbackSlides
  }
  slides = ensureInteractiveSlide(slides, topic, normalizeContext)
  if (!hasValidSlideShape(slides)) {
    warnings.push(`Concept slideshow "${topic}" needed a safe visual-interactive fallback.`)
    slides = fallbackSlides
  }
  slides = slides.map((slide, index) => {
    if (index === 0 && slide.type === 'concept_intro') return { ...slide, title: topic }
    return { ...slide, title: normalizedSlideTitle(slide, fallbackSlides.find((entry) => entry.type === slide.type) || {}, topic) }
  })

  return {
    id: cleanText(doc.id, `concept_${slugify(topic)}`),
    lessonType: 'concept_slideshow',
    domain: cleanText(doc.domain, isProgrammingContext(context, topic) ? 'programming' : context?.domain || 'general'),
    topic,
    title: topic,
    estimatedMinutes: Number(doc.estimatedMinutes) || 10,
    xp: Number(doc.xp) || 100,
    worldId: cleanText(doc.worldId || context?.worldId, ''),
    unitId: cleanText(doc.unitId || context?.unitId, ''),
    conceptClusterId: cleanText(doc.conceptClusterId || context?.conceptClusterId, ''),
    atomicConceptId: cleanText(doc.atomicConceptId || context?.atomicConceptId, slugify(topic)),
    zoneTheme: cleanText(doc.zoneTheme || context?.zoneTheme, ''),
    mapColor: cleanText(doc.mapColor || context?.mapColor, ''),
    specificityCheck: {
      ...narrowed.specificityCheck,
      ...(doc.specificityCheck && typeof doc.specificityCheck === 'object' ? doc.specificityCheck : {}),
      isSpecific: narrowed.specificityCheck.isSpecific,
      rejectedBroadTopic: narrowed.specificityCheck.rejectedBroadTopic,
    },
    slides,
    warnings,
    dailyConcept: doc.dailyConcept || context?.learningContract || null,
    learningContract: doc.learningContract || context?.learningContract || null,
  }
}
