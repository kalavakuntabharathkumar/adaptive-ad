
import type { ReactElement } from "react";
import type { AdElement, AdSpec } from "./spec";
import type {
  ResolvedElement,
  ResolvedLayout,
} from "./resolved-layout";
import type { SurfaceProfile } from "./surfaces";

/*
 * Turns one resolved element into its DOM content (the thing
 * that sits inside the positioned box).
 *
 * This is the renderer layer that consumes the physical
 * constraints produced by the layout resolver.
 */
function renderElementContent(
  specElement: AdElement,
  resolved: ResolvedElement
): ReactElement {
  const { type, role, content } = specElement;

  if (type === "text" && role === "primary") {
    return (
      <div
        className="headline"
        style={{
          fontSize: resolved.minTextSize
            ? `${resolved.minTextSize}px`
            : undefined,
        }}
      >
        {content}
      </div>
    );
  }

  if (type === "text" && role === "secondary") {
    return (
      <div
        className="secondary-text"
        style={{
          fontSize: resolved.minTextSize
            ? `${resolved.minTextSize}px`
            : undefined,
        }}
      >
        {content}
      </div>
    );
  }

  if (type === "image") {
    return (
      <img
        className={role === "branding" ? "logo" : "product-image"}
        src={content}
        alt={role === "branding" ? "Brand logo" : "Product"}
      />
    );
  }

  if (type === "button") {
    return (
      <button
        className="cta"
        style={{
          minWidth: resolved.minTapTarget
            ? `${resolved.minTapTarget}px`
            : undefined,
          minHeight: resolved.minTapTarget
            ? `${resolved.minTapTarget}px`
            : undefined,
        }}
      >
        {content}
      </button>
    );
  }

  return <div>{content}</div>;
}

/*
 * Pure DOM renderer:
 *
 * AdSpec + ResolvedLayout + SurfaceProfile
 *                ↓
 *           Positioned DOM
 *
 * No React state or hooks live here.
 * App.tsx owns application UI/state, while this module owns
 * the conversion from resolved layout data into DOM elements.
 */
export function renderAdToDom(
  spec: AdSpec,
  layout: ResolvedLayout,
  surface: SurfaceProfile
): ReactElement[] {
  const elements: ReactElement[] = [];

  for (const element of layout.elements) {
    const specElement = spec.elements.find(
      (item) => item.id === element.id
    );

    if (!specElement) {
      continue;
    }

    const left = (element.box.x / surface.width) * 100;
    const top = (element.box.y / surface.height) * 100;
    const width = (element.box.width / surface.width) * 100;
    const height = (element.box.height / surface.height) * 100;

    elements.push(
      <div
        key={element.id}
        className={`ad-element ${specElement.role} ${
          element.visible ? "" : "hidden-element"
        }`}
        style={{
          left: `${left}%`,
          top: `${top}%`,
          width: `${width}%`,
          height: `${height}%`,
        }}
      >
        {renderElementContent(specElement, element)}
      </div>
    );
  }

  return elements;
}
