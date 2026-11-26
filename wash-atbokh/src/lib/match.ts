import { BASIC_IDS, INGREDIENTS, INGREDIENT_MAP } from '../data/ingredients'
import { RECIPES, totalMinutes, type Recipe, type RecipeIngredient, type Substitute } from '../data/recipes'

export interface Prefs {
  servings: number
  /** null = no limit */
  maxMinutes: number | null
  quick: boolean
  light: boolean
  kids: boolean
  guests: boolean
  basics: boolean
}

export const DEFAULT_PREFS: Prefs = {
  servings: 4,
  maxMinutes: null,
  quick: false,
  light: false,
  kids: false,
  guests: false,
  basics: true,
}

export interface PantryItem {
  /** Catalog id, or `custom:<text>` for something we don't know. */
  id: string
  label?: string
  useSoon: boolean
}

export interface IngredientStatus {
  item: RecipeIngredient
  have: boolean
  /** A substitute the user actually has. */
  usableSub?: Substitute
}

export interface Match {
  recipe: Recipe
  score: number
  have: IngredientStatus[]
  missing: IngredientStatus[]
  /** Counted ingredients (non-basic, non-optional) */
  keyTotal: number
  keyHave: number
  usesSoon: string[]
}

const WEIGHT = { core: 3, support: 1.5, optional: 0.4, basic: 0 } as const

export function quickRecipe(r: Recipe) {
  return r.tags.includes('quick') || totalMinutes(r) <= 35
}

export function evaluate(recipe: Recipe, pantry: Set<string>, prefs: Prefs): Omit<Match, 'score' | 'usesSoon'> {
  const have: IngredientStatus[] = []
  const missing: IngredientStatus[] = []
  for (const item of recipe.ingredients) {
    const isBasic = item.role === 'basic' || (BASIC_IDS as readonly string[]).includes(item.id)
    const owned = pantry.has(item.id) || (isBasic && prefs.basics)
    if (owned) {
      have.push({ item, have: true })
    } else {
      const usableSub = item.subs?.find((s) => s.id && pantry.has(s.id))
      missing.push({ item, have: false, usableSub })
    }
  }
  const key = recipe.ingredients.filter((i) => i.role === 'core' || i.role === 'support')
  const keyHave = key.filter((i) => pantry.has(i.id)).length
  return { recipe, have, missing, keyTotal: key.length, keyHave }
}

/**
 * Ranks recipes by how much of the user's kitchen they use.
 * Core ingredients weigh most; a substitute the user owns counts for half.
 * "Use soon" ingredients and matching preferences lift a dish up the list.
 */
export function recommend(pantryItems: PantryItem[], prefs: Prefs) {
  const pantry = new Set(pantryItems.map((p) => p.id))
  const soon = new Set(pantryItems.filter((p) => p.useSoon).map((p) => p.id))
  const known = pantryItems.filter((p) => INGREDIENT_MAP[p.id]).length

  const all: Match[] = []
  for (const recipe of RECIPES) {
    const ev = evaluate(recipe, pantry, prefs)
    let total = 0
    let got = 0
    let coreHave = 0
    let coreMissingNoSub = 0
    for (const item of recipe.ingredients) {
      const w = WEIGHT[item.role]
      total += w
      if (pantry.has(item.id)) {
        got += w
        if (item.role === 'core') coreHave++
      } else if (item.subs?.some((s) => s.id && pantry.has(s.id))) {
        got += w * 0.5
      } else if (item.role === 'core') {
        coreMissingNoSub++
      }
    }
    const coverage = total ? got / total : 0
    // A dish must use at least one of its core ingredients, or a good share of the rest.
    if (coreHave === 0 && coverage < 0.4) continue

    const usesSoon = recipe.ingredients.filter((i) => soon.has(i.id)).map((i) => i.id)
    let score = coverage
    score -= coreMissingNoSub * 0.12
    score += usesSoon.length * 0.18
    if (prefs.quick && quickRecipe(recipe)) score += 0.2
    if (prefs.light && recipe.tags.includes('light')) score += 0.15
    if (prefs.kids && recipe.tags.includes('kids')) score += 0.15
    if (prefs.guests && recipe.tags.includes('guests')) score += 0.15
    all.push({ ...ev, score, usesSoon })
  }
  all.sort((a, b) => b.score - a.score)

  const withinTime = prefs.maxMinutes ? all.filter((m) => totalMinutes(m.recipe) <= prefs.maxMinutes!) : all
  const hiddenByTime = all.length - withinTime.length
  return {
    matches: withinTime.slice(0, 5),
    hiddenByTime,
    /** Ignoring the time limit, for the "show anyway" action. */
    broadened: all.slice(0, 5),
    knownCount: known,
  }
}

/** Ingredients that would unlock the most recipes, to suggest in empty states. */
export function suggestAdditions(pantryItems: PantryItem[], limit = 4): string[] {
  const pantry = new Set(pantryItems.map((p) => p.id))
  const counts = new Map<string, number>()
  for (const r of RECIPES) {
    for (const i of r.ingredients) {
      if (i.role === 'core' && !pantry.has(i.id)) counts.set(i.id, (counts.get(i.id) ?? 0) + 1)
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id]) => id)
}

// ---------------------------------------------------------------------------
// Text matching for the ingredient input

/** Normalises Arabic letter variants and diacritics so "طماطه" finds "طماطم". */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '') // harakat + tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/^ال(?=\S{2,})/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const SEARCH_INDEX = INGREDIENTS.filter((i) => !['water'].includes(i.id)).map((i) => ({
  id: i.id,
  terms: [i.name.ar, i.name.en, ...(i.aliases ?? [])].map(normalize),
}))

export function searchIngredients(query: string, exclude: Set<string>, limit = 6): string[] {
  const q = normalize(query)
  if (!q) return []
  const scored: [string, number][] = []
  for (const entry of SEARCH_INDEX) {
    if (exclude.has(entry.id)) continue
    let best = Infinity
    for (const t of entry.terms) {
      if (t === q) best = Math.min(best, 0)
      else if (t.startsWith(q)) best = Math.min(best, 1)
      else if (t.split(' ').some((w) => w.startsWith(q))) best = Math.min(best, 2)
      else if (q.length >= 3 && t.includes(q)) best = Math.min(best, 3)
    }
    if (best < Infinity) scored.push([entry.id, best])
  }
  return scored.sort((a, b) => a[1] - b[1]).slice(0, limit).map(([id]) => id)
}

/** Exact match on a name or alias, used when the user presses Enter. */
export function resolveIngredient(query: string): string | undefined {
  const q = normalize(query)
  if (!q) return undefined
  const exact = SEARCH_INDEX.find((e) => e.terms.includes(q))?.id
  if (exact) return exact
  return q.length >= 3 ? searchIngredients(query, new Set(), 1)[0] : undefined
}
