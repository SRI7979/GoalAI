import conceptExplainer from './concept_explainer'
import multipleChoiceQuiz from './multiple_choice_quiz'
import flashcardDrill from './flashcard_drill'
import workedExample from './worked_example'
import freeResponse from './free_response'
import codePredictor from './code_predictor'
import dynamicDiagram from './dynamic_diagram'
import codeSandbox from './code_sandbox'
import codeDebugger from './code_debugger'
import audioListen from './audio_listen'
import audioSpeak from './audio_speak'
import imageIdentify from './image_identify'
import dragMatch from './drag_match'
import orderSteps from './order_steps'
import timedProblemSet from './timed_problem_set'
import roleplayScenario from './roleplay_scenario'
import caseStudyAnalyze from './case_study_analyze'
import reflectionPrompt from './reflection_prompt'
import doInRealWorld from './do_in_real_world'
import mockExam from './mock_exam'
import conceptMapBuild from './concept_map_build'

export const COMPONENT_REGISTRY = Object.freeze({
  [conceptExplainer.type]: conceptExplainer,
  [multipleChoiceQuiz.type]: multipleChoiceQuiz,
  [flashcardDrill.type]: flashcardDrill,
  [workedExample.type]: workedExample,
  [freeResponse.type]: freeResponse,
  [codePredictor.type]: codePredictor,
  [dynamicDiagram.type]: dynamicDiagram,
  [codeSandbox.type]: codeSandbox,
  [codeDebugger.type]: codeDebugger,
  [audioListen.type]: audioListen,
  [audioSpeak.type]: audioSpeak,
  [imageIdentify.type]: imageIdentify,
  [dragMatch.type]: dragMatch,
  [orderSteps.type]: orderSteps,
  [timedProblemSet.type]: timedProblemSet,
  [roleplayScenario.type]: roleplayScenario,
  [caseStudyAnalyze.type]: caseStudyAnalyze,
  [reflectionPrompt.type]: reflectionPrompt,
  [doInRealWorld.type]: doInRealWorld,
  [mockExam.type]: mockExam,
  [conceptMapBuild.type]: conceptMapBuild,
})

export {
  conceptExplainer,
  multipleChoiceQuiz,
  flashcardDrill,
  workedExample,
  freeResponse,
  codePredictor,
  dynamicDiagram,
  codeSandbox,
  codeDebugger,
  audioListen,
  audioSpeak,
  imageIdentify,
  dragMatch,
  orderSteps,
  timedProblemSet,
  roleplayScenario,
  caseStudyAnalyze,
  reflectionPrompt,
  doInRealWorld,
  mockExam,
  conceptMapBuild,
}
