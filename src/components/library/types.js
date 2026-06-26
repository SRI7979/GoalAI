// JSDoc-only contracts for the Prompt 4/6 component library.
// The codebase is JavaScript; these typedefs mirror AGENTS.md Section 5.

/**
 * @typedef {'concept_explainer' | 'worked_example' | 'multiple_choice_quiz' | 'free_response' | 'flashcard_drill' | 'code_predictor' | 'dynamic_diagram'} CoreComponentType
 */

/**
 * @typedef {'code_sandbox' | 'code_debugger' | 'audio_listen' | 'audio_speak' | 'image_identify' | 'drag_match' | 'order_steps' | 'timed_problem_set' | 'roleplay_scenario' | 'case_study_analyze' | 'reflection_prompt' | 'do_in_real_world' | 'mock_exam' | 'concept_map_build'} ExpansionComponentType
 */

/**
 * @typedef {CoreComponentType | ExpansionComponentType} ComponentType
 */

/**
 * @typedef {string} ConceptId
 */

/**
 * @typedef {object} ComponentSignal
 * @property {ComponentType} componentType
 * @property {ConceptId[]} conceptIds
 * @property {boolean | null} correct
 * @property {number} confidence
 * @property {number} hesitationMs
 * @property {number} totalMs
 * @property {number} hintsUsed
 * @property {number} attempts
 * @property {any=} rawResponse
 */

/**
 * @typedef {object} ComponentInstance
 * @property {ComponentType} componentType
 * @property {Record<string, any>} params
 * @property {number} position
 * @property {ComponentSignal=} signal
 */

/**
 * @typedef {object} RegisteredComponent
 * @property {ComponentType} type
 * @property {object} paramsSchema
 * @property {object} signalSchema
 * @property {string} generatorPrompt
 * @property {import('react').ComponentType<any>} render
 */

export const COMPONENT_LIBRARY_TYPES_VERSION = 'p6_v1'
