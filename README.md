# Adaptive Layout Engine

A constraint-based layout engine that takes one advertisement specification and adapts it across different surfaces and screen sizes.

The main idea is simple:

> Define the advertisement once. Let the layout engine figure out how it should fit on each surface.

Instead of creating a separate layout for mobile, broadcast, kiosk, etc., the project uses a shared `AdSpec`, surface constraints, and a resolution algorithm to produce a `ResolvedLayout`.

---

## What this project does

An advertisement contains different elements such as:

- Headline
- Product name
- Product image
- Call-to-action button
- Logo
- Price

Each element has information about its:

- Type (`text`, `image`, `button`)
- Role (`primary`, `hero`, `action`, `branding`, `secondary`)
- Priority (`1` = protected, `3` = degrades first)
- Content

The same advertisement is then passed to the layout engine together with the constraints of the target surface.

For example, the same ad can be resolved for:

- Mobile portrait (320×480)
- Mobile landscape (480×320)
- Broadcast lower third (1920×250)
- Square retail kiosk (1080×1080)
- A deliberately small constraint-test surface (180×140)

The engine determines where the elements should go, how much space they can use, and which elements need to be hidden when the available space becomes too small.

---

## Core idea

The project follows this pipeline:

```text
AdSpec
   +
Surface Profile
   ↓
Constraint Resolver
   ↓
Resolved Layout
   ↓
DOM Renderer
   ↓
React UI
```

- **`AdSpec`** (`src/spec.ts`) — the content: a list of elements, each with a type, role, priority, and content string. Validated at runtime by `validateAdSpec`.
- **`SurfaceProfile`** (`src/surfaces.ts`) — the constraints of the target screen: width, height, safe area, minimum tap target, minimum text size, viewing distance.
- **`resolveLayout`** (`src/resolver.ts`) — the algorithm. Takes an `AdSpec`'s elements and a `SurfaceProfile` and produces a `ResolvedLayout`.
- **`ResolvedLayout`** (`src/resolved-layout.ts`) — the output: a box (`x`, `y`, `width`, `height`) and a `visible` flag per element.
- **React UI** (`src/App.tsx`) — renders the resolved boxes as absolutely positioned DOM elements and lets you switch between surfaces live.

---

## Setup

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (typically `http://localhost:5173`).

Other available scripts:

```bash
npm run build     # tsc -b && vite build — type-checks then builds to dist/
npm run preview   # serve the production build locally
npm run lint       # oxlint
```

There is no `npm test` script wired up yet. The resolver's validation suite lives in `src/resolver.test.ts` as a set of plain assertion functions (no test framework dependency) and can be run directly with a TypeScript runner, e.g.:

```bash
npx tsx src/resolver.test.ts
```

It prints `PASS: <case>` for each of its 18 checks and ends with `All resolver validation checks passed.` if nothing regressed.

---

## Demo: how to use it

1. Run `npm run dev` and open the app. It loads with the **Mobile Portrait** surface selected and the sample ad from `src/spec.ts` (headline, product name, product image, CTA, logo, price) already resolved.
2. Use the **surface picker** at the top to switch between the five surfaces. The same `AdSpec` object is re-resolved from scratch each time — nothing about the layout is hand-authored per surface.
3. To see the degradation logic actually drop elements, select **Constraint Test** (180×140 — the smallest surface). At this size the resolver cannot fit all six elements, so it removes the lowest-priority ones until what remains fits. With the current sample ad, `headline`, `product-name`, and `product-image` stay visible; `cta`, `logo`, and `price` are dropped.
4. The right-hand info panel shows the live resolution count (`N / 6 elements visible`), the surface's raw constraints (dimensions, min text size, tap target, viewing distance), and a per-element list marking each as `VISIBLE` or `HIDDEN` with its resolved box size.

---

## How the resolver works

`resolveLayout(elements, surface)` in `src/resolver.ts` runs this loop:

1. **`getUsableArea(surface)`** — subtracts the surface's `safeArea` insets from its raw width/height to get the actual drawable region.
2. **`getLayoutDirection(surface)`** — picks a composition strategy from the surface's aspect ratio: `vertical` (aspect ratio < 0.85), `horizontal` (> 1.25), or `balanced` (in between). This is a geometry-driven heuristic, not a per-surface special case — no surface name is ever checked directly.
3. **`resolveVisibleElements(remaining, area, direction, surface)`** — for the current candidate set of elements, computes sizes and positions. Internally this dispatches to direction-specific composition logic (`resolveVertical`, `resolveHorizontal`, `resolveBalanced`, or `resolveAdaptiveLandscape` when the surface opts into it), which in turn uses `createSizedElements` and `fitMainAxis` to size each element between its **preferred fraction** (`getPreferredFraction`) and **minimum fraction** (`getMinimumFraction`) of the available area, per role.
4. **`isFeasible(resolved, remaining, area, surface)`** — checks the candidate layout against every hard constraint: all elements resolved (`resolved.length === remaining.length`), no invalid (zero/negative) dimensions, everything fits inside the usable area, no element overlaps another, physical constraints are met (minimum text size and minimum tap target from the surface profile), and CTA buttons are wide enough for their own text.
5. If feasible, the loop returns the resolved boxes for the visible elements plus zero-size, `visible: false` entries (`createHiddenElements`) for anything already excluded from `remaining`.
6. If **not** feasible, **`removeLowestPriority(remaining)`** drops one element — the lowest-priority one, with ties broken by picking the *last* matching element in array order — and the loop retries from step 3 with the smaller set.
7. If the loop empties out entirely without finding a feasible layout, there's a final fallback: try to fit just the single highest-priority element alone. If even that fails, every element is returned as hidden.

This is a **priority-ordered greedy pass with shrink-then-drop degradation** — not a lookup table and not surface-specific `if` branches. The same function runs for all five surfaces (and would run unchanged for a sixth); only the `SurfaceProfile` data going in changes.

---

## Priority / degradation logic

Every element has a `priority` of `1`, `2`, or `3`. Priority `1` means "protect this as long as possible"; priority `3` means "this is allowed to go first."

Within a single resolution attempt, elements aren't just kept-or-dropped — the resolver first tries to **shrink** them. `getPreferredFraction` gives each role's ideal share of the layout area; `getMinimumFraction` gives the smallest share it's allowed to shrink to before it's considered unusable. `fitMainAxis` walks elements down from preferred toward minimum along the main axis until the composition fits, or determines it can't and reports infeasible. Only when shrinking every remaining element to its minimum still doesn't produce a feasible, non-overlapping layout does the resolver **drop** an element via `removeLowestPriority` and retry.

**Concrete example — the sample ad on the `constraintTest` surface (180×140, an 8px safe-area inset on all sides, so a ~164×124 usable area):**

At full size, six elements (headline, product-name, product-image, cta, logo, price) cannot be shrunk enough to fit and stay non-overlapping. The resolver removes the lowest-priority element each pass:

- `logo` is priority `3` — the lowest — so it's the first candidate for removal.
- Among the remaining priority-`2` elements (`product-name`, `cta`, `price`), ties are broken by array order (the *last* tied element found is removed first), which in practice drops `cta` and then `price`.
- `headline` and `product-image`, both priority `1`, are protected until nothing lower-priority is left to remove.

The result: `headline`, `product-name`, and `product-image` remain visible; `cta`, `logo`, and `price` are hidden. This is the resolver's degradation order working exactly as intended — lose branding and secondary content before losing the headline or the hero image.

---

## TypeScript design

`src/spec.ts` defines `AdElement` and `AdSpec` as plain interfaces, but interfaces alone don't protect against malformed data coming from outside the type system (e.g. a spec loaded from JSON or user input). `validateAdSpec` is a TypeScript **assertion function** (`asserts spec is AdSpec`) that runtime-checks:

- `elements` is a non-empty array
- every element has a non-empty, unique `id`
- `type` is one of `"text" | "image" | "button"`
- `role` is one of `"primary" | "hero" | "action" | "branding" | "secondary"`
- `priority` is `1 | 2 | 3`
- `content` is a non-empty string
- **role/type consistency**: `action` elements must be `button`s, `hero` and `branding` elements must be `image`s — these combinations are semantically invalid even though nothing in the interface shape alone would forbid them (e.g. a `hero` element typed as `text`)

Because it's an assertion function, calling `validateAdSpec(adSpec)` at module load time (see the bottom of `src/spec.ts`) narrows `adSpec`'s type for every consumer afterward — the rest of the codebase can treat `AdSpec` as trustworthy without re-checking it.

---

## Known limitations

- **No real text measurement.** The resolver reasons about text elements using fixed minimum-height heuristics (`getMinimumTextHeight`) and preferred/minimum *fractions* of the layout area, not actual glyph metrics for the given content string. Two headlines of very different lengths get sized identically for a given role/surface.
- **`minTextSize` and `minTapTarget` are resolved but not applied by the renderer.** `ResolvedElement` carries these fields through from the surface profile, and `isFeasible`/`satisfiesPhysicalConstraints` use them to reject infeasible layouts — but `App.tsx` currently renders text with CSS `clamp(vw)` sizing rather than reading `minTextSize` off the resolved element. The constraint is enforced during resolution; it isn't yet the actual source of truth for on-screen font size.
- **Hand-tuned fraction constants.** `getPreferredFraction` and `getMinimumFraction` are per-role, per-direction magic numbers (e.g. hero = 78% width / 30% height in vertical layouts) arrived at by manual tuning against the five demo surfaces, not derived from a general sizing model.
- **Rendering and resolution are not yet structurally separated.** `resolveLayout` returns a renderer-agnostic `ResolvedLayout`, but today only one renderer exists — the DOM/JSX rendering logic (`renderElement` and the box-positioning math) currently lives inline in `src/App.tsx` rather than in its own module. A Canvas or other renderer could consume the same `ResolvedLayout` contract in principle, but that isn't demonstrated by a second renderer yet.
- **No persistence or spec editing UI.** The `AdSpec` is a hardcoded fixture in `src/spec.ts`; there's no UI to author or import a different ad.
- **`npm test` isn't wired up.** `src/resolver.test.ts` is a real, working self-contained assertion suite (18 passing checks), but it has to be run manually via `npx tsx src/resolver.test.ts` rather than `npm test`.

---

## AI tool disclosure

ChatGPT was used to understand the overall project scope and for planning, and mainly for drafting this README and the accompanying `ARCHITECTURE.md`. Claude was used afterward to re-verify and correct that documentation against the actual source code.

---

## Time spent

_[Fill in honestly — e.g. "~X hours across planning, resolver implementation, and UI."]_