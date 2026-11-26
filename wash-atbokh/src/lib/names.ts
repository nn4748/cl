import { INGREDIENT_MAP } from '../data/ingredients'
import type { Lang } from '../i18n/types'

export function ingName(id: string, lang: Lang, label?: string): string {
  const ing = INGREDIENT_MAP[id]
  if (ing) return ing.name[lang]
  return label ?? id.replace(/^custom:/, '')
}

/** "رز، دجاج و طماطم" / "rice, chicken and tomatoes" */
export function listNames(names: string[], lang: Lang): string {
  try {
    return new Intl.ListFormat(lang === 'ar' ? 'ar' : 'en', { style: 'long', type: 'conjunction' }).format(names)
  } catch {
    return names.join(lang === 'ar' ? '، ' : ', ')
  }
}
