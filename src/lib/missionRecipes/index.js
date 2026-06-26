import skillBuild from './skillBuild'
import knowledgeMastery from './knowledgeMastery'
import examPrep from './examPrep'
import language from './language'
import procedural from './procedural'
import conceptual from './conceptual'
import performance from './performance'
import habit from './habit'
import { substituteComponentType } from './_substitutions'

const RECIPES = Object.freeze({
  skill_build: skillBuild,
  knowledge_mastery: knowledgeMastery,
  exam_prep: examPrep,
  language,
  procedural,
  conceptual,
  performance,
  habit,
})

function normalizeRecipe(recipe) {
  const componentMix = Object.entries(recipe.componentMix || {}).reduce((mix, [type, weight]) => {
    const substituted = substituteComponentType(type)
    const numeric = Number(weight) || 0
    if (numeric <= 0) return mix
    mix[substituted] = (mix[substituted] || 0) + numeric
    return mix
  }, {})

  return {
    ...recipe,
    componentMix,
  }
}

export function getMissionRecipe(mode = 'knowledge_mastery') {
  return normalizeRecipe(RECIPES[mode] || RECIPES.knowledge_mastery)
}

export function listMissionRecipeModes() {
  return Object.keys(RECIPES)
}

export { RECIPES as missionRecipes }
