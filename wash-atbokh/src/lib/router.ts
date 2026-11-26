import { useEffect, useState } from 'react'

export type Route =
  | { name: 'home' }
  | { name: 'pantry'; tab: 'type' | 'photo' }
  | { name: 'results' }
  | { name: 'recipes' }
  | { name: 'recipe'; id: string }
  | { name: 'cook'; id: string }

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  switch (parts[0]) {
    case 'pantry':
      return { name: 'pantry', tab: parts[1] === 'photo' ? 'photo' : 'type' }
    case 'results':
      return { name: 'results' }
    case 'recipes':
      return { name: 'recipes' }
    case 'recipe':
      return parts[1] ? { name: 'recipe', id: decodeURIComponent(parts[1]) } : { name: 'home' }
    case 'cook':
      return parts[1] ? { name: 'cook', id: decodeURIComponent(parts[1]) } : { name: 'home' }
    default:
      return { name: 'home' }
  }
}

export const href = {
  home: '#/',
  pantry: (tab: 'type' | 'photo' = 'type') => (tab === 'photo' ? '#/pantry/photo' : '#/pantry'),
  results: '#/results',
  recipes: '#/recipes',
  recipe: (id: string) => `#/recipe/${encodeURIComponent(id)}`,
  cook: (id: string) => `#/cook/${encodeURIComponent(id)}`,
}

export function go(to: string) {
  if (location.hash === to) return
  location.hash = to
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parseHash(location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
