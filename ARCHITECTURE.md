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
| `src/surfaces.ts` | Defines `SurfaceProfile` (dimensions, safe area, min tap target, min text size, viewing distance, adaptive-landscape opt-in) and the five demo surfaces. |
| `src/resolver.ts` | The constraint resolution algorithm. Pure functions in, `ResolvedLayout` out. The only module that knows how to turn an `AdSpec` + `SurfaceProfile` into geometry. |
| `src/resolved-layout.ts` | Defines `LayoutBox`, `ResolvedElement`, `ResolvedLayout` — the output contract every renderer consumes. |
| `src/App.tsx` | React UI: surface picker, live preview, info panels. Currently also contains the DOM rendering logic (`renderElement`) and box-positioning math inline — see Known Limitations in the README. |
| `src/resolver.test.ts` | Self-contained assertion-based validation suite for the resolver (18 checks), runnable via `npx tsx src/resolver.test.ts`. |

---

## 3. Data flow through the resolver

`resolveLayout(elements: AdElement[], surface: SurfaceProfile): ResolvedLayout` is the single entry point (`src/resolver.ts`). Everything else in that file is a private helper it composes:

1. `getUsableArea(surface)` — surface dimensions minus safe-area insets.
2. `getLayoutDirection(surface)` — aspect-ratio thresholds decide `vertical` / `horizontal` / `balanced` composition. This is the only branch point derived from surface *shape*; it is not a per-named-surface switch.
3. A retry loop starting with the full element list:
   - `resolveVisibleElements(remaining, area, direction, surface)` sizes and positions the current candidate set (dispatching internally to `resolveVertical` / `resolveHorizontal` / `resolveBalanced` / `resolveAdaptiveLandscape`, backed by `createSizedElements` and `fitMainAxis`, which shrink each element between its preferred and minimum fraction of the area per role).
   - `isFeasible(...)` validates the candidate layout: correct count, valid dimensions, fits within the usable area, no overlaps, satisfies physical constraints (min text size, min tap target), satisfies CTA text-width constraints.
   - If feasible → return the resolved boxes for visible elements plus `createHiddenElements(...)` for anything already excluded.
   - If not feasible → `removeLowestPriority(remaining)` drops one element (lowest priority, ties broken by array order) and the loop retries with the smaller set.
4. If the retry loop exhausts without a feasible result, a final fallback attempts to place just the single highest-priority element alone; if that also fails, every element is returned hidden.

The result is a `ResolvedLayout`: a flat list of `{ id, box: { x, y, width, height }, visible, minTextSize?, minTapTarget? }`. It carries no React, DOM, or Canvas concepts — it's plain geometry and booleans.

---

## 4. Adding a new surface

Adding a new target surface requires **zero changes to `resolver.ts`**. The resolver only ever reads generic `SurfaceProfile` fields (`width`, `height`, `safeArea`, `minTapTarget`, `minTextSize`, `viewingDistance`, `allowAdaptiveLandscapeComposition`) and derives its layout direction from aspect ratio — it never branches on a surface's name or identity.

To add one:

1. Add a new entry to the `surfaces` record in `src/surfaces.ts` with the appropriate `SurfaceProfile` fields.
2. Add a matching label (and picker icon, if desired) in `src/App.tsx`'s `surfaceLabels`.

That's it. `src/resolver.test.ts` already includes a check (`validateUnknownFifthSurface`) that constructs a fifth surface not present in the demo set purely to confirm the resolver's output stays valid (no overlaps, no overflow) for surfaces it has never seen — proving this is a general algorithm, not a lookup table keyed on the five demo surface names.

---

## 5. Adding a new renderer

Every renderer is meant to consume the same `ResolvedLayout` produced by `resolveLayout()` — the resolver has no knowledge of, or dependency on, React, the DOM, or any specific rendering target. A new renderer (e.g. a Canvas or SVG renderer) would:

1. Call `resolveLayout(adSpec.elements, surface)` exactly as `App.tsx` does today.
2. Walk `resolvedLayout.elements`, and for each visible element, use `element.box` (`x`, `y`, `width`, `height`) to draw or position content, and `element.minTextSize` / `element.minTapTarget` where the target medium needs them.
3. Never call into `resolver.ts` internals directly — the public contract is `resolveLayout` in, `ResolvedLayout` out.

**Current state:** the DOM renderer (JSX construction and percentage-based box positioning) lives inline inside `src/App.tsx` rather than in a separate module, so this contract is true by construction (the resolver genuinely has no rendering-target awareness) but isn't yet *demonstrated* by a second, independent renderer. Extracting the DOM-rendering logic into its own `render-dom.ts` — a pure function taking `(spec, layout, surface)` and returning renderable output, called by `App.tsx` for state/UI chrome only — is the natural next step to prove this out.

---

## 6. Design constraints this architecture enforces

- **No surface-specific code paths.** All surface behavior is data (`SurfaceProfile`), not code. Layout direction is derived, not declared per surface.
- **Degradation is content-aware, not layout-aware.** Priority lives on `AdElement`, not on any surface or layout config — the same element degrades in the same order regardless of which surface is shrinking it.
- **Validation happens at the boundary.** `validateAdSpec` runs once, at spec-definition time, so nothing downstream needs to re-validate element shape.
- **The resolver is pure.** `resolveLayout` and its helpers take plain data in and return plain data out — no DOM access, no React, no side effects — which is what makes multiple renderers against the same output a realistic extension rather than a rewrite.