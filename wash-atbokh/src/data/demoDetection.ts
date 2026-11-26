/**
 * DEMO ONLY. There is no image-recognition service in this prototype.
 * The photo never leaves the browser; we pick one of these believable
 * fridge/counter scenes based on the file's size so results feel varied
 * but are clearly labelled as a simulation in the UI.
 */
export const DEMO_SCENES: string[][] = [
  ['chicken', 'onion', 'tomato', 'garlic', 'rice', 'carrot', 'lemon'],
  ['eggs', 'tomato', 'onion', 'bell_pepper', 'milk', 'cheese', 'bread'],
  ['lentils', 'onion', 'carrot', 'potato', 'lemon', 'yogurt'],
  ['meat', 'zucchini', 'potato', 'tomato', 'onion', 'flour', 'loomi'],
  ['banana', 'bread', 'honey', 'dates', 'milk', 'cream', 'eggs'],
]

export function demoDetect(file: File): string[] {
  const idx = Math.abs(Math.floor(file.size / 997) + file.name.length) % DEMO_SCENES.length
  return DEMO_SCENES[idx]
}

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
export const MAX_BYTES = 10 * 1024 * 1024
