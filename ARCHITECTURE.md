# Architecture — Adaptive Layout Engine

## 1. Overview

The Adaptive Layout Engine is a constraint-based layout system that takes one advertisement specification and adapts it across different surfaces and screen sizes.

The core architectural principle is:

> Define the advertisement once, describe the target surface through constraints, and let the resolver calculate the layout.

The system follows a clear separation of responsibilities:

```text
Advertisement Specification
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

No layer above the Constraint Resolver knows anything about layout math, and no layer below it knows anything about which surface it's rendering for. The resolver is the only place surface-aware sizing decisions get made.

---

## 2. Module responsibilities

| File | Responsibility |
|---|---|
| `src/spec.ts` | Defines `AdElement` / `AdSpec` types, runtime validation (`validateAdSpec`) including role/type consistency rules, and the sample `adSpec` fixture. |
| `src/surfaces.ts` | Defines `SurfaceProfile` (dimensions, safe area, min tap target, min text size, viewing distance, touch-only flag, adaptive-landscape opt-in) and the five demo surfaces. |
| `src/resolver.ts` | The constraint resolution algorithm. Pure functions in, `ResolvedLayout` out. The only module that knows how to turn an `AdSpec` + `SurfaceProfile` into geometry — including deriving the *effective* minimum tap target (`getEffectiveMinTapTarget`) from `minTapTarget` and `touchOnly`. |
| `src/resolved-layout.ts` | Defines `LayoutBox`, `ResolvedElement`, `ResolvedLayout` — the output contract every renderer consumes. |
| `src/render-dom.tsx` | Pure DOM renderer. `renderAdToDom(spec, layout, surface)` converts a `ResolvedLayout` into positioned JSX, reading `minTextSize`/`minTapTarget` off each `ResolvedElement` and applying them as inline styles. No React state or hooks live here. |
| `src/App.tsx` | React UI: surface picker, live preview, info panels. Calls `resolveLayout` and `renderAdToDom` and owns application state/UI chrome only — it contains no layout math or DOM-construction logic of its own. |
| `src/resolver.test.ts` | Self-contained assertion-based validation suite for the resolver (19 checks), runnable via `npx tsx src/resolver.test.ts`. |

---

## 3. Data flow through the resolver

`resolveLayout(elements: AdElement[], surface: SurfaceProfile): ResolvedLayout` is the single entry point (`src/resolver.ts`). Everything else in that file is a private helper it composes:

1. `getUsableArea(surface)` — surface dimensions minus safe-area insets.
2. `getLayoutDirection(surface)` — aspect-ratio thresholds decide `vertical` / `horizontal` / `balanced` composition. This is the only branch point derived from surface *shape*; it is not a per-named-surface switch.
3. A retry loop starting with the full element list:
   - `resolveVisibleElements(remaining, area, direction, surface)` sizes and positions the current candidate set (dispatching internally to `resolveVertical` / `resolveHorizontal` / `resolveBalanced` / `resolveAdaptiveLandscape`, backed by `createSizedElements` and `fitMainAxis`, which shrink each element between its preferred and minimum fraction of the area per role).
   - `isFeasible(...)` validates the candidate layout: correct count, valid dimensions, fits within the usable area, no overlaps, satisfies physical constraints (min text size, effective min tap target — see §4), satisfies CTA text-width constraints.
   - If feasible → return the resolved boxes for visible elements plus `createHiddenElements(...)` for anything already excluded.
   - If not feasible → `removeLowestPriority(remaining)` drops one element (lowest priority, ties broken by array order) and the loop retries with the smaller set.
4. If the retry loop exhausts without a feasible result, a final fallback attempts to place just the single highest-priority element alone; if that also fails, every element is returned hidden.

The result is a `ResolvedLayout`: a flat list of `{ id, box: { x, y, width, height }, visible, minTextSize?, minTapTarget? }`. It carries no React, DOM, or Canvas concepts — it's plain geometry and booleans.

**Effective tap target.** Two constraint fields interact rather than being read independently: `getEffectiveMinTapTarget(surface)` returns `surface.minTapTarget` if set, otherwise a default of `44` if `surface.touchOnly` is `true`, otherwise `undefined`. Every place that previously read `surface.minTapTarget` directly (`getMinimumTapHeight`, `getMinimumPhysicalSize`, and the `minTapTarget` field written onto each `ResolvedElement`) now goes through this helper, so a touch-only surface with no explicit tap target still gets real minimum sizing on buttons — both during resolution (feasibility checks) and in what's handed to the renderer.

---

## 4. Adding a new surface

Adding a new target surface requires **zero changes to `resolver.ts`**. The resolver only ever reads generic `SurfaceProfile` fields (`width`, `height`, `safeArea`, `minTapTarget`, `minTextSize`, `touchOnly`, `viewingDistance`, `allowAdaptiveLandscapeComposition`) and derives its layout direction from aspect ratio — it never branches on a surface's name or identity.

To add one:

1. Add a new entry to the `surfaces` record in `src/surfaces.ts` with the appropriate `SurfaceProfile` fields.
2. Add a matching label (and picker icon, if desired) in `src/App.tsx`'s `surfaceLabels`.

That's it. `src/resolver.test.ts` already includes checks that construct surfaces not present in the demo set purely to confirm the resolver's output stays valid for surfaces it has never seen:

- `validateUnknownFifthSurface` — a fifth surface with no name in the demo set, proving this is a general algorithm, not a lookup table keyed on the five demo surface names.
- `validateTouchOnlySurface` — surfaces that vary only `touchOnly`/`minTapTarget` combinations, proving the effective-tap-target fallback described in §3 is driven by data, not a `retailKiosk`-specific code path.

---

## 5. Adding a new renderer

Every renderer is meant to consume the same `ResolvedLayout` produced by `resolveLayout()` — the resolver has no knowledge of, or dependency on, React, the DOM, or any specific rendering target. A new renderer (e.g. a Canvas or SVG renderer) would:

1. Call `resolveLayout(adSpec.elements, surface)` exactly as `App.tsx` does today.
2. Walk `resolvedLayout.elements`, and for each visible element, use `element.box` (`x`, `y`, `width`, `height`) to draw or position content, and `element.minTextSize` / `element.minTapTarget` where the target medium needs them.
3. Never call into `resolver.ts` internals directly — the public contract is `resolveLayout` in, `ResolvedLayout` out.

**Current state:** this is no longer just a claim about the resolver's purity — it's demonstrated by `src/render-dom.tsx`, a standalone module with exactly this shape: `renderAdToDom(spec: AdSpec, layout: ResolvedLayout, surface: SurfaceProfile): ReactElement[]`. It has no React state or hooks, does not call into `resolver.ts`, and consumes only the public `ResolvedLayout` contract — reading `minTextSize` to set inline `fontSize` and `minTapTarget` to set inline `minWidth`/`minHeight` on buttons. `App.tsx` calls it exactly as described above and owns nothing about rendering beyond that call.

A Canvas or SVG renderer would follow the same shape: a pure function of `(spec, layout, surface)` with no dependency on `resolver.ts`'s internals or on `render-dom.tsx` itself — a real second renderer, proving the fan-out, hasn't been built yet.

---

## 6. Design constraints this architecture enforces

- **No surface-specific code paths.** All surface behavior is data (`SurfaceProfile`), not code. Layout direction is derived, not declared per surface. This extends to constraint *interactions* — e.g. the effective tap target combines `minTapTarget` and `touchOnly` generically (§3), rather than special-casing any specific surface that happens to set `touchOnly`.
- **Degradation is content-aware, not layout-aware.** Priority lives on `AdElement`, not on any surface or layout config — the same element degrades in the same order regardless of which surface is shrinking it.
- **Validation happens at the boundary.** `validateAdSpec` runs once, at spec-definition time, so nothing downstream needs to re-validate element shape.
- **The resolver is pure.** `resolveLayout` and its helpers take plain data in and return plain data out — no DOM access, no React, no side effects — which is what makes multiple renderers against the same output a realistic extension rather than a rewrite.
- **Rendering has no layout authority.** `render-dom.tsx` positions and styles elements strictly from `ResolvedElement` fields (`box`, `minTextSize`, `minTapTarget`); any CSS in `App.css` that duplicates a resolver decision (e.g. font-size `clamp()` rules) is documented as fallback-only and applies solely when a resolved element omits the corresponding field.