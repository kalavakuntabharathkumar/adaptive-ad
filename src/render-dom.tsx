import type { ReactElement } from "react";
import type { AdElement, AdSpec } from "./spec";
import type {
  ResolvedElement,
  ResolvedLayout,
} from "./resolved-layout";
import type { SurfaceProfile } from "./surfaces";

/*
 * Base presentation sizes.
 *
 * The resolver controls the element geometry.
 * These values define the preferred starting size
 * for text inside the resolved element box.
 */
const DEFAULT_HEADLINE_FONT_SIZE = 32;
const DEFAULT_FAR_HEADLINE_FONT_SIZE = 24;
const DEFAULT_SECONDARY_FONT_SIZE = 18;

const ABSOLUTE_MIN_FONT_SIZE = 10;
const DEFAULT_LINE_HEIGHT = 1.2;

/*
 * Maximum number of fitting iterations.
 *
 * Keeps text fitting deterministic and inexpensive.
 */
const MAX_FIT_ITERATIONS = 12;

/*
 * Small safety allowance for browser text metrics.
 *
 * The browser's actual glyph metrics can reach slightly beyond
 * the measured client box. This prevents borderline cases from
 * being accepted.
 */
const TEXT_FIT_SAFETY_PADDING = 2;

/*
 * Approximate fallback character width.
 *
 * Used when browser measurement is unavailable.
 */
const AVERAGE_CHARACTER_WIDTH = 0.52;
const TEXT_FIT_SAFETY_FACTOR = 1.12;

/*
 * The text box has 8px horizontal and 6px vertical padding,
 * expressed in the SAME native/resolver units that
 * resolved.box.width/height are in.
 *
 * IMPORTANT: this must match exactly between the off-screen
 * measurement element (measureTextInBrowser) and the real
 * rendered text styles (getTextStyles). If these two diverge,
 * "fits" decisions are made against a box that isn't the one
 * actually rendered, which is how clipping sneaks in.
 *
 * measureTextInBrowser always measures in native/resolver units
 * (it's an off-screen, unscaled element), so this stays a plain
 * px value there. getTextStyles converts the same numbers to
 * cqw so the real on-screen box — which may be rendered at a
 * different physical size than the native units suggest — ends
 * up with the exact same proportions that were measured.
 */
const TEXT_BOX_PADDING_VERTICAL = 6;
const TEXT_BOX_PADDING_HORIZONTAL = 8;
const TEXT_BOX_PADDING = `${TEXT_BOX_PADDING_VERTICAL}px ${TEXT_BOX_PADDING_HORIZONTAL}px`;

/*
 * Ellipsis appended to truncated text.
 */
const TRUNCATION_SUFFIX = "…";

/*
 * Estimate how many characters can fit on one line.
 *
 * This remains as a deterministic fallback.
 */
function getCharactersPerLine(
  boxWidth: number,
  fontSize: number
): number {
  if (
    boxWidth <= 0 ||
    fontSize <= 0
  ) {
    return 1;
  }

  return Math.max(
    1,
    Math.floor(
      boxWidth /
        (fontSize *
          AVERAGE_CHARACTER_WIDTH *
          TEXT_FIT_SAFETY_FACTOR)
    )
  );
}

/*
 * Estimate how many lines the content requires.
 *
 * Fallback used when browser measurement is not available.
 */
function estimateLineCount(
  content: string,
  boxWidth: number,
  fontSize: number
): number {
  if (
    !content ||
    boxWidth <= 0 ||
    fontSize <= 0
  ) {
    return 1;
  }

  const charactersPerLine =
    getCharactersPerLine(
      boxWidth,
      fontSize
    );

  const paragraphs =
    content.split("\n");

  let totalLines = 0;

  for (const paragraph of paragraphs) {
    /*
     * Empty lines still consume one line.
     */
    if (paragraph.length === 0) {
      totalLines += 1;
      continue;
    }

    const words =
      paragraph.split(/\s+/);

    let currentLineLength = 0;
    let paragraphLines = 1;

    for (const word of words) {
      const wordLength =
        word.length;

      /*
       * Long unbroken words need to be
       * split across multiple lines.
       */
      if (
        wordLength >
        charactersPerLine
      ) {
        if (
          currentLineLength > 0
        ) {
          paragraphLines += 1;
          currentLineLength = 0;
        }

        paragraphLines +=
          Math.ceil(
            wordLength /
              charactersPerLine
          ) - 1;

        currentLineLength =
          wordLength %
          charactersPerLine;

        if (
          currentLineLength === 0
        ) {
          currentLineLength =
            charactersPerLine;
        }

        continue;
      }

      const requiredLength =
        currentLineLength === 0
          ? wordLength
          : currentLineLength +
            wordLength +
            1;

      if (
        currentLineLength > 0 &&
        requiredLength >
          charactersPerLine
      ) {
        paragraphLines += 1;
        currentLineLength =
          wordLength;
      } else {
        currentLineLength =
          requiredLength;
      }
    }

    totalLines +=
      paragraphLines;
  }

  return Math.max(
    1,
    totalLines
  );
}

/*
 * Browser measurement result.
 */
interface TextMeasurement {
  width: number;
  height: number;
}

/*
 * Measure the actual browser-rendered text.
 *
 * This creates an off-screen measurement element using the same
 * important text styles as the real renderer.
 *
 * NOTE: This element is measured in native/resolver units (it's
 * appended off-screen at a literal `${width}px`, unscaled by any
 * container). `fontSize` here is therefore also a native-unit
 * pixel value, not a final on-screen CSS pixel value. getTextStyles
 * is responsible for translating this native-unit result into
 * cqw so the real, possibly-scaled, on-screen box matches what
 * was measured here.
 *
 * The measurement uses:
 * - actual browser font metrics
 * - actual word wrapping
 * - actual line height
 * - actual font family
 * - actual font weight
 * - actual padding (must match getTextStyles exactly, in the
 *   same native-unit space)
 *
 * This is more accurate than estimating line count from
 * average character width.
 */
function measureTextInBrowser(
  content: string,
  width: number,
  fontSize: number,
  className: string
): TextMeasurement | null {
  if (
    typeof document === "undefined" ||
    width <= 0 ||
    fontSize <= 0
  ) {
    return null;
  }

  const measurement =
    document.createElement("div");

  measurement.className =
    className;

  measurement.textContent =
    content;

  measurement.style.position =
    "absolute";

  measurement.style.left =
    "-100000px";

  measurement.style.top =
    "0";

  measurement.style.width =
    `${width}px`;

  measurement.style.height =
    "auto";

  measurement.style.minWidth =
    "0";

  measurement.style.maxWidth =
    `${width}px`;

  measurement.style.boxSizing =
    "border-box";

  measurement.style.fontSize =
    `${fontSize}px`;

  measurement.style.lineHeight =
    `${DEFAULT_LINE_HEIGHT}`;

  measurement.style.fontWeight =
    className === "headline"
      ? "900"
      : "400";

  measurement.style.letterSpacing =
    className === "headline"
      ? "-0.04em"
      : "normal";

  measurement.style.whiteSpace =
    "normal";

  measurement.style.overflowWrap =
    "anywhere";

  measurement.style.wordBreak =
    "break-word";

  measurement.style.padding =
    TEXT_BOX_PADDING;

  measurement.style.margin =
    "0";

  measurement.style.visibility =
    "hidden";

  measurement.style.pointerEvents =
    "none";

  document.body.appendChild(
    measurement
  );

  const result: TextMeasurement = {
    width:
      measurement.scrollWidth,
    height:
      measurement.scrollHeight,
  };

  document.body.removeChild(
    measurement
  );

  return result;
}

/*
 * Result of the text-fit pass.
 *
 * `truncated` is true when even the surface's minimum font
 * size cannot make the full content fit inside the box. In
 * that case the renderer must truncate the displayed content
 * instead of relying on CSS overflow to hide the excess.
 */
interface FittedTextResult {
  fontSize: number;
  truncated: boolean;
}

/*
 * Calculates the largest font size that fits
 * inside the already-resolved box.
 *
 * The browser is used as the primary measurement
 * source. The deterministic estimator is retained
 * as a fallback.
 *
 * All arithmetic here — box dimensions and returned
 * fontSize — stays in native/resolver units. It is the
 * renderer's job (getTextStyles) to convert the returned
 * fontSize into a value that is correct for the box's real
 * on-screen size, whatever that turns out to be.
 *
 * Important:
 *
 * - x/y/width/height are never changed here.
 * - Resolver remains responsible for geometry.
 * - Surface minimum text size remains respected.
 * - No character-count cutoff is used for sizing.
 * - If content cannot fit even at the minimum size,
 *   that is reported via `truncated: true` so the
 *   caller can truncate the text explicitly, rather
 *   than silently clipping it.
 */
function getFittedTextSize(
  content: string,
  boxWidth: number,
  boxHeight: number,
  baseFontSize: number,
  minimumFontSize: number | undefined,
  className: string
): FittedTextResult {
  if (
    !content ||
    boxWidth <= 0 ||
    boxHeight <= 0
  ) {
    return {
      fontSize: baseFontSize,
      truncated: false,
    };
  }

  const minimum =
    Math.max(
      minimumFontSize ??
        ABSOLUTE_MIN_FONT_SIZE,
      ABSOLUTE_MIN_FONT_SIZE
    );

  const startingFontSize =
    Math.max(
      minimum,
      baseFontSize
    );

  /*
   * The actual text has TEXT_BOX_PADDING_HORIZONTAL px per side
   * horizontally and TEXT_BOX_PADDING_VERTICAL px per side
   * vertically, in native/resolver units.
   */
  const availableWidth =
    Math.max(
      1,
      boxWidth - TEXT_BOX_PADDING_HORIZONTAL * 2
    );

  const availableHeight =
    Math.max(
      1,
      boxHeight - TEXT_BOX_PADDING_VERTICAL * 2
    );

  /*
   * Test whether a particular font size fits.
   *
   * Browser measurement is preferred.
   */
  const fitsAtFontSize =
    (candidateFontSize: number): boolean => {
      const browserMeasurement =
        measureTextInBrowser(
          content,
          boxWidth,
          candidateFontSize,
          className
        );

      if (browserMeasurement) {
        return (
          browserMeasurement.height +
            TEXT_FIT_SAFETY_PADDING <=
          boxHeight
        );
      }

      /*
       * Deterministic fallback.
       */
      const lines =
        estimateLineCount(
          content,
          availableWidth,
          candidateFontSize
        );

      const requiredHeight =
        lines *
        candidateFontSize *
        DEFAULT_LINE_HEIGHT;

      return (
        requiredHeight <=
        availableHeight
      );
    };

  /*
   * Preferred size already fits.
   */
  if (
    fitsAtFontSize(
      startingFontSize
    )
  ) {
    return {
      fontSize: startingFontSize,
      truncated: false,
    };
  }

  /*
   * Before searching, confirm the minimum size can even
   * fit. If it can't, content that doesn't fit at any size
   * still renders at `minimum` and must be truncated by the
   * caller rather than silently clipped.
   */
  if (!fitsAtFontSize(minimum)) {
    return {
      fontSize: minimum,
      truncated: true,
    };
  }

  /*
   * If the preferred size does not fit, but the minimum size
   * does, binary-search for the largest font size that fits.
   * `low` starts at `minimum`, which we've now confirmed fits,
   * so this is a valid search bound.
   */
  let low = minimum;
  let high =
    startingFontSize;

  for (
    let iteration = 0;
    iteration < MAX_FIT_ITERATIONS;
    iteration += 1
  ) {
    const candidate =
      (low + high) / 2;

    if (
      fitsAtFontSize(candidate)
    ) {
      low = candidate;
    } else {
      high = candidate;
    }
  }

  return {
    fontSize: Math.max(
      minimum,
      Math.floor(low)
    ),
    truncated: false,
  };
}

/*
 * Truncate content to the longest prefix (plus an ellipsis)
 * that fits inside the box at the given font size.
 *
 * Only called when getFittedTextSize reports `truncated: true`,
 * i.e. the full content does not fit even at the surface's
 * minimum font size. This replaces silent CSS clipping with an
 * explicit, deterministic degradation step, per the "secondary
 * text truncates" behavior the layout is expected to produce.
 *
 * boxWidth/boxHeight/fontSize here are native/resolver units,
 * matching getFittedTextSize and measureTextInBrowser.
 */
function truncateTextToFit(
  content: string,
  boxWidth: number,
  boxHeight: number,
  fontSize: number,
  className: string
): string {
  const fits = (candidate: string): boolean => {
    const measurement = measureTextInBrowser(
      candidate,
      boxWidth,
      fontSize,
      className
    );

    if (measurement) {
      return (
        measurement.height +
          TEXT_FIT_SAFETY_PADDING <=
        boxHeight
      );
    }

    /*
     * Deterministic fallback: assume it fits if the
     * character-based estimate says one line-count's
     * worth of height is within the box.
     */
    const availableWidth = Math.max(
      1,
      boxWidth - TEXT_BOX_PADDING_HORIZONTAL * 2
    );
    const lines = estimateLineCount(
      candidate,
      availableWidth,
      fontSize
    );
    return (
      lines * fontSize * DEFAULT_LINE_HEIGHT <=
      boxHeight
    );
  };

  /*
   * Even a single ellipsis character doesn't fit —
   * nothing more we can do; return it anyway so the
   * box isn't left completely empty.
   */
  if (!fits(TRUNCATION_SUFFIX)) {
    return TRUNCATION_SUFFIX;
  }

  /*
   * Binary-search the longest prefix length that fits
   * once the ellipsis is appended.
   */
  let low = 0;
  let high = content.length;

  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate =
      content.slice(0, mid).trimEnd() +
      TRUNCATION_SUFFIX;

    if (fits(candidate)) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return (
    content.slice(0, low).trimEnd() +
    TRUNCATION_SUFFIX
  );
}

/*
 * Final, independent verification that the given content actually
 * fits in the box at the given font size — using the same real
 * browser measurement as everything else.
 *
 * This exists as a safety net. getFittedTextSize's `truncated`
 * flag is set from ONE check made earlier, before the final font
 * size and box are both settled. If that single check is ever
 * wrong at a boundary (e.g. content that's just barely over),
 * nothing downstream would catch it, and the full content would
 * render untruncated and get silently clipped by `overflow:
 * hidden`. Calling this right before rendering — regardless of
 * what `truncated` said — closes that gap.
 *
 * boxWidth/boxHeight/fontSize here are native/resolver units,
 * matching getFittedTextSize and measureTextInBrowser.
 */
function contentFits(
  content: string,
  boxWidth: number,
  boxHeight: number,
  fontSize: number,
  className: string
): boolean {
  const measurement = measureTextInBrowser(
    content,
    boxWidth,
    fontSize,
    className
  );

  if (measurement) {
    return (
      measurement.height +
        TEXT_FIT_SAFETY_PADDING <=
      boxHeight
    );
  }

  const availableWidth = Math.max(
    1,
    boxWidth - TEXT_BOX_PADDING_HORIZONTAL * 2
  );
  const lines = estimateLineCount(
    content,
    availableWidth,
    fontSize
  );
  return (
    lines * fontSize * DEFAULT_LINE_HEIGHT <=
    boxHeight
  );
}

/*
 * Shared text styles.
 *
 * Text remains contained by the resolved box.
 * The font size is determined by the fitting
 * algorithm before rendering, in native/resolver units.
 *
 * CRITICAL FIX: `fontSize` and `padding` are expressed as
 * container-query width units (cqw) relative to `boxWidth`
 * (the SAME native/resolver-unit width that was used during
 * fitting/measurement in getFittedTextSize/measureTextInBrowser),
 * instead of literal CSS pixels.
 *
 * Why this matters: the resolver computes box geometry in native
 * surface units (e.g. up to 1920 wide for a broadcast surface),
 * but the actual on-screen `.surface` element is rendered at a
 * completely different physical size (e.g. capped at 1100px, or
 * upscaled for small surfaces) — see App.tsx's
 * `width: min(100%, 1100px)`. A literal `${fontSize}px` value
 * computed for a 700px-native-unit-wide box will be wrong once
 * that box is actually rendered at, say, 400px on screen: text
 * sized to fit 700px will overflow a 400px box, and truncation
 * decisions made against 700px won't match what's visually shown.
 *
 * Expressing font-size/padding as a percentage of the box's own
 * width (cqw) means both scale automatically with however large
 * the box ends up being rendered, preserving the exact proportions
 * that were verified to fit — no matter what physical size the
 * surface preview ends up at. This requires the parent element
 * (the `.ad-element` wrapper in renderAdToDom) to establish a
 * CSS size container (`containerType: "inline-size"`), so `cqw`
 * resolves against that wrapper's real rendered width.
 *
 * `boxWidth` must always be `resolved.box.width` — the same value
 * passed into `getFittedTextSize` — never `surface.width` or any
 * other quantity, or the ratio will be wrong again.
 */
function getTextStyles(
  fontSize: number,
  boxWidth: number
): React.CSSProperties {
  const toCqw = (nativeUnitPx: number): string =>
    `${(nativeUnitPx / boxWidth) * 100}cqw`;

  return {
    fontSize: toCqw(fontSize),
    lineHeight:
      DEFAULT_LINE_HEIGHT,

    width: "100%",
    height: "100%",

    maxWidth: "100%",
    maxHeight: "100%",

    minWidth: 0,
    minHeight: 0,

    boxSizing: "border-box",

    overflowWrap: "anywhere",
    wordBreak: "break-word",

    whiteSpace: "normal",

    /*
     * Retained as a last-resort safety net only. With correctly
     * scaled font-size/padding, contentFits + truncateTextToFit
     * should mean this never actually needs to clip anything.
     */
    overflow: "hidden",

    margin: 0,
    padding: `${toCqw(TEXT_BOX_PADDING_VERTICAL)} ${toCqw(
      TEXT_BOX_PADDING_HORIZONTAL
    )}`,
  };
}

/*
 * Turns one resolved element into its DOM content.
 *
 * Resolver:
 *   owns geometry
 *
 * Renderer:
 *   owns presentation
 *   owns text fitting
 *   owns truncation fallback when fitting is impossible
 */
function renderElementContent(
  specElement: AdElement,
  resolved: ResolvedElement,
  surface: SurfaceProfile
): ReactElement {
  const {
    type,
    role,
    content,
  } = specElement;

  /*
   * PRIMARY / HEADLINE
   */
  if (
    type === "text" &&
    role === "primary"
  ) {
    const preferredHeadlineSize =
      surface.viewingDistance ===
      "far"
        ? DEFAULT_FAR_HEADLINE_FONT_SIZE
        : DEFAULT_HEADLINE_FONT_SIZE;

    const fitted =
      getFittedTextSize(
        content,
        resolved.box.width,
        resolved.box.height,
        preferredHeadlineSize,
        resolved.minTextSize,
        "headline"
      );

    const displayContent =
      contentFits(
        content,
        resolved.box.width,
        resolved.box.height,
        fitted.fontSize,
        "headline"
      )
        ? content
        : truncateTextToFit(
            content,
            resolved.box.width,
            resolved.box.height,
            fitted.fontSize,
            "headline"
          );

    const wasTruncated =
      displayContent !== content;

    return (
      <div
        className="headline"
        style={getTextStyles(
          fitted.fontSize,
          resolved.box.width
        )}
        title={
          wasTruncated
            ? content
            : undefined
        }
      >
        {displayContent}
      </div>
    );
  }

  /*
   * SECONDARY TEXT
   */
  if (
    type === "text" &&
    role === "secondary"
  ) {
    const fitted =
      getFittedTextSize(
        content,
        resolved.box.width,
        resolved.box.height,
        DEFAULT_SECONDARY_FONT_SIZE,
        resolved.minTextSize,
        "secondary-text"
      );

    const displayContent =
      contentFits(
        content,
        resolved.box.width,
        resolved.box.height,
        fitted.fontSize,
        "secondary-text"
      )
        ? content
        : truncateTextToFit(
            content,
            resolved.box.width,
            resolved.box.height,
            fitted.fontSize,
            "secondary-text"
          );

    const wasTruncated =
      displayContent !== content;

    return (
      <div
        className="secondary-text"
        style={getTextStyles(
          fitted.fontSize,
          resolved.box.width
        )}
        title={
          wasTruncated
            ? content
            : undefined
        }
      >
        {displayContent}
      </div>
    );
  }

  /*
   * IMAGE
   */
  if (type === "image") {
    return (
      <img
        className={
          role === "branding"
            ? "logo"
            : "product-image"
        }
        src={content}
        alt={
          role === "branding"
            ? "Brand logo"
            : "Product"
        }
        style={{
          display: "block",

          maxWidth: "100%",
          maxHeight: "100%",

          width: "100%",
          height: "100%",

          objectFit: "contain",
        }}
      />
    );
  }

  /*
   * CTA BUTTON
   */
  if (type === "button") {
    return (
      <button
        className="cta"
        style={{
          minWidth: undefined,

          minHeight:
            resolved.minTapTarget
              ? `${resolved.minTapTarget}px`
              : undefined,

          maxWidth: "100%",
          maxHeight: "100%",

          boxSizing: "border-box",

          overflow: "visible",
          whiteSpace: "normal",
          overflowWrap: "anywhere",
        }}
      >
        {content}
      </button>
    );
  }

  /*
   * Fallback for any supported element
   * that does not need special rendering.
   */
  return (
    <div>
      {content}
    </div>
  );
}

/*
 * Pure DOM renderer.
 *
 * AdSpec + ResolvedLayout + SurfaceProfile
 *                ↓
 *           Positioned DOM
 *
 * No React state.
 * No React hooks.
 *
 * No surface-name-specific branches.
 *
 * Geometry always comes from ResolvedLayout.
 */
export function renderAdToDom(
  spec: AdSpec,
  layout: ResolvedLayout,
  surface: SurfaceProfile
): ReactElement[] {
  const elements: ReactElement[] = [];

  for (
    const element of layout.elements
  ) {
    const specElement =
      spec.elements.find(
        (item) =>
          item.id === element.id
      );

    if (!specElement) {
      continue;
    }

    /*
     * Convert resolver coordinates from
     * surface pixels into percentages.
     */
    const left =
      (element.box.x /
        surface.width) *
      100;

    const top =
      (element.box.y /
        surface.height) *
      100;

    const width =
      (element.box.width /
        surface.width) *
      100;

    const height =
      (element.box.height /
        surface.height) *
      100;

    elements.push(
      <div
        key={element.id}
        className={`ad-element ${
          specElement.role
        } ${
          element.visible
            ? ""
            : "hidden-element"
        }`}
        style={{
          left: `${left}%`,
          top: `${top}%`,
          width: `${width}%`,
          height: `${height}%`,

          boxSizing:
            "border-box",

          minWidth: 0,
          minHeight: 0,

          /*
           * Establishes a CSS size query container so that the
           * cqw units used inside getTextStyles resolve against
           * THIS element's real, on-screen rendered width — not
           * the resolver's native surface-unit coordinate space.
           * This is what makes font-size/padding actually track
           * however big the `.surface` preview ends up being
           * rendered (see App.tsx's `.surface` width/maxHeight),
           * instead of assuming it matches surface.width 1:1.
           */
          containerType: "inline-size",
        } as React.CSSProperties}
      >
        {renderElementContent(
          specElement,
          element,
          surface
        )}
      </div>
    );
  }

  return elements;
}