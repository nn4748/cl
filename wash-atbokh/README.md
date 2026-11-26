# وش أطبخ؟ · What Should I Cook?

A bilingual (Arabic-first, RTL / English LTR) website prototype that turns what's in your kitchen into Saudi and Gulf dishes, then walks you through cooking them with an independent timer for every step.

## Run

```bash
cd wash-atbokh
npm install
npm run dev      # http://localhost:5180
npm run build    # type-check + production build in dist/
```

## Journey

Home → **My kitchen** (type ingredients with autocomplete, or pick a photo — demo) → optional preferences → **Ideas** (3–5 ranked dishes with have / missing / swaps) → **Recipe** (scaled quantities) → **Cooking mode** (one step at a time, per-step timers).

## Structure

| Path | What |
|---|---|
| `src/data/ingredients.ts` | Ingredient catalog (AR/EN names + spellings people type) |
| `src/data/recipes.ts` | 10 curated bilingual recipes, roles, substitutes, step durations |
| `src/data/units.ts` | Unit names (Arabic singular/dual/plural), fractions, scaling |
| `src/lib/match.ts` | Recommendation scoring and Arabic-aware ingredient search |
| `src/state/store.tsx` | App state (session storage), timers keyed per recipe step |
| `src/state/clock.tsx` | Drift-free timer clock (end timestamps), completion sound |
| `src/art/DishArt.tsx` | Inline SVG illustration for each dish |
| `src/screens/*` | Home, Pantry, Results, RecipeDetail, Cook |
| `src/i18n/strings.ts` | All interface copy in both languages |

## Simulated / not included

- **Photo detection is a demo.** No image-recognition service is connected; the UI says so. The photo stays in the browser (object URL only) and is never uploaded or stored.
- No accounts, payments, delivery, analytics or backend. State lives in `sessionStorage` for the current tab session.
- "Lighter" is a general style tag, not a nutritional claim.
