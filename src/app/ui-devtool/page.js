'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  BookOpen,
  ClipboardCheck,
  FileText,
  FolderKanban,
  GraduationCap,
  Layers3,
  MessageSquare,
  PenLine,
  Repeat,
  Rocket,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react'
import DomainTaskBase from '@/components/domainTasks'
import LessonViewer from '@/components/LessonView'
import MultiQuizView from '@/components/MultiQuizView'
import FlashcardView from '@/components/FlashcardView'
import ReflectionView from '@/components/ReflectionView'
import BossChallengeView from '@/components/BossChallengeView'
import ChallengeView from '@/components/ChallengeView'
import AIInteractionView from '@/components/AIInteractionView'
import ProjectViewer from '@/components/ProjectViewer'
import DomainVisualBlock from '@/components/DomainVisualBlock'
import {
  LEARNING_DOMAINS,
  buildDomainConfig,
  getDomainMetadata,
  getDomainTaskLabel,
} from '@/lib/domainAdapter'
import {
  DEVTOOL_LESSON_TYPES,
  buildDevtoolCourse,
} from '@/lib/uiDevtoolCourses'
import { normalizeConceptSlideshowLesson } from '@/lib/conceptSlideshow'

const TYPE_ICONS = {
  course_map: Layers3,
  lesson: BookOpen,
  guided_practice: Target,
  domain_task: SlidersHorizontal,
  quiz: ClipboardCheck,
  test: ShieldCheck,
  flashcards: Repeat,
  discussion: MessageSquare,
  reflection: PenLine,
  mini_project: Rocket,
  milestone_project: FolderKanban,
  boss: Trophy,
  final_exam: GraduationCap,
}

function getPreviewTask(course, activeType) {
  if (activeType === 'quiz' || activeType === 'flashcards') return course.quizTask
  if (activeType === 'test' || activeType === 'boss' || activeType === 'final_exam') return course.challengeTask
  return course.workspaceTask
}

function isPythonCourse(course) {
  return course?.domain === 'CS_CODING' && /\bpython\b/i.test(String(course?.prompt || course?.concept || ''))
}

function buildLearningContract(course) {
  if (isPythonCourse(course)) {
    return {
      domain: course.domain,
      domainConfig: buildDomainConfig(course.domain),
      conceptLabel: 'What is a variable?',
      dayFocus: 'What is a variable?',
      dayType: 'concept_day',
      canDoStatement: 'create a Python variable and explain what value it stores',
      proofPrompt: 'Create one Python variable, name the variable, name the stored value, and explain what assignment did.',
      proofType: 'code',
      successCriteria: [
        'Creates one variable with a clear name',
        'Identifies the value stored in that variable',
        'Explains that = stores the right-side value in the left-side name',
        'Recognizes that a later assignment replaces the old value',
      ],
      taughtPoints: [
        'A variable is a name that stores a value',
        'A value is one piece of information, like "Ari" or 20',
        '= assigns the value on the right to the variable name on the left',
        'A second assignment to the same variable replaces the old value',
      ],
      learnerProfile: { level: 'beginner', domain: course.domain, xp: 120 },
    }
  }

  return {
    domain: course.domain,
    domainConfig: buildDomainConfig(course.domain),
    conceptLabel: course.concept,
    dayFocus: course.concept,
    dayType: 'concept_day',
    canDoStatement: `use ${course.concept} in one realistic ${course.domainLabel} task`,
    proofPrompt: `Show proof by completing a ${course.domainLabel} task and explaining why it works.`,
    proofType: course.domain === 'CS_CODING' ? 'code' : 'explanation',
    successCriteria: [
      `Use the ${course.domainLabel} workspace correctly`,
      'Show the important intermediate reasoning',
      'Explain how the idea transfers to a nearby scenario',
    ],
    taughtPoints: [
      `Identify the core artifact in ${course.concept}`,
      `Choose the rule that applies to ${course.concept}`,
      `Avoid one common mistake with ${course.concept}`,
      `Explain the result in ${course.domainLabel} terms`,
    ],
    learnerProfile: { level: 'beginner', domain: course.domain, xp: 120 },
  }
}

function buildViewerTask(course, activeType) {
  const learningContract = buildLearningContract(course)
  const taskFromCourse = course.tasks.find((task) => task.id === activeType) || course.tasks[0]
  const canonicalByType = {
    lesson: 'concept',
    guided_practice: 'guided_practice',
    domain_task: 'guided_practice',
    quiz: 'quiz',
    test: 'challenge',
    flashcards: 'recall',
    discussion: 'explain',
    reflection: 'reflect',
    mini_project: 'project',
    milestone_project: 'project',
    boss: 'boss',
    final_exam: 'final_exam',
  }
  const type = canonicalByType[activeType] || 'concept'
  const domainTaskType = activeType === 'domain_task' || activeType === 'guided_practice'
    ? getPreviewTask(course, activeType).taskType
    : null
  return {
    id: `ui-devtool-${course.domain}-${activeType}`,
    type,
    presentation: activeType === 'flashcards' ? 'flashcard' : undefined,
    title: taskFromCourse?.title || `${course.domainLabel} ${activeType}`,
    description: `Static devtool task generated from prompt: ${course.prompt}`,
    action: `Complete the ${course.domainLabel} ${activeType.replace(/_/g, ' ')} view.`,
    outcome: taskFromCourse?.proof || 'Submit proof of understanding.',
    _concept: course.concept,
    _difficulty: activeType === 'final_exam' || activeType === 'boss' ? 4 : 2,
    _moduleName: `${course.domainLabel} Foundations`,
    _concepts: [course.concept, `${course.domainLabel} proof`, `${course.domainLabel} transfer`],
    _learningContract: learningContract,
    learningContract,
    domain: course.domain,
    domainConfig: learningContract.domainConfig,
    domainTaskType,
    domainTaskLabel: domainTaskType ? getDomainTaskLabel(domainTaskType) : undefined,
    isCourseFinalExam: activeType === 'final_exam',
    _courseFinal: activeType === 'final_exam' ? { attemptsUsed: 0, maxAttempts: 3 } : undefined,
    _courseTopics: [course.concept, `${course.domainLabel} practice`, `${course.domainLabel} proof`],
    _courseModules: [`${course.domainLabel} Foundations`, `${course.domainLabel} Practice`],
  }
}

function buildPresetLesson(course) {
  const learningContract = buildLearningContract(course)
  if (isPythonCourse(course)) {
    return {
      generationMode: 'devtool-static',
      lessonDoc: {
        id: 'concept_what_is_variable',
        lessonType: 'concept_slideshow',
        domain: 'programming',
        topic: 'What is a variable?',
        title: 'What is a variable?',
        estimatedMinutes: 10,
        xp: 100,
        specificityCheck: {
          isSpecific: true,
          rejectedBroadTopic: 'Python Lesson: Variables and print()',
        },
        slides: [
          {
            type: 'concept_intro',
            title: 'What is a variable?',
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
            title: 'Find the variable name',
            question: 'In this line, which part is the variable name?\n\nlevel = 2',
            options: ['level', '2', '=', 'Nothing'],
            correctIndex: 0,
            explanation: '`level` is the variable name. The value stored inside it is 2.',
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
        ],
        taughtPoints: learningContract.taughtPoints,
        dailyConcept: {
          conceptLabel: learningContract.conceptLabel,
          canDoStatement: learningContract.canDoStatement,
          proofPrompt: learningContract.proofPrompt,
          proofType: learningContract.proofType,
          successCriteria: learningContract.successCriteria,
        },
        learningContract,
        interactions: [],
      },
    }
  }

  return {
    generationMode: 'devtool-static',
    lessonDoc: {
      title: `${course.domainLabel}: ${course.concept}`,
      learningObjectives: [
        `Define the first usable idea in ${course.concept}`,
        `Use it in one ${course.domainLabel} example`,
        'Avoid one beginner mistake',
      ],
      hook: `A learner asked: ${course.prompt}. This lesson teaches the first idea they need before the workspace task.`,
      mentalModel: {
        model: `Think of ${course.concept} as a visible action: observe the artifact, choose the rule, apply it once, and check the result.`,
        howToUse: `Start from the concrete ${course.domainLabel} object on screen before naming abstractions.`,
        watchOut: 'Do not jump to advanced steps before the learner can perform the first move.',
      },
      plainEnglishExplanation: `${course.concept} starts with one concrete move. In ${course.domainLabel}, the learner needs to see what object they are working with, name the rule or decision, then apply it in a small example. The lesson should stay narrow enough that the next task feels possible instead of surprising.`,
      deepDive: {
        question: 'What makes this lesson testable?',
        answer: 'The lesson ends with proof. The learner must do something visible in the domain workspace, not just say they understand.',
        because: 'PathAI should unlock progress only when the learner can transfer the idea into action.',
      },
      whyItMatters: `This matters because ${course.domainLabel} learning only sticks when the explanation connects to a real task. The UI should make that connection obvious.`,
      workedExample: {
        title: 'One complete pass',
        setup: `Use the prompt "${course.prompt}" and teach only the first concept needed for the next task.`,
        walkthrough: [
          'Show the domain artifact or scenario.',
          'Name the rule, pattern, or decision.',
          'Apply it once with no hidden prerequisites.',
          'Check the result against the success criteria.',
        ],
        result: 'The learner has a concrete example they can imitate in guided practice.',
      },
      practiceDrill: {
        prompt: `Do one small ${course.domainLabel} action based on this lesson.`,
        steps: ['Identify the artifact.', 'Choose the rule.', 'Apply the rule.', 'Explain the result.'],
        modelAnswer: `A strong answer names the ${course.domainLabel} artifact, applies the rule, and explains the proof.`,
        selfCheck: ['Did you stay inside the taught scope?', 'Did you show a visible action?', 'Can you explain why it worked?'],
      },
      commonMistake: {
        mistake: 'Trying to complete the whole subject instead of the next smallest usable move.',
        whyItHappens: 'The learner sees a big goal and assumes every later tool is already required.',
        fix: 'Limit the lesson to one concept and make the next proof task match that scope.',
      },
      keyTakeaways: [
        'One lesson teaches one concept.',
        'The next task must only require what the lesson taught.',
        'Proof means doing the subject-specific action.',
        'Transfer is stronger than recognition.',
      ],
      retrievalPrompts: [
        `What is the first visible move in ${course.concept}?`,
        `What mistake should a ${course.domainLabel} beginner avoid?`,
        'How would you prove this idea in a new scenario?',
      ],
      practiceBridge: `Next, complete the ${course.domainLabel} workspace and explain your proof.`,
      allowedConcepts: [course.concept],
      taughtPoints: learningContract.taughtPoints,
      completionCheck: {
        prompt: learningContract.proofPrompt,
        expectedSignals: learningContract.successCriteria,
        nextStep: `Open the ${course.domainLabel} practice workspace.`,
      },
      dailyConcept: {
        conceptLabel: learningContract.conceptLabel,
        canDoStatement: learningContract.canDoStatement,
        proofPrompt: learningContract.proofPrompt,
        proofType: learningContract.proofType,
        successCriteria: learningContract.successCriteria,
      },
      learningContract,
      interactions: [],
    },
  }
}

function buildQuizQuestions(course, hard = false) {
  if (isPythonCourse(course)) {
    return {
      questions: [
        {
          question: 'What does this Python line do? name = "Ari"',
          options: ['Prints Ari', 'Stores the text "Ari" in a variable named name', 'Checks if name equals Ari', 'Creates a file named Ari'],
          correctIndex: 1,
          explanation: '= assigns the value on the right to the variable name on the left.',
        },
        {
          question: 'Which line prints the value stored in the variable name?',
          options: ['print("name")', 'print(name)', 'show(name)', 'name.print()'],
          correctIndex: 1,
          explanation: 'Quotes make literal text. Without quotes, Python looks up the variable value.',
        },
        {
          question: hard ? 'Why is minutes = 20 better than typing 20 everywhere?' : 'Which value is a string?',
          options: hard
            ? ['It lets the program reuse and change the value in one place', 'It makes Python run without errors automatically', 'It turns 20 into a sentence', 'It deletes the number after printing']
            : ['20', '"Python"', 'minutes', 'print'],
          correctIndex: hard ? 0 : 1,
          explanation: hard ? 'Variables make programs easier to change and understand.' : 'Text values are strings, and strings need quotes.',
        },
      ],
    }
  }

  return {
    questions: [
      {
        question: `What should the first ${course.domainLabel} task prove?`,
        options: ['Recognition only', 'A visible domain action with reasoning', 'A motivational reflection', 'A random fact'],
        correctIndex: 1,
        explanation: 'PathAI tasks should prove usable knowledge through domain-specific action.',
      },
      {
        question: `Why does the lesson stay narrow for ${course.concept}?`,
        options: ['To make it shorter', 'To avoid teaching anything', 'So the next proof only needs taught knowledge', 'So every domain can use the same quiz'],
        correctIndex: 2,
        explanation: 'The next task should never require hidden prerequisites.',
      },
      {
        question: hard ? 'What makes this a transfer task?' : 'What belongs in the completion check?',
        options: hard ? ['Same example copied back', 'A nearby new scenario', 'A longer title', 'More XP'] : ['Proof prompt and expected signals', 'Only a badge', 'Only a timer', 'Only a search box'],
        correctIndex: hard ? 1 : 0,
        explanation: hard ? 'Transfer means applying the idea beyond the exact worked example.' : 'Completion checks should name what proof looks like.',
      },
    ],
  }
}

function buildFlashcards(course) {
  if (isPythonCourse(course)) {
    return {
      cards: [
        { front: 'Value', back: 'A piece of information in a program, such as "Ari" or 20.', hint: 'Data you can store.' },
        { front: 'Variable', back: 'A name that stores a value so you can reuse it later.', hint: 'A labeled box.' },
        { front: 'Assignment', back: 'Using = to put a value into a variable, like minutes = 20.', hint: 'Right side goes into left name.' },
        { front: 'print()', back: 'A Python function that displays output on the screen.', hint: 'How you see what happened.' },
      ],
    }
  }

  return {
    cards: [
      { front: 'One-concept lesson', back: 'A lesson that teaches exactly one usable idea before practice.', hint: 'Scope control.' },
      { front: 'Proof of knowledge', back: `A visible ${course.domainLabel} action plus reasoning.`, hint: 'Not just reading.' },
      { front: 'Transfer', back: 'Using the idea in a nearby new scenario.', hint: 'Beyond copying.' },
      { front: 'Domain workspace', back: `The UI surface where ${course.domainLabel} practice actually feels like the subject.`, hint: 'Subject-specific.' },
    ],
  }
}

function buildChallenge(course) {
  if (isPythonCourse(course)) {
    return {
      title: 'Python Variables Transfer Challenge',
      difficulty: 'beginner',
      timeLimit: 600,
      prompt: 'Write a tiny Python program that stores a snack name, a quantity, and prints a sentence like "I packed 3 apples." Then explain which parts are variables and which parts are values.',
      hints: [
        'Text like "apples" needs quotes.',
        'A number like 3 can be stored without quotes.',
        'Use print() to display the final sentence.',
      ],
      solution: [
        'snack = "apples"',
        'quantity = 3',
        'print(f"I packed {quantity} {snack}.")',
        '',
        'snack and quantity are variables. "apples" and 3 are values.',
      ].join('\n'),
    }
  }

  return {
    title: `${course.domainLabel} Transfer Challenge`,
    difficulty: 'beginner',
    timeLimit: 600,
    prompt: `Use the prompt "${course.prompt}" to design one task that proves real ${course.domainLabel} understanding. Name the artifact, the learner action, and the success signal.`,
    hints: [
      'Start with what the learner can see or manipulate.',
      'Match the task to the domain workspace.',
      'The success signal should be observable.',
    ],
    solution: `A strong challenge asks the learner to perform one ${course.domainLabel} move, explain the reasoning, and transfer it to a nearby case.`,
  }
}

function buildBoss(course) {
  if (isPythonCourse(course)) {
    return {
      boss_name: 'The Variable Vault',
      boss_intro: 'Beat the vault by proving you can store values, print output, and explain the difference between text and variables.',
      victory_message: 'You can now use variables and print() to make Python show useful output.',
      defeat_message: 'Review assignment, quotes, and print(), then try the vault again.',
      phases: [
        {
          type: 'quiz',
          title: 'Assignment Check',
          description: 'Show that you know what = does in Python.',
          questions: [
            {
              question: 'What does age = 12 do?',
              options: ['Prints 12', 'Stores 12 in age', 'Checks if age is 12', 'Deletes age'],
              correctIndex: 1,
              explanation: '= assigns the value to the variable.',
            },
          ],
        },
        {
          type: 'challenge',
          title: 'Output Check',
          description: 'Write a tiny program using two variables and print().',
          prompt: 'Create item and count variables, then print one sentence using both.',
          task: 'Use variables to produce readable output.',
        },
        {
          type: 'explain',
          title: 'Quote Check',
          description: 'Explain the difference between literal text and variable lookup.',
          prompt: 'Explain why print("name") and print(name) are different.',
        },
      ],
    }
  }

  return {
    boss_name: `${course.domainLabel} Gatekeeper`,
    boss_intro: `This boss checks whether the lesson, task, and proof logic for "${course.prompt}" actually fit together.`,
    victory_message: 'The path logic held up under transfer.',
    defeat_message: 'The path needs tighter scope or clearer proof.',
    phases: [
      {
        type: 'quiz',
        title: 'Scope Check',
        description: 'Prove the lesson only teaches what the next task needs.',
        questions: [
          {
            question: 'What is the safest next task after a beginner lesson?',
            options: ['A domain action using taught knowledge', 'A huge capstone', 'A hidden tool requirement', 'An unrelated quiz'],
            correctIndex: 0,
            explanation: 'The next task should use only what the lesson introduced.',
          },
        ],
      },
      {
        type: 'challenge',
        title: 'Workspace Check',
        description: 'Explain how the domain workspace proves skill.',
        prompt: `Describe the ${course.domainLabel} artifact, action, and proof signal.`,
        task: 'Write a concrete proof rule.',
      },
      {
        type: 'explain',
        title: 'Transfer Check',
        description: 'Move the idea to a nearby new scenario.',
        prompt: 'Explain what changes and what stays the same.',
      },
    ],
  }
}

function getProjectSkillType(course) {
  const workspace = course.workspaceTask?.workspaceType || 'writing'
  if (workspace === 'coding') return 'coding'
  if (workspace === 'math' || workspace === 'statistics') return 'math'
  if (workspace === 'language') return 'language'
  if (workspace === 'music') return 'music'
  if (workspace === 'creative') return 'design'
  if (workspace === 'writing' || workspace === 'reading' || workspace === 'history' || workspace === 'civics' || workspace === 'psychology' || workspace === 'communication') return 'writing'
  if (workspace === 'engineering' || workspace === 'technology') return 'hardware'
  if (workspace === 'business' || workspace === 'finance' || workspace === 'economics' || workspace === 'security' || workspace === 'data_ai') return 'business'
  return 'science'
}

function buildPresetProject(course, task, activeType) {
  const milestone = activeType === 'milestone_project'
  const skillType = getProjectSkillType(course)
  const requiresCode = skillType === 'coding'
  const concept = course.concept
  const proofNoun = milestone ? 'milestone proof' : 'mini project proof'
  const starterCode = course.workspaceTask?.starterCode || [
    'def solve():',
    `    return "${course.domainLabel} proof"`,
    '',
    'print(solve())',
  ].join('\n')

  const projectBrief = {
    final_deliverable: `A ${course.domainLabel} artifact that proves the learner can use ${concept} without hidden prerequisites.`,
    real_world_context: `This static project mirrors what a generated PathAI project should ask for after the lesson prompt: "${course.prompt}".`,
    verification_summary: 'The project should verify planning, execution, test evidence, and a short defense explanation.',
  }

  const sharedStepFields = {
    concepts: [concept, `${course.domainLabel} proof`, 'transfer'],
    hint: 'Keep the artifact small enough that every step can be tied back to the lesson.',
    checkpoint: true,
    defense_prompt: `Explain why your ${course.domainLabel} artifact proves ${concept} and how it would transfer to a nearby case.`,
  }

  const steps = [
    {
      id: 'plan',
      title: 'Plan the proof',
      description: `Name the exact ${course.domainLabel} artifact, the learner action, and the success signal before building.`,
      required_output: `A short plan for the ${proofNoun}.`,
      verification_focus: 'The plan must stay inside concepts taught by the lesson.',
      requires_response: true,
      response_prompt: `Write the plan for this ${course.domainLabel} project.`,
      min_words: 20,
      ...sharedStepFields,
    },
    {
      id: 'build',
      title: requiresCode ? 'Build the working artifact' : 'Create the domain artifact',
      description: requiresCode
        ? 'Implement the smallest runnable version of the artifact and keep the behavior testable.'
        : `Create the main ${course.domainLabel} artifact: diagram, analysis, draft, model, decision, or response depending on the domain.`,
      required_output: requiresCode ? 'Runnable code with one clear expected output.' : `A concrete ${course.domainLabel} artifact, not just a description of effort.`,
      verification_focus: requiresCode ? 'The code should be coherent and testable.' : 'The artifact should expose visible reasoning.',
      requires_code: requiresCode,
      requires_response: !requiresCode,
      starter_code: requiresCode ? starterCode : undefined,
      response_prompt: requiresCode ? undefined : `Submit the ${course.domainLabel} artifact or describe it precisely.`,
      min_words: requiresCode ? undefined : 35,
      ...sharedStepFields,
    },
    {
      id: 'test',
      title: 'Test the result',
      description: `Check the artifact against the ${course.domainLabel} success criteria and identify one weakness.`,
      required_output: 'Test result, evidence, and one revision note.',
      verification_focus: 'The test should use evidence from the artifact, not vague confidence.',
      requires_response: true,
      response_prompt: 'What did you test, what happened, and what would you revise?',
      min_words: 25,
      ...sharedStepFields,
    },
    {
      id: 'defend',
      title: milestone ? 'Defend the milestone' : 'Explain the transfer',
      description: milestone
        ? `Connect at least three ${course.domainLabel} skills and defend how the project proves readiness.`
        : `Explain how the same idea would work in a nearby ${course.domainLabel} scenario.`,
      required_output: 'A final proof explanation with transfer.',
      verification_focus: 'The defense must connect action, evidence, and transfer.',
      requires_response: true,
      response_prompt: `Write the final ${course.domainLabel} defense.`,
      min_words: 35,
      ...sharedStepFields,
    },
  ]

  return {
    id: `ui-devtool-project-${course.domain}-${activeType}`,
    title: task.title,
    description: `Static ${course.domainLabel} ${milestone ? 'milestone' : 'mini'} project generated from "${course.prompt}".`,
    status: 'active',
    mode: milestone ? 'build' : 'guided',
    domain: course.domain,
    skill_type: skillType,
    difficulty: milestone ? 'intermediate' : 'beginner',
    estimated_minutes: milestone ? 60 : 35,
    xp_reward: milestone ? 150 : 80,
    gem_reward: milestone ? 40 : 20,
    starter_language: requiresCode ? 'python' : undefined,
    starter_code: requiresCode ? starterCode : `Prompt: ${course.prompt}\n\nCreate a ${course.domainLabel} artifact that proves ${concept}.`,
    concepts_tested: [concept, `${course.domainLabel} workspace`, 'proof of knowledge'],
    final_deliverable: projectBrief.final_deliverable,
    deliverables: [
      'Proof plan',
      `${course.domainLabel} artifact`,
      'Test evidence',
      'Transfer defense',
    ],
    steps,
    progress: {
      steps_completed: [],
      deliverables_completed: [],
      verification_status: 'in_progress',
      step_verification: {},
      project_brief: projectBrief,
    },
    authenticity_score: 88,
  }
}

function seedViewerCache(course, task, activeType) {
  if (typeof window === 'undefined') return
  try {
    if (activeType === 'quiz' || activeType === 'final_exam') {
      window.localStorage.setItem(`pathai.quiz.v2::${course.domain}::${task.id || task.title}`, JSON.stringify(buildQuizQuestions(course, activeType === 'final_exam')))
    }
    if (activeType === 'flashcards') {
      window.localStorage.setItem(`pathai.flashcard.v2::${course.domain}::${task.id || task.title}`, JSON.stringify(buildFlashcards(course)))
    }
    if (activeType === 'test') {
      window.localStorage.setItem(`pathai.challenge.v2::${course.domain}::${task.id || task.title}`, JSON.stringify(buildChallenge(course)))
    }
    if (activeType === 'boss') {
      window.localStorage.setItem(`pathai.boss.v2::${course.domain}::${task.id || task.title}`, JSON.stringify(buildBoss(course)))
    }
  } catch {}
}

function ActualLessonOverlay({ course, activeType, onClose }) {
  const task = buildViewerTask(course, activeType)
  const goal = course.prompt
  const knowledge = `Static UI devtool course.\n\nAPI prompt:\n${course.apiPrompt}`
  const domainConfig = buildDomainConfig(course.domain)
  const onComplete = () => onClose()

  if (activeType === 'lesson') {
    return (
      <LessonViewer
        concept={course.concept}
        taskTitle={task.title}
        goal={goal}
        knowledge={knowledge}
        lessonKey={`ui-devtool-${course.domain}-${activeType}`}
        presetLesson={buildPresetLesson(course)}
        sourceTask={task}
        domain={course.domain}
        domainConfig={domainConfig}
        aiMode="hint"
        onClose={onClose}
        onComplete={onComplete}
      />
    )
  }

  if (activeType === 'guided_practice' || activeType === 'domain_task') {
    const previewTask = getPreviewTask(course, activeType)
    const taskType = task.domainTaskType || previewTask.taskType
    return (
      <div className="actual-domain-task-overlay">
        <div className="actual-domain-task-topbar">
          <button type="button" onClick={onClose}>Close</button>
          <strong>{task.title}</strong>
          <span>{getDomainTaskLabel(taskType)}</span>
        </div>
        <DomainTaskBase
          taskType={taskType}
          domain={course.domain}
          goal={goal}
          topic={course.concept}
          taskTitle={task.title}
          lessonContent={knowledge}
          userLevel="beginner"
          initialTask={previewTask}
          staticPreview
          onComplete={onComplete}
        />
      </div>
    )
  }

  if (activeType === 'quiz' || activeType === 'final_exam') {
    return (
      <MultiQuizView
        task={task}
        goal={goal}
        knowledge={knowledge}
        domain={course.domain}
        onClose={onClose}
        onComplete={onComplete}
      />
    )
  }

  if (activeType === 'flashcards') {
    return (
      <FlashcardView
        task={task}
        goal={goal}
        knowledge={knowledge}
        domain={course.domain}
        onClose={onClose}
        onComplete={onComplete}
      />
    )
  }

  if (activeType === 'test') {
    return (
      <ChallengeView
        task={task}
        goal={goal}
        knowledge={knowledge}
        domain={course.domain}
        onClose={onClose}
        onComplete={onComplete}
      />
    )
  }

  if (activeType === 'boss') {
    return (
      <BossChallengeView
        task={task}
        goal={goal}
        knowledge={knowledge}
        domain={course.domain}
        onClose={onClose}
        onComplete={onComplete}
      />
    )
  }

  if (activeType === 'reflection') {
    return (
      <ReflectionView
        task={task}
        goal={goal}
        knowledge={knowledge}
        domain={course.domain}
        staticPreview
        onClose={onClose}
        onComplete={onComplete}
      />
    )
  }

  if (activeType === 'discussion') {
    return (
      <AIInteractionView
        task={task}
        goal={goal}
        knowledge={knowledge}
        domain={course.domain}
        presetInteraction={{
          staticPreview: true,
          type: 'explain',
          prompt_to_student: `Teach back the first usable idea in ${course.concept}. Use one ${course.domainLabel} example and one transfer case.`,
          question: `What proof would show real ${course.domainLabel} understanding?`,
          scenario: `A learner is following the static prompt "${course.prompt}".`,
          typeConfig: { label: 'Explain', icon: 'message' },
        }}
        onClose={onClose}
        onComplete={onComplete}
      />
    )
  }

  if (activeType === 'mini_project' || activeType === 'milestone_project') {
    return (
      <ProjectViewer
        task={task}
        goal={goal}
        knowledge={knowledge}
        domain={course.domain}
        readOnly
        presetProject={buildPresetProject(course, task, activeType)}
        onClose={onClose}
        onComplete={onComplete}
      />
    )
  }

  return null
}

function Card({ children, className = '' }) {
  return <section className={`ui-card ${className}`}>{children}</section>
}

function Label({ children }) {
  return <div className="ui-label">{children}</div>
}

function CourseMapPreview({ course, setActiveType }) {
  return (
    <div className="course-map-preview">
      <Card className="map-intro">
        <Label>Premade Static Course</Label>
        <h2>{course.domainLabel} Logic Lab</h2>
        <p>
          This is the frozen course slice used to redesign lesson logic. It mirrors the API-generated path shape,
          but every task is static so UI changes are safe and repeatable.
        </p>
      </Card>
      <div className="course-task-grid">
        {course.tasks.map((task, index) => {
          const typeConfig = DEVTOOL_LESSON_TYPES.find((type) => type.id === task.id)
          const Icon = TYPE_ICONS[task.id] || FileText
          return (
            <button
              key={task.id}
              type="button"
              className="course-task-row"
              onClick={() => {
                setActiveType(task.id)
              }}
            >
              <span className="task-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="task-icon"><Icon size={18} /></span>
              <span>
                <strong>{task.title}</strong>
                <em>{typeConfig?.description || task.proof}</em>
              </span>
              <small>{task.duration}</small>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function InlinePreviewText({ text }) {
  const parts = String(text || '').split(/(`[^`]+`)/g)
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={`${part}-${index}`}>{part.slice(1, -1)}</code>
        }
        return <span key={`${part}-${index}`}>{part}</span>
      })}
    </>
  )
}

function PreviewCodeBlock({ code, activeLine = null }) {
  const lines = String(code || '').split('\n')
  return (
    <pre className="slideshow-code-preview">
      {lines.map((line, index) => {
        const lineNumber = index + 1
        return (
          <span key={`${line}-${lineNumber}`} className={activeLine === lineNumber ? 'is-active' : ''}>
            <em>{lineNumber}</em>
            <code>{line || ' '}</code>
          </span>
        )
      })}
    </pre>
  )
}

function looksLikePreviewCodeLine(line = '') {
  const raw = String(line || '')
  const trimmed = raw.trim()
  if (!trimmed) return false
  return /^(```|>>>|\.\.\.)/.test(trimmed)
    || /^<\/?[A-Za-z][^>]*>?$/.test(trimmed)
    || /^[A-Za-z_$][\w$]*\s*=/.test(trimmed)
    || /\b(print|console\.log|return|import|from|def|class|for|while|if|elif|else|function|const|let|var)\b/.test(trimmed)
    || /[{};]/.test(trimmed)
}

function splitPreviewCodeQuestion(question = '') {
  const lines = String(question || '').replace(/\r\n/g, '\n').split('\n')
  const codeStart = lines.findIndex((line) => looksLikePreviewCodeLine(line))
  if (codeStart === -1) {
    return { prompt: String(question || '').trim(), code: '', trailing: '' }
  }

  const prompt = lines.slice(0, codeStart).join('\n').trim()
  const codeLines = []
  const trailingLines = []
  let inTrailing = false

  lines.slice(codeStart).forEach((line) => {
    if (!inTrailing && (looksLikePreviewCodeLine(line) || !line.trim() || /^\s+/.test(line))) {
      codeLines.push(line)
      return
    }
    inTrailing = true
    trailingLines.push(line)
  })

  return {
    prompt: prompt || 'Inspect this code.',
    code: codeLines.join('\n').replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim(),
    trailing: trailingLines.join('\n').trim(),
  }
}

function PreviewCodeQuestion({ question }) {
  const parsed = splitPreviewCodeQuestion(question)
  if (!parsed.code) {
    return <div className="slideshow-question-preview"><InlinePreviewText text={parsed.prompt} /></div>
  }

  return (
    <div className="slideshow-question-stack-preview">
      <div className="slideshow-question-preview"><InlinePreviewText text={parsed.prompt} /></div>
      <PreviewCodeBlock code={parsed.code} />
      {parsed.trailing && <div className="slideshow-question-preview"><InlinePreviewText text={parsed.trailing} /></div>}
    </div>
  )
}

function normalizePreviewVariableNodes(nodes = []) {
  const values = Array.isArray(nodes) ? nodes.map((node) => String(node || '').trim()).filter(Boolean) : []
  const first = values[0] || 'name'
  const assignmentMatch = first.match(/^([A-Za-z_$][\w$]*)\s*=\s*(.+)$/)
  if (assignmentMatch) return [assignmentMatch[1], '=', assignmentMatch[2]]

  const second = values[1] || '='
  const third = values[2] || 'value'
  if (/^(=|:=|<-)$/.test(second)) return [first, second, third]
  return [first, '=', second]
}

function PreviewDiagramTile({ eyebrow, children, active = false }) {
  return (
    <div className={`preview-diagram-tile ${active ? 'is-active' : ''}`}>
      {eyebrow ? <span>{eyebrow}</span> : null}
      <strong>{children}</strong>
    </div>
  )
}

function PreviewDiagramList({ nodes = [], activeLast = false }) {
  const safeNodes = nodes.length ? nodes : ['Read', 'Think', 'Answer']
  return (
    <div className="preview-diagram-list">
      {safeNodes.slice(0, 5).map((node, index) => (
        <div className={`preview-diagram-row ${activeLast && index === safeNodes.slice(0, 5).length - 1 ? 'is-active' : ''}`} key={`${node}-${index}`}>
          <span>{index + 1}</span>
          <strong><InlinePreviewText text={node} /></strong>
        </div>
      ))}
    </div>
  )
}

function PreviewVisual({ visual }) {
  if (!visual || visual.type === 'none') return null
  const nodes = Array.isArray(visual.nodes) && visual.nodes.length > 0 ? visual.nodes : [visual.title].filter(Boolean)
  const isHtmlDiagram = /\bhtml\b|<!doctype|<head|<body/i.test(nodes.join(' '))
  if (visual.type === 'nested') {
    const nestedNodes = nodes.slice(0, 4)
    const nestedContent = nestedNodes.reduceRight((child, node, index) => (
      <div className={`preview-nested-layer layer-${index}`} key={`${node}-${index}`}>
        <span>{index === 0 ? 'outer category' : `inside ${nestedNodes[index - 1]}`}</span>
        <strong><InlinePreviewText text={node} /></strong>
        {child}
      </div>
    ), null)

    return (
      <div className="preview-diagram">
        <div className="preview-diagram-header"><span>Hierarchy</span><strong>{visual.title}</strong></div>
        <div className="preview-nested-diagram">{nestedContent}</div>
        {visual.caption && <p><InlinePreviewText text={visual.caption} /></p>}
      </div>
    )
  }
  if (visual.type === 'system_flow') {
    return (
      <div className="preview-diagram">
        <div className="preview-diagram-header"><span>System flow</span><strong>{visual.title}</strong></div>
        <div className="preview-system-flow">
          {nodes.slice(0, 5).map((node, index) => (
            <div className={`preview-system-flow-card ${index === nodes.slice(0, 5).length - 1 ? 'is-final' : ''}`} key={`${node}-${index}`}>
              <span>{index + 1}</span>
              <strong><InlinePreviewText text={node} /></strong>
              {index < nodes.slice(0, 5).length - 1 && <small>then</small>}
            </div>
          ))}
        </div>
        {visual.caption && <p><InlinePreviewText text={visual.caption} /></p>}
      </div>
    )
  }
  if (visual.type === 'variable_box') {
    const [name = 'name', operator = '=', value = 'value'] = normalizePreviewVariableNodes(nodes)
    return (
      <div className="preview-diagram">
        <div className="preview-diagram-header"><span>Variable</span><strong>{visual.title}</strong></div>
        <div className="preview-diagram-grid">
          <PreviewDiagramTile eyebrow="code line"><code>{name} {operator} {value}</code></PreviewDiagramTile>
          <PreviewDiagramTile eyebrow="variable name" active><code>{name}</code></PreviewDiagramTile>
          <PreviewDiagramTile eyebrow="stored value" active><code>{value}</code></PreviewDiagramTile>
        </div>
        {visual.caption && <p><InlinePreviewText text={visual.caption} /></p>}
      </div>
    )
  }
  if (isHtmlDiagram) {
    const htmlNodes = [
      nodes[0] || '<!DOCTYPE html>',
      nodes[1] || '<html>',
      nodes[2] || '<head>',
      nodes[3] || '<body>',
    ]
    return (
      <div className="preview-diagram">
        <div className="preview-diagram-header"><span>HTML</span><strong>{visual.title}</strong></div>
        <PreviewDiagramList nodes={htmlNodes} activeLast />
        {visual.caption && <p><InlinePreviewText text={visual.caption} /></p>}
      </div>
    )
  }
  if (visual.type === 'code_flow') {
    return (
      <div className="preview-diagram">
        <div className="preview-diagram-header"><span>Flow</span><strong>{visual.title}</strong></div>
        <PreviewDiagramList nodes={nodes.slice(0, 3)} activeLast />
        {visual.caption && <p><InlinePreviewText text={visual.caption} /></p>}
      </div>
    )
  }
  return (
    <div className="preview-diagram">
      <div className="preview-diagram-header"><span>Diagram</span><strong>{visual.title}</strong></div>
      <PreviewDiagramList nodes={nodes} />
      {visual.caption && <p><InlinePreviewText text={visual.caption} /></p>}
    </div>
  )
}

function LessonPreview({ course, openActualViewer }) {
  const lessonDoc = normalizeConceptSlideshowLesson(buildPresetLesson(course).lessonDoc, {
    concept: course.concept,
    goal: course.prompt,
    domain: course.domain,
    domainConfig: buildDomainConfig(course.domain),
  })
  const slides = Array.isArray(lessonDoc.slides) ? lessonDoc.slides : []
  const [slideIndex, setSlideIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [visualAnswers, setVisualAnswers] = useState({})
  const [breakdownSteps, setBreakdownSteps] = useState({})
  const [redemptionMode, setRedemptionMode] = useState(false)
  const [result, setResult] = useState(null)

  if (!slides.length) {
    return (
      <div className="lesson-preview-shell">
        <Card>
          <Label>Concept Slideshow</Label>
          <h2>{lessonDoc.title || course.concept}</h2>
          <p className="copy">This domain does not have a static slideshow payload yet.</p>
        </Card>
      </div>
    )
  }

  const slide = slides[slideIndex] || slides[0]
  const isCheck = slide.type === 'mini_check' || slide.type === 'final_check'
  const isFinal = slide.type === 'final_check'
  const isVisualInteractive = slide.type === 'visual_interactive'
  const question = isFinal && redemptionMode ? slide.redemptionQuestion : slide
  const answerKey = `${slideIndex}:${redemptionMode ? 'redemption' : 'primary'}`
  const selectedAnswer = answers[answerKey]
  const visualAnswerKey = `${slideIndex}:visual`
  const visualAnswer = visualAnswers[visualAnswerKey]
  const visualRequiresAnswer = Boolean(isVisualInteractive && String(slide.correctAnswer || '').trim())
  const currentBreakdownStep = breakdownSteps[slideIndex] || 0
  const activeBreakdownLine = slide.type === 'code_breakdown'
    ? slide.steps?.[Math.min(currentBreakdownStep, Math.max((slide.steps || []).length - 1, 0))]?.line
    : null
  const progress = ((slideIndex + 1) / slides.length) * 100
  const canGoNext = (() => {
    if (result) return false
    if (!slide) return false
    if (isFinal) return false
    if (slide.type === 'mini_check') return selectedAnswer != null
    if (isVisualInteractive && visualRequiresAnswer) return Boolean(visualAnswer)
    return slideIndex < slides.length - 1
  })()

  function chooseAnswer(index) {
    if (!isCheck || selectedAnswer != null || result) return
    const correct = index === question.correctIndex
    setAnswers((current) => ({ ...current, [answerKey]: index }))
    if (!isFinal) return
    if (correct) {
      setResult('mastered')
    } else if (!redemptionMode) {
      setRedemptionMode(true)
    } else {
      setResult('review')
    }
  }

  function goNext() {
    if (!slide || result) return
    if (slide.type === 'code_breakdown' && currentBreakdownStep < (slide.steps || []).length - 1) {
      setBreakdownSteps((current) => ({ ...current, [slideIndex]: currentBreakdownStep + 1 }))
      return
    }
    if (canGoNext) setSlideIndex((current) => Math.min(slides.length - 1, current + 1))
  }

  function goBack() {
    if (slideIndex === 0 || result) return
    setSlideIndex((current) => Math.max(0, current - 1))
    setRedemptionMode(false)
  }

  function restart() {
    setSlideIndex(0)
    setAnswers({})
    setVisualAnswers({})
    setBreakdownSteps({})
    setRedemptionMode(false)
    setResult(null)
  }

  function renderSlideBody() {
    if (result) {
      return (
        <div className="slideshow-result-preview">
          <div className={result === 'mastered' ? 'result-orb mastered' : 'result-orb review'}>
            {result === 'mastered' ? '✓' : '!'}
          </div>
          <h2>{result === 'mastered' ? 'Concept mastered' : 'Needs review'}</h2>
          <p>
            {result === 'mastered'
              ? 'The learner passed the final check.'
              : 'The learner finished, but the concept should come back soon.'}
          </p>
        </div>
      )
    }

    if (slide.type === 'concept_intro') {
      return (
        <>
          <Label>Concept</Label>
          <h2>{slide.title}</h2>
          <PreviewVisual visual={slide.visual} />
          <p className="slideshow-big-copy"><InlinePreviewText text={slide.body} /></p>
        </>
      )
    }

    if (slide.type === 'example') {
      return (
        <>
          <Label>Example</Label>
          <h2>{slide.title}</h2>
          <PreviewVisual visual={slide.visual} />
          <PreviewCodeBlock code={slide.code} />
          <p className="slideshow-copy"><InlinePreviewText text={slide.explanation} /></p>
        </>
      )
    }

    if (slide.type === 'code_breakdown') {
      const step = slide.steps?.[Math.min(currentBreakdownStep, Math.max((slide.steps || []).length - 1, 0))]
      return (
        <>
          <Label>Code Breakdown</Label>
          <h2>{slide.title}</h2>
          <PreviewVisual visual={slide.visual} />
          <PreviewCodeBlock code={slide.code} activeLine={activeBreakdownLine} />
          {step && (
            <div className="slideshow-feedback-preview is-info">
              <strong>Line {step.line}</strong>
              <span><InlinePreviewText text={step.explanation} /></span>
            </div>
          )}
        </>
      )
    }

    if (isVisualInteractive) {
      return (
        <>
          <Label>Interactive Visual</Label>
          <h2>{slide.title}</h2>
          <DomainVisualBlock
            key={`${slideIndex}:${slide.domainVisualType}`}
            domain={course.domain}
            domainVisualType={slide.domainVisualType}
            data={{
              ...(slide.data || {}),
              prompt: slide.prompt,
              correctAnswer: slide.correctAnswer,
              explanation: slide.explanation,
            }}
            completed={Boolean(visualAnswer)}
            onAnswer={(payload) => setVisualAnswers((current) => ({ ...current, [visualAnswerKey]: payload }))}
          />
        </>
      )
    }

    if (isCheck) {
      const correct = selectedAnswer === question.correctIndex
      return (
        <>
          <Label>{isFinal ? redemptionMode ? 'Redemption Check' : 'Final Check' : 'Mini Check'}</Label>
          <h2>{redemptionMode ? 'One more try' : slide.title}</h2>
          <PreviewVisual visual={slide.visual} />
          <PreviewCodeQuestion question={question.question} />
          <div className="slideshow-options-preview">
            {(question.options || []).map((option, index) => {
              const selected = selectedAnswer === index
              const showState = selectedAnswer != null
              const className = [
                'slideshow-option-preview',
                selected ? 'is-selected' : '',
                showState && index === question.correctIndex ? 'is-correct' : '',
                showState && selected && index !== question.correctIndex ? 'is-wrong' : '',
              ].filter(Boolean).join(' ')
              return (
                <button key={`${option}-${index}`} type="button" className={className} onClick={() => chooseAnswer(index)}>
                  <span>{String.fromCharCode(65 + index)}</span>
                  <strong><InlinePreviewText text={option} /></strong>
                </button>
              )
            })}
          </div>
          {selectedAnswer != null && (
            <div className={correct ? 'slideshow-feedback-preview is-correct' : 'slideshow-feedback-preview is-wrong'}>
              <strong>{correct ? 'Correct' : redemptionMode ? 'Review flagged' : 'Try redemption'}</strong>
              <span><InlinePreviewText text={question.explanation} /></span>
            </div>
          )}
        </>
      )
    }

    return null
  }

  return (
    <div className="lesson-preview-shell">
      <section className="slideshow-preview">
        <div className="slideshow-preview-top">
          <div>
            <Label>Concept Slideshow Preview</Label>
            <h1>{lessonDoc.title}</h1>
          </div>
          <button type="button" onClick={() => openActualViewer('lesson')}>Open fullscreen</button>
        </div>
        <div className="slideshow-preview-progress">
          <span style={{ width: `${result ? 100 : progress}%` }} />
        </div>
        <div className="slideshow-preview-card">
          {renderSlideBody()}
        </div>
        <div className="slideshow-preview-bottom">
          <button type="button" onClick={goBack} disabled={slideIndex === 0 || Boolean(result)}>Back</button>
          <div>{result ? 'Complete' : `Slide ${slideIndex + 1} of ${slides.length}`}</div>
          {result ? (
            <button type="button" onClick={restart}>Restart</button>
          ) : (
            <button type="button" onClick={goNext} disabled={!canGoNext}>
              {slide.type === 'code_breakdown' && currentBreakdownStep < (slide.steps || []).length - 1
                ? 'Next line'
                : isCheck && selectedAnswer == null
                  ? 'Answer to continue'
                  : isVisualInteractive && visualRequiresAnswer && !visualAnswer
                    ? 'Interact to continue'
                  : 'Continue'}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}

function AssessmentPreview({ course, activeType }) {
  const hard = activeType === 'test' || activeType === 'boss' || activeType === 'final_exam'
  return (
    <div className="assessment-preview">
      <Card>
        <Label>{hard ? 'Verification' : 'Quiz'} Blueprint</Label>
        <h2>{hard ? 'Transfer Proof Check' : 'Fast Understanding Check'}</h2>
        <p className="copy">
          This preview is intentionally domain-shaped. The learner must use evidence from {course.domainLabel},
          not just pick a generic answer.
        </p>
      </Card>
      <div className="assessment-layout">
        <Card>
          <Label>Question Stack</Label>
          {[
            'Identify the correct domain artifact.',
            'Choose the rule or model that applies.',
            'Explain the answer with one piece of evidence.',
            hard ? 'Transfer the idea to a new scenario.' : 'Name the common mistake.',
          ].map((item, index) => (
            <div key={item} className="question-row">
              <span>{index + 1}</span>
              <strong>{item}</strong>
            </div>
          ))}
        </Card>
        <Card>
          <Label>Scoring Logic</Label>
          <div className="score-bars">
            {[
              ['Accuracy', 84],
              ['Reasoning', hard ? 78 : 72],
              ['Transfer', hard ? 68 : 42],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <div><i style={{ width: `${value}%` }} /></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function FlashcardPreview({ course }) {
  return (
    <div className="flashcard-preview">
      {['Core term', 'Domain artifact', 'Common mistake', 'Transfer cue'].map((label, index) => (
        <Card key={label} className="flash-card">
          <Label>Card {index + 1}</Label>
          <h3>{label}</h3>
          <p>Recall this from the {course.domainLabel} lesson without opening the explanation.</p>
        </Card>
      ))}
    </div>
  )
}

function ReflectionPreview({ course }) {
  return (
    <div className="reflection-preview">
      <Card>
        <Label>Reflection</Label>
        <h2>What changed in your understanding?</h2>
        <textarea defaultValue={`I can now use one ${course.domainLabel} idea from "${course.concept}" because...`} />
      </Card>
      <Card>
        <Label>Misconception Capture</Label>
        <div className="reflection-chips">
          {['Still fragile', 'Need example', 'Confused by vocabulary', 'Ready for transfer'].map((chip) => <span key={chip}>{chip}</span>)}
        </div>
      </Card>
    </div>
  )
}

function ProjectPreview({ course, activeType }) {
  const milestone = activeType === 'milestone_project'
  return (
    <div className="project-preview">
      <Card className="project-brief">
        <Label>{milestone ? 'Milestone Project' : 'Mini Project'}</Label>
        <h2>{milestone ? 'Combine Three Skills' : 'Build One Small Artifact'}</h2>
        <p className="copy">
          Create a concrete {course.domainLabel} artifact for {course.concept}. The project has checkpoints so the UI can be redesigned around progress, proof, and review.
        </p>
      </Card>
      <div className="checkpoint-grid">
        {['Plan', 'Build', 'Test', 'Explain'].map((step, index) => (
          <Card key={step}>
            <Label>Checkpoint {index + 1}</Label>
            <h3>{step}</h3>
            <p>{step === 'Explain' ? 'Submit proof and reflection.' : `Complete the ${step.toLowerCase()} stage.`}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

function DiscussionPreview({ course }) {
  return (
    <div className="discussion-preview">
      <Card>
        <Label>AI Coach Prompt</Label>
        <h2>Teach it back</h2>
        <p className="copy">
          Explain the concept from {course.concept} as if helping a beginner. The coach should push for evidence and correct misconceptions.
        </p>
      </Card>
      <Card className="chat-card">
        <div className="chat-bubble coach">What is the key move in this {course.domainLabel} task?</div>
        <div className="chat-bubble learner">The key move is...</div>
      </Card>
    </div>
  )
}

function WorkspacePreview({ course, activeType }) {
  const previewTask = getPreviewTask(course, activeType)
  return (
    <div className="workspace-shell">
      <DomainTaskBase
        taskType={previewTask.taskType}
        domain={course.domain}
        goal={course.prompt}
        topic={course.concept}
        taskTitle={previewTask.title}
        lessonContent="Static UI devtool preview. No live curriculum or goal APIs are called."
        userLevel="beginner"
        initialTask={previewTask}
        staticPreview
      />
    </div>
  )
}

function PreviewArea({ course, activeType, setActiveType, openActualViewer }) {
  if (activeType === 'course_map') return <CourseMapPreview course={course} setActiveType={setActiveType} />
  if (activeType === 'lesson') return <LessonPreview key={`${course.domain}:${course.prompt}`} course={course} openActualViewer={openActualViewer} />
  if (activeType === 'quiz' || activeType === 'test' || activeType === 'boss' || activeType === 'final_exam') {
    return <AssessmentPreview course={course} activeType={activeType} />
  }
  if (activeType === 'flashcards') return <FlashcardPreview course={course} />
  if (activeType === 'reflection') return <ReflectionPreview course={course} />
  if (activeType === 'mini_project' || activeType === 'milestone_project') return <ProjectPreview course={course} activeType={activeType} />
  if (activeType === 'discussion') return <DiscussionPreview course={course} />
  return <WorkspacePreview course={course} activeType={activeType} />
}

export default function UIDevtoolPage({
  lockedDomain = null,
  promptOverride = null,
  devtoolTitle = 'UI Devtool',
  headerLabel = 'Static course lab',
}) {
  const [domain, setDomain] = useState(lockedDomain || 'CS_CODING')
  const [activeType, setActiveType] = useState('course_map')
  const [viewerOpen, setViewerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const activeDomain = lockedDomain || domain
  const course = useMemo(() => buildDevtoolCourse(activeDomain, { promptOverride }), [activeDomain, promptOverride])
  const activeTypeConfig = DEVTOOL_LESSON_TYPES.find((type) => type.id === activeType) || DEVTOOL_LESSON_TYPES[0]

  function openActualViewer(type = activeType) {
    if (type === 'course_map') return
    const task = buildViewerTask(course, type)
    seedViewerCache(course, task, type)
    setActiveType(type)
    setViewerOpen(true)
  }

  const domainOptions = lockedDomain ? [lockedDomain] : LEARNING_DOMAINS
  const visibleDomains = domainOptions.filter((domainId) => {
    const meta = getDomainMetadata(domainId)
    const text = `${domainId} ${meta.label} ${meta.description}`.toLowerCase()
    return text.includes(search.trim().toLowerCase())
  })

  return (
    <main className="ui-devtool">
      <style>{styles}</style>
      <aside className="domain-rail">
        <div className="rail-top">
          <Link href="/dashboard">Back</Link>
          <strong>{devtoolTitle}</strong>
        </div>
        {!lockedDomain ? (
          <label className="domain-search">
            <Search size={15} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find domain" />
          </label>
        ) : (
          <div className="locked-domain-note">CS-only devtool</div>
        )}
        <div className="domain-list">
          {visibleDomains.map((domainId) => {
            const meta = getDomainMetadata(domainId)
            const active = domainId === activeDomain
            return (
              <button
                key={domainId}
                type="button"
                className={active ? 'is-active' : ''}
                disabled={Boolean(lockedDomain)}
                onClick={() => {
                  if (lockedDomain) return
                  setDomain(domainId)
                  setActiveType('course_map')
                  setViewerOpen(false)
                }}
              >
                <span>{meta.label}</span>
                <small>{getDomainTaskLabel(getDomainAssignmentTypeSafe(domainId, lockedDomain ? promptOverride : null))}</small>
              </button>
            )
          })}
        </div>
      </aside>

      <section className="main-lab">
        <header className="lab-header">
          <div>
            <div className="header-kicker"><Sparkles size={15} /> {headerLabel}</div>
            <h1>{course.domainLabel}</h1>
            <p>{activeTypeConfig.description}</p>
          </div>
          <div className="domain-pill">{course.domain}</div>
        </header>

        <section className="prompt-panel">
          <div>
            <Label>Domain Prompt</Label>
            <h2>{course.prompt}</h2>
            <button
              type="button"
              className="open-viewer-button"
              disabled={activeType === 'course_map'}
              onClick={() => openActualViewer(activeType)}
            >
              Open actual generated view
            </button>
          </div>
          <details>
            <summary>Generated curriculum API prompt</summary>
            <pre>{course.apiPrompt}</pre>
          </details>
        </section>

        <section className="preview-stage">
          <PreviewArea course={course} activeType={activeType} setActiveType={setActiveType} openActualViewer={openActualViewer} />
        </section>
      </section>

      <aside className="type-rail">
        <Label>Lesson Types</Label>
        <div className="type-list">
          {DEVTOOL_LESSON_TYPES.map((type) => {
            const Icon = TYPE_ICONS[type.id] || FileText
            const active = type.id === activeType
            return (
              <button
                key={type.id}
                type="button"
                className={active ? 'is-active' : ''}
                onClick={() => {
                  setActiveType(type.id)
                  setViewerOpen(false)
                }}
              >
                <Icon size={17} />
                <span>
                  <strong>{type.label}</strong>
                  <small>{type.stage}</small>
                </span>
              </button>
            )
          })}
        </div>
      </aside>

      {viewerOpen && activeType !== 'course_map' && (
        <ActualLessonOverlay course={course} activeType={activeType} onClose={() => setViewerOpen(false)} />
      )}
    </main>
  )
}

function getDomainAssignmentTypeSafe(domainId, promptOverride = null) {
  try {
    return buildDevtoolCourse(domainId, { promptOverride }).workspaceTask.taskType
  } catch {
    return 'GeneratedLesson'
  }
}

const styles = `
  .ui-devtool {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 286px minmax(0, 1fr) 286px;
    background:
      radial-gradient(circle at 12% 8%, rgba(14, 245, 194, 0.10), transparent 28%),
      radial-gradient(circle at 88% 6%, rgba(125, 211, 252, 0.12), transparent 30%),
      #070b12;
    color: #f8fafc;
    font-family: var(--font-body), 'DM Sans', system-ui, sans-serif;
  }

  .domain-rail,
  .type-rail {
    position: sticky;
    top: 0;
    height: 100vh;
    overflow: auto;
    padding: 18px;
    background: rgba(7, 12, 20, 0.86);
    border-color: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
  }

  .domain-rail {
    border-right: 1px solid rgba(255, 255, 255, 0.08);
  }

  .type-rail {
    border-left: 1px solid rgba(255, 255, 255, 0.08);
  }

  .rail-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }

  .rail-top a {
    color: #9be8ff;
    text-decoration: none;
    font-size: 12px;
    font-weight: 900;
  }

  .rail-top strong {
    font-size: 14px;
    color: #f8fafc;
  }

  .domain-search {
    height: 42px;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 0 12px;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 12px;
    color: #7dd3fc;
    background: rgba(255, 255, 255, 0.045);
    margin-bottom: 14px;
  }

  .locked-domain-note {
    margin-bottom: 14px;
    border: 1px solid rgba(14, 245, 194, 0.24);
    border-radius: 12px;
    padding: 11px 12px;
    color: #9fffe5;
    background: rgba(14, 245, 194, 0.07);
    font-size: 12px;
    font-weight: 950;
  }

  .domain-search input {
    width: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    color: #f8fafc;
    font: inherit;
    font-size: 13px;
  }

  .domain-list,
  .type-list {
    display: grid;
    gap: 7px;
  }

  .domain-list button,
  .type-list button {
    width: 100%;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 13px;
    background: rgba(255, 255, 255, 0.035);
    color: #cbd5e1;
    cursor: pointer;
    font: inherit;
    text-align: left;
    transition: border-color 0.16s ease, background 0.16s ease, transform 0.16s ease;
  }

  .domain-list button {
    padding: 11px 12px;
    display: grid;
    gap: 3px;
  }

  .domain-list button span,
  .type-list button strong {
    color: #f8fafc;
    font-weight: 900;
    font-size: 13px;
  }

  .domain-list button small,
  .type-list button small {
    color: #7f8da3;
    font-size: 11px;
    font-weight: 800;
  }

  .domain-list button:hover,
  .type-list button:hover {
    transform: translateX(2px);
    border-color: rgba(125, 211, 252, 0.30);
    background: rgba(125, 211, 252, 0.07);
  }

  .domain-list button:disabled {
    cursor: default;
  }

  .domain-list button:disabled:hover {
    transform: none;
  }

  .domain-list button.is-active,
  .type-list button.is-active {
    border-color: rgba(14, 245, 194, 0.48);
    background: linear-gradient(135deg, rgba(14, 245, 194, 0.14), rgba(125, 211, 252, 0.07));
  }

  .type-list button {
    min-height: 54px;
    padding: 10px 12px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .type-list button svg {
    color: #7dd3fc;
    flex-shrink: 0;
  }

  .main-lab {
    min-width: 0;
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .lab-header,
  .prompt-panel,
  .ui-card {
    border: 1px solid rgba(255, 255, 255, 0.09);
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.032));
    border-radius: 8px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07), 0 20px 52px rgba(0, 0, 0, 0.20);
  }

  .lab-header {
    min-height: 120px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 22px;
  }

  .header-kicker,
  .ui-label {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #7dd3fc;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }

  .lab-header h1,
  .prompt-panel h2,
  .ui-card h2,
  .ui-card h3 {
    margin: 8px 0 0;
    color: #ffffff;
    letter-spacing: 0;
  }

  .lab-header h1 {
    font-size: clamp(32px, 4vw, 54px);
    line-height: 0.98;
  }

  .lab-header p,
  .copy,
  .ui-card p {
    color: #aab7c8;
    font-size: 14px;
    line-height: 1.65;
  }

  .domain-pill {
    padding: 9px 12px;
    border-radius: 999px;
    border: 1px solid rgba(14, 245, 194, 0.30);
    color: #8fffe3;
    background: rgba(14, 245, 194, 0.08);
    font-size: 12px;
    font-weight: 950;
  }

  .prompt-panel {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(280px, 0.72fr);
    gap: 16px;
    padding: 18px;
  }

  .prompt-panel h2 {
    font-size: 24px;
  }

  .open-viewer-button {
    margin-top: 14px;
    border: 0;
    border-radius: 8px;
    padding: 12px 16px;
    background: linear-gradient(135deg, #7dd3fc, #0ef5c2);
    color: #041018;
    font: inherit;
    font-size: 13px;
    font-weight: 950;
    cursor: pointer;
  }

  .open-viewer-button:disabled {
    cursor: not-allowed;
    color: #64748b;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .actual-domain-task-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    overflow-y: auto;
    overflow-x: hidden;
    background: #070a12;
    font-family: var(--font-body), 'DM Sans', system-ui, sans-serif;
  }

  .actual-domain-task-topbar {
    position: sticky;
    top: 0;
    z-index: 5;
    min-height: 58px;
    display: grid;
    grid-template-columns: 90px minmax(0, 1fr) auto;
    align-items: center;
    gap: 14px;
    padding: 10px 18px;
    background: rgba(7, 10, 18, 0.93);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(22px);
    -webkit-backdrop-filter: blur(22px);
  }

  .actual-domain-task-topbar button {
    height: 36px;
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.07);
    color: #dbeafe;
    font: inherit;
    font-size: 13px;
    font-weight: 850;
    cursor: pointer;
  }

  .actual-domain-task-topbar strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #f8fafc;
    font-size: 14px;
  }

  .actual-domain-task-topbar span {
    color: #7dd3fc;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.09em;
    text-transform: uppercase;
  }

  .prompt-panel details {
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.18);
    padding: 12px;
  }

  .prompt-panel summary {
    cursor: pointer;
    color: #dbeafe;
    font-size: 13px;
    font-weight: 900;
  }

  .prompt-panel pre {
    white-space: pre-wrap;
    color: #9be8ff;
    font-family: var(--font-code), monospace;
    font-size: 12px;
    line-height: 1.55;
    margin: 12px 0 0;
  }

  .preview-stage {
    min-height: 680px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    overflow: hidden;
    background: rgba(3, 7, 13, 0.68);
  }

  .ui-card {
    padding: 18px;
  }

  .course-map-preview,
  .assessment-preview,
  .project-preview,
  .discussion-preview,
  .reflection-preview {
    padding: 18px;
    display: grid;
    gap: 14px;
  }

  .course-task-grid {
    display: grid;
    gap: 8px;
  }

  .course-task-row {
    min-height: 76px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.04);
    color: #f8fafc;
    cursor: pointer;
    display: grid;
    grid-template-columns: 48px 44px minmax(0, 1fr) 74px;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    text-align: left;
    font: inherit;
  }

  .course-task-row:hover {
    border-color: rgba(14, 245, 194, 0.34);
    background: rgba(14, 245, 194, 0.06);
  }

  .task-index,
  .task-icon {
    color: #7dd3fc;
    font-weight: 950;
  }

  .task-icon {
    width: 36px;
    height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: rgba(125, 211, 252, 0.10);
  }

  .course-task-row strong,
  .course-task-row em {
    display: block;
  }

  .course-task-row strong {
    font-size: 14px;
    color: #f8fafc;
  }

  .course-task-row em,
  .course-task-row small {
    color: #8796aa;
    font-size: 12px;
    font-style: normal;
  }

  .lesson-preview-shell {
    padding: 18px;
  }

  .slideshow-preview {
    min-height: 640px;
    border: 1px solid rgba(125, 211, 252, 0.18);
    border-radius: 8px;
    background:
      radial-gradient(circle at 18% 10%, rgba(14, 245, 194, 0.13), transparent 34%),
      radial-gradient(circle at 82% 0%, rgba(96, 165, 250, 0.16), transparent 34%),
      linear-gradient(145deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.026));
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 24px 70px rgba(0, 0, 0, 0.28);
    padding: 18px;
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr) auto;
    gap: 16px;
  }

  .slideshow-preview-top,
  .slideshow-preview-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }

  .slideshow-preview-top h1 {
    margin: 7px 0 0;
    color: #ffffff;
    font-size: clamp(26px, 4vw, 44px);
    line-height: 1;
    letter-spacing: 0;
  }

  .slideshow-preview-top button,
  .slideshow-preview-bottom button {
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.07);
    color: #e0f7ff;
    font: inherit;
    font-size: 13px;
    font-weight: 950;
    padding: 11px 14px;
    cursor: pointer;
  }

  .slideshow-preview-bottom button:last-child,
  .slideshow-preview-top button {
    border: 0;
    background: linear-gradient(135deg, #7dd3fc, #0ef5c2);
    color: #031018;
  }

  .slideshow-preview-bottom button:disabled {
    cursor: not-allowed;
    color: #6f7f93;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.04);
  }

  .slideshow-preview-bottom div {
    color: #90a4ba;
    font-size: 12px;
    font-weight: 950;
  }

  .slideshow-preview-progress {
    height: 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    overflow: hidden;
  }

  .slideshow-preview-progress span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #7dd3fc, #0ef5c2);
    transition: width 0.22s ease;
  }

	  .slideshow-preview-card {
    align-self: stretch;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 8px;
    background: rgba(5, 10, 18, 0.72);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07);
	    padding: 42px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    overflow: hidden;
  }

	  .slideshow-preview-card h2 {
	    margin: 8px 0 0;
	    color: #ffffff;
	    font-size: 48px;
	    line-height: 1.08;
	    letter-spacing: 0;
	  }

	  .slideshow-big-copy,
	  .slideshow-copy {
	    color: #c8d6e5;
	    font-size: 21px;
    line-height: 1.6;
    font-weight: 760;
    max-width: 840px;
  }

  .slideshow-copy {
    font-size: 16px;
  }

  .slideshow-preview-card code {
    color: #dff9ff;
    font-family: var(--font-code), monospace;
    background: rgba(125, 211, 252, 0.10);
    border: 1px solid rgba(125, 211, 252, 0.16);
    border-radius: 6px;
    padding: 1px 5px;
  }

  .preview-visual {
    margin-top: 18px;
    border: 1px solid rgba(125, 211, 252, 0.16);
    border-radius: 8px;
    background:
      radial-gradient(circle at 16% 16%, rgba(14, 245, 194, 0.13), transparent 34%),
      radial-gradient(circle at 88% 4%, rgba(125, 211, 252, 0.14), transparent 36%),
      rgba(255, 255, 255, 0.045);
    padding: 14px;
  }

  .preview-visual-label {
    color: #7dd3fc;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.11em;
    text-transform: uppercase;
    margin-bottom: 11px;
  }

	  .preview-visual p {
	    color: #b9c9d9;
	    font-size: 13px;
	    line-height: 1.6;
	    font-weight: 760;
	    margin: 11px 0 0;
	  }

	  .preview-diagram {
	    margin-top: 18px;
	    border: 1px solid rgba(125, 211, 252, 0.16);
	    border-radius: 8px;
	    background: linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.026)), rgba(4,10,18,0.78);
	    padding: 14px;
	  }

	  .preview-diagram-header {
	    display: flex;
	    align-items: center;
	    justify-content: space-between;
	    gap: 10px;
	    margin-bottom: 12px;
	  }

	  .preview-diagram-header span,
	  .preview-diagram-tile span {
	    color: #7dd3fc;
	    font-size: 10px;
	    font-weight: 950;
	    letter-spacing: 0.11em;
	    text-transform: uppercase;
	  }

	  .preview-diagram-header strong {
	    min-width: 0;
	    color: #d8f7ff;
	    font-size: 12px;
	    font-weight: 900;
	    text-align: right;
	    overflow-wrap: anywhere;
	  }

	  .preview-diagram-grid {
	    display: grid;
	    grid-template-columns: repeat(3, minmax(0, 1fr));
	    gap: 9px;
	  }

	  .preview-diagram-tile,
	  .preview-diagram-row {
	    min-width: 0;
	    border: 1px solid rgba(255, 255, 255, 0.10);
	    border-radius: 8px;
	    background: rgba(3, 10, 18, 0.60);
	    padding: 12px;
	  }

	  .preview-diagram-tile {
	    min-height: 82px;
	    display: grid;
	    gap: 7px;
	    align-content: start;
	  }

	  .preview-diagram-tile.is-active,
	  .preview-diagram-row.is-active {
	    border-color: rgba(14,245,194,0.26);
	    background: rgba(14,245,194,0.08);
	  }

	  .preview-diagram-tile strong,
	  .preview-diagram-row strong {
	    min-width: 0;
	    color: #edf8ff;
	    font-size: 13px;
	    line-height: 1.35;
	    overflow-wrap: anywhere;
	  }

	  .preview-diagram-tile code,
	  .preview-diagram-row code {
	    color: inherit;
	    background: rgba(125, 211, 252, 0.10);
	    white-space: pre-wrap;
	    overflow-wrap: anywhere;
	  }

	  .preview-diagram-list {
	    display: grid;
	    gap: 8px;
	  }

	  .preview-nested-diagram {
	    display: grid;
	  }

	  .preview-nested-layer {
	    min-width: 0;
	    border: 1px solid rgba(125, 211, 252, 0.18);
	    border-radius: 8px;
	    background: linear-gradient(135deg, rgba(125, 211, 252, 0.08), rgba(14, 245, 194, 0.04));
	    padding: 12px;
	  }

	  .preview-nested-layer .preview-nested-layer {
	    margin-top: 10px;
	    margin-left: 16px;
	    border-color: rgba(14, 245, 194, 0.24);
	    background: linear-gradient(135deg, rgba(14, 245, 194, 0.10), rgba(125, 211, 252, 0.04));
	  }

	  .preview-nested-layer span,
	  .preview-system-flow-card span,
	  .preview-system-flow-card small {
	    color: #7dd3fc;
	    font-size: 10px;
	    font-weight: 950;
	    letter-spacing: 0.10em;
	    text-transform: uppercase;
	  }

	  .preview-nested-layer strong {
	    display: block;
	    min-width: 0;
	    margin-top: 7px;
	    color: #f4fbff;
	    font-size: 15px;
	    line-height: 1.25;
	    overflow-wrap: anywhere;
	  }

	  .preview-system-flow {
	    display: grid;
	    grid-template-columns: repeat(auto-fit, minmax(105px, 1fr));
	    gap: 8px;
	  }

	  .preview-system-flow-card {
	    min-width: 0;
	    display: grid;
	    align-content: start;
	    gap: 7px;
	    min-height: 98px;
	    border: 1px solid rgba(255, 255, 255, 0.10);
	    border-radius: 8px;
	    background: rgba(3, 10, 18, 0.60);
	    padding: 11px;
	  }

	  .preview-system-flow-card.is-final {
	    border-color: rgba(14, 245, 194, 0.26);
	    background: rgba(14, 245, 194, 0.08);
	  }

	  .preview-system-flow-card > span {
	    width: 26px;
	    height: 26px;
	    display: grid;
	    place-items: center;
	    border-radius: 8px;
	    background: rgba(14, 245, 194, 0.12);
	    color: #0ef5c2;
	  }

	  .preview-system-flow-card strong {
	    min-width: 0;
	    color: #edf8ff;
	    font-size: 13px;
	    line-height: 1.3;
	    overflow-wrap: anywhere;
	  }

	  .preview-system-flow-card small {
	    color: #67869c;
	  }

	  .preview-diagram-row {
	    display: grid;
	    grid-template-columns: 28px minmax(0, 1fr);
	    align-items: center;
	    gap: 9px;
	  }

	  .preview-diagram-row > span {
	    width: 28px;
	    height: 28px;
	    border-radius: 8px;
	    display: grid;
	    place-items: center;
	    color: #0ef5c2;
	    background: rgba(14,245,194,0.12);
	    font-size: 12px;
	    font-weight: 950;
	  }

	  .preview-diagram p {
	    margin: 11px 0 0;
	    color: #b9c9d9;
	    font-size: 13px;
	    line-height: 1.6;
	    font-weight: 760;
	  }

  .preview-variable-visual {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 42px minmax(0, 1fr);
    gap: 9px;
    align-items: center;
  }

	  .preview-memory-diagram {
	    display: grid;
	    grid-template-columns: minmax(160px, 1fr) 42px minmax(160px, 1fr);
	    gap: 10px;
	    align-items: center;
	  }

  .preview-code-surface,
  .preview-memory-register,
  .preview-pipeline-diagram div {
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 8px;
    background: rgba(3, 10, 18, 0.60);
    padding: 12px;
    min-width: 0;
  }

  .preview-code-surface span {
    display: block;
    color: #70859d;
    font-size: 10px;
    font-weight: 950;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    margin-bottom: 7px;
  }

	  .preview-code-surface code {
    padding: 0;
    border: 0;
    background: transparent;
    color: #e9f8ff;
	    white-space: pre-wrap;
	    overflow-wrap: anywhere;
	  }

  .preview-memory-diagram > i {
    height: 2px;
    background: linear-gradient(90deg, rgba(125,211,252,0.18), #0ef5c2);
  }

  .preview-memory-register {
    border-color: rgba(14,245,194,0.24);
    background: rgba(14,245,194,0.08);
  }

  .preview-memory-register span {
    display: block;
    color: #7dd3fc;
    font-size: 12px;
    font-family: var(--font-code), monospace;
    margin-bottom: 7px;
  }

  .preview-memory-register strong {
    color: #f8fafc;
    font-size: 20px;
    font-family: var(--font-code), monospace;
  }

  .preview-dom-window {
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 8px;
    background: rgba(3, 10, 18, 0.60);
  }

  .preview-dom-bar {
    height: 28px;
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 0 10px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.035);
  }

  .preview-dom-bar span {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: rgba(125,211,252,0.40);
  }

  .preview-dom-lines {
    display: grid;
    gap: 6px;
    padding: 11px 12px 12px;
  }

  .preview-dom-lines code {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    padding: 0;
    border: 0;
    background: transparent;
    color: #e2f6ff;
    font-family: var(--font-code), monospace;
    white-space: nowrap;
  }

  .preview-dom-lines code.is-nested {
    margin-left: 18px;
    padding-left: 10px;
    border-left: 1px solid rgba(125,211,252,0.20);
  }

  .preview-dom-lines code.is-visible {
    color: #c5fff0;
  }

  .preview-dom-lines em {
    color: #768ca3;
    font-style: normal;
    font-size: 11px;
  }

	  .preview-pipeline-diagram {
	    position: relative;
	    display: grid;
	    grid-template-columns: repeat(var(--flow-count, 3), minmax(0, 1fr));
	    gap: 12px;
	  }

	  .preview-pipeline-diagram::before {
	    display: none;
	  }

	  .preview-pipeline-diagram div {
	    position: relative;
	    min-height: 86px;
	  }

  .preview-pipeline-diagram div.is-output {
    border-color: rgba(14,245,194,0.24);
    background: rgba(14,245,194,0.08);
  }

	  .preview-pipeline-diagram span {
    width: 24px;
    height: 24px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    margin-bottom: 8px;
    color: #061019;
    background: linear-gradient(135deg, #7dd3fc, #0ef5c2);
    font-size: 11px;
    font-weight: 950;
	  }

	  .preview-pipeline-diagram strong,
	  .preview-flow-visual strong {
	    overflow-wrap: anywhere;
	    color: #edf8ff;
	  }

	  .preview-pipeline-diagram strong code,
	  .preview-flow-visual strong code {
	    color: inherit;
	    background: rgba(125, 211, 252, 0.10);
	  }

  .preview-html-visual,
  .preview-code-flow {
    display: grid;
    gap: 9px;
  }

  .preview-html-visual section,
  .preview-code-flow {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .preview-html-visual section,
  .preview-code-flow {
    display: grid;
    gap: 9px;
  }

  .preview-variable-visual div,
  .preview-flow-visual div,
  .preview-html-visual div,
  .preview-code-flow div {
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 8px;
    background: rgba(3, 10, 18, 0.54);
    padding: 12px;
  }

  .preview-variable-visual small,
  .preview-html-visual small,
  .preview-code-flow small {
    display: block;
    color: #7f96ad;
    font-size: 10px;
    font-weight: 950;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .preview-variable-visual b {
    color: #0ef5c2;
    font-size: 22px;
    text-align: center;
  }

  .preview-html-visual > div:first-child {
    border-color: rgba(125, 211, 252, 0.24);
  }

  .preview-html-visual section div:last-child,
  .preview-code-flow div:last-child {
    border-color: rgba(14, 245, 194, 0.24);
    background: rgba(14, 245, 194, 0.08);
  }

  .preview-flow-visual {
    display: grid;
    gap: 8px;
  }

  .preview-flow-visual div {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr);
    gap: 9px;
    align-items: center;
  }

  .preview-flow-visual span {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: grid;
    place-items: center;
    color: #0ef5c2;
    background: rgba(14, 245, 194, 0.12);
    font-size: 12px;
    font-weight: 950;
  }

	  .slideshow-code-preview {
    margin: 18px 0;
    border: 1px solid rgba(125, 211, 252, 0.16);
    border-radius: 8px;
    background: #060b12;
    padding: 12px;
    overflow: auto;
  }

  .slideshow-code-preview span {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 10px;
    border-radius: 7px;
    padding: 7px 9px;
    color: #dce9f5;
    font-size: 14px;
  }

  .slideshow-code-preview span.is-active {
    background: rgba(14, 245, 194, 0.13);
    box-shadow: inset 3px 0 0 #0ef5c2;
  }

  .slideshow-code-preview em {
    color: #5f7288;
    font-style: normal;
    text-align: right;
  }

  .slideshow-code-preview code {
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
  }

  .slideshow-question-preview {
    margin-top: 18px;
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.045);
    color: #f8fafc;
    white-space: pre-wrap;
    padding: 16px;
    font-size: 16px;
    line-height: 1.7;
    font-weight: 800;
  }

  .slideshow-question-stack-preview {
    margin-top: 18px;
    display: grid;
    gap: 10px;
  }

  .slideshow-question-stack-preview .slideshow-question-preview,
  .slideshow-question-stack-preview .slideshow-code-preview {
    margin: 0;
  }

  .slideshow-question-stack-preview .slideshow-question-preview {
    border-color: rgba(125, 211, 252, 0.15);
    background: rgba(125, 211, 252, 0.055);
  }

  .slideshow-options-preview {
    margin-top: 14px;
    display: grid;
    gap: 9px;
  }

  .slideshow-option-preview {
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.045);
    color: #edf7ff;
    padding: 13px 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    text-align: left;
    font: inherit;
    cursor: pointer;
  }

  .slideshow-option-preview span {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #7dd3fc;
    background: rgba(125, 211, 252, 0.10);
    font-size: 12px;
    font-weight: 950;
  }

  .slideshow-option-preview.is-correct {
    border-color: rgba(14, 245, 194, 0.52);
    background: rgba(14, 245, 194, 0.10);
    box-shadow: 0 0 28px rgba(14, 245, 194, 0.12);
  }

  .slideshow-option-preview.is-wrong {
    border-color: rgba(255, 99, 99, 0.52);
    background: rgba(255, 99, 99, 0.10);
  }

  .slideshow-feedback-preview {
    margin-top: 14px;
    border-radius: 8px;
    padding: 13px 14px;
    display: grid;
    gap: 5px;
    font-size: 14px;
    line-height: 1.55;
    font-weight: 750;
  }

  .slideshow-feedback-preview.is-info {
    border: 1px solid rgba(125, 211, 252, 0.22);
    background: rgba(125, 211, 252, 0.08);
    color: #d9f7ff;
  }

  .slideshow-feedback-preview.is-correct {
    border: 1px solid rgba(14, 245, 194, 0.26);
    background: rgba(14, 245, 194, 0.09);
    color: #c5ffe9;
  }

  .slideshow-feedback-preview.is-wrong {
    border: 1px solid rgba(255, 99, 99, 0.30);
    background: rgba(255, 99, 99, 0.10);
    color: #ffd0cc;
  }

  .slideshow-result-preview {
    display: grid;
    justify-items: center;
    text-align: center;
    gap: 12px;
  }

  .result-orb {
    width: 74px;
    height: 74px;
    border-radius: 24px;
    display: grid;
    place-items: center;
    font-size: 34px;
    font-weight: 950;
  }

  .result-orb.mastered {
    color: #0ef5c2;
    border: 1px solid rgba(14, 245, 194, 0.34);
    background: rgba(14, 245, 194, 0.10);
  }

  .result-orb.review {
    color: #fbbf24;
    border: 1px solid rgba(251, 191, 36, 0.34);
    background: rgba(251, 191, 36, 0.10);
  }

  .proof-strip {
    margin-top: 18px;
    padding: 14px;
    border: 1px solid rgba(14, 245, 194, 0.22);
    border-radius: 8px;
    background: rgba(14, 245, 194, 0.07);
  }

  .proof-strip span,
  .step-line span,
  .question-row span {
    color: #7dd3fc;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
  }

  .proof-strip strong {
    display: block;
    color: #f8fafc;
    margin-top: 4px;
  }

  .step-stack,
  .score-bars,
  .checkpoint-grid {
    display: grid;
    gap: 9px;
  }

  .step-line,
  .question-row {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 10px;
    align-items: center;
    padding: 11px 12px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.045);
  }

  .assessment-layout,
  .project-preview .checkpoint-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .score-bars span {
    display: block;
    color: #cbd5e1;
    font-size: 12px;
    font-weight: 900;
    margin-bottom: 6px;
  }

  .score-bars div div {
    height: 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    overflow: hidden;
  }

  .score-bars i {
    display: block;
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, #0ef5c2, #7dd3fc);
  }

  .flashcard-preview {
    padding: 18px;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
  }

  .flash-card {
    min-height: 230px;
  }

  .reflection-preview {
    grid-template-columns: 1.3fr 0.7fr;
  }

  .reflection-preview textarea {
    width: 100%;
    min-height: 220px;
    margin-top: 14px;
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.24);
    color: #e2e8f0;
    font: inherit;
    padding: 14px;
    resize: vertical;
  }

  .reflection-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 14px;
  }

  .reflection-chips span {
    padding: 8px 10px;
    border-radius: 999px;
    background: rgba(125, 211, 252, 0.10);
    color: #c8f4ff;
    font-size: 12px;
    font-weight: 900;
  }

  .chat-card {
    display: grid;
    gap: 10px;
  }

  .chat-bubble {
    max-width: 72%;
    padding: 12px 14px;
    border-radius: 8px;
    color: #e2e8f0;
    background: rgba(255, 255, 255, 0.06);
  }

  .chat-bubble.learner {
    justify-self: end;
    background: rgba(14, 245, 194, 0.11);
  }

  .workspace-shell {
    height: 760px;
    min-height: 760px;
  }

  @media (max-width: 1180px) {
    .ui-devtool {
      grid-template-columns: 240px minmax(0, 1fr);
    }

    .type-rail {
      position: static;
      height: auto;
      grid-column: 1 / -1;
      border-left: 0;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .type-list {
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    }
  }

  @media (max-width: 840px) {
    .ui-devtool {
      display: block;
    }

    .domain-rail,
    .type-rail {
      position: static;
      height: auto;
    }

    .prompt-panel,
    .assessment-layout,
    .reflection-preview,
    .project-preview .checkpoint-grid,
    .flashcard-preview {
      grid-template-columns: 1fr;
    }

    .main-lab {
      padding: 14px;
    }
  }
`
