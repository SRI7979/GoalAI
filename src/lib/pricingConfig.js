export const PRICING_PLANS = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    annualEquivalent: 0,
    description: 'A focused starting point for trying the PathAI system without paying.',
    billingCopy: 'Always free',
    ctaLabel: 'Start Free',
    ctaHref: '/login?mode=signup',
    highlight: false,
    badge: null,
    features: [
      '1 active goal',
      'Daily missions',
      'Limited AI lesson generation',
      'Limited assistant usage',
      'Basic streaks, XP, gems, and quests',
      'Limited boss access',
      'Basic portfolio visibility',
    ],
  },
  {
    id: 'core',
    name: 'Core',
    monthlyPrice: 15,
    annualPrice: 120,
    annualEquivalent: 10,
    description: 'The main PathAI experience for serious learners who want full daily momentum.',
    billingCopy: 'Billed monthly or annually',
    ctaLabel: 'Choose Core',
    ctaHref: '/login?mode=signup&plan=core',
    highlight: true,
    badge: 'Most Popular',
    features: [
      'Full adaptive daily path',
      'Full lesson, practice, quiz, recall, and reflect flow',
      'Higher AI lesson and assistant limits',
      'Boss battles and stronger game-loop access',
      'Milestone progression without aggressive caps',
      'Portfolio basics',
      'A small monthly allotment of verified projects',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 29,
    annualPrice: 228,
    annualEquivalent: 19,
    description: 'The proof-first tier for users treating PathAI like a real skill-building operating system.',
    billingCopy: 'Best for power users',
    ctaLabel: 'Go Pro',
    ctaHref: '/login?mode=signup&plan=pro',
    highlight: false,
    badge: 'Proof First',
    features: [
      'Everything in Core',
      'Highest AI tutor and assistant limits',
      'Verified projects at meaningful volume',
      'Strongest proof-of-skill features',
      'Richer portfolio and proof presentation',
      'Priority access to advanced review and authenticity layers',
      'Multi-goal support and premium progression controls',
    ],
  },
]

export const PRICING_COMPARISON_ROWS = [
  { label: 'Active goals', values: ['1', '1', 'Multiple'] },
  { label: 'AI lesson depth', values: ['Limited', 'Full', 'Highest'] },
  { label: 'Assistant usage', values: ['Capped', 'Expanded', 'Highest'] },
  { label: 'Boss battles', values: ['Limited', 'Included', 'Included'] },
  { label: 'Verified projects', values: ['Very limited', 'Monthly allotment', 'High volume'] },
  { label: 'Portfolio proof', values: ['Basic', 'Included', 'Advanced'] },
  { label: 'Adaptive path intensity', values: ['Core system', 'Full system', 'Full system + power controls'] },
  { label: 'Premium progression systems', values: ['Basic', 'Expanded', 'Full access'] },
]

export const PRICING_FAQ = [
  {
    question: 'Is there a free tier?',
    answer:
      'Yes. Free gives you a real PathAI route with daily missions and core progression systems, but with tighter caps on AI depth and proof features.',
  },
  {
    question: 'What unlocks on Core?',
    answer:
      'Core unlocks the full adaptive daily learning loop, higher AI limits, stronger boss/game-loop access, and a monthly allotment of verified project work.',
  },
  {
    question: 'Why would I need Pro?',
    answer:
      'Pro is for learners who want PathAI to function like a serious skill-building operating system, with higher tutoring limits, much stronger proof-of-skill output, and richer portfolio presentation.',
  },
  {
    question: 'Can I switch later?',
    answer:
      'Yes. The page is designed around plan intent now, and the future Stripe integration will support straightforward upgrades and changes without changing the product structure.',
  },
  {
    question: 'Are verified projects included?',
    answer:
      'Yes, but the amount depends on the plan. Free is very limited, Core includes a monthly allotment, and Pro is designed for meaningful project volume.',
  },
]
