import type { SurfaceProfile } from "./surfaces";
import type { AdElement } from "./spec";
import type {
  ResolvedElement,
  ResolvedLayout,
} from "./resolved-layout";

type LayoutDirection =
  | "vertical"
  | "horizontal"
  | "balanced";

interface UsableArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ElementSize {
  width: number;
  height: number;
}

interface SizedElement {
  element: AdElement;
  size: ElementSize;
  minimum: ElementSize;
}

interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

const GAP = 16;
const MIN_SAFE_DIMENSION = 1;
const EPSILON = 0.5;

/*
 * Minimum horizontal space required for CTA content.
 *
 * This is a generic content constraint. It is intentionally
 * independent of the composition direction or surface name.
 *
 * Physical tap-target constraints and content constraints are
 * combined when calculating the element's final minimum size.
 */
const MIN_CTA_TEXT_WIDTH = 96;

function clamp(
  value: number,
  minimum: number,
  maximum: number
): number {
  if (maximum < minimum) {
    return clamp(value, maximum, minimum);
  }

  return Math.min(
    maximum,
    Math.max(minimum, value)
  );
}

function getSafeArea(
  surface: SurfaceProfile
) {
  return surface.safeArea ?? {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };
}

function getUsableArea(
  surface: SurfaceProfile
): UsableArea {
  const safeArea = getSafeArea(surface);

  return {
    x: safeArea.left,
    y: safeArea.top,
    width: Math.max(
      0,
      surface.width -
        safeArea.left -
        safeArea.right
    ),
    height: Math.max(
      0,
      surface.height -
        safeArea.top -
        safeArea.bottom
    ),
  };
}

function getLayoutDirection(
  surface: SurfaceProfile
): LayoutDirection {
  const aspectRatio =
    surface.width /
    Math.max(
      surface.height,
      MIN_SAFE_DIMENSION
    );

  /*
   * These thresholds are geometry-driven composition
   * heuristics, not surface-specific layout rules.
   */
  if (aspectRatio < 0.85) {
    return "vertical";
  }

  if (aspectRatio > 1.25) {
    return "horizontal";
  }

  return "balanced";
}

function getPreferredFraction(
  element: AdElement,
  direction: LayoutDirection
): ElementSize {
  if (direction === "vertical") {
    switch (element.role) {
      case "hero":
        return {
          width: 0.78,
          height: 0.30,
        };

      case "primary":
        return {
          width: 0.88,
          height: 0.12,
        };

      case "action":
        return {
          width: 0.55,
          height: 0.10,
        };

      case "branding":
        return {
          width: 0.22,
          height: 0.055,
        };

      case "secondary":
        return {
          width: 0.68,
          height: 0.08,
        };
    }
  }

  if (direction === "horizontal") {
    switch (element.role) {
      case "hero":
        return {
          width: 0.30,
          height: 0.78,
        };

      case "primary":
        return {
          width: 0.48,
          height: 0.28,
        };

      case "action":
        return {
          width: 0.22,
          height: 0.25,
        };

      case "branding":
        return {
          width: 0.13,
          height: 0.16,
        };

      case "secondary":
        return {
          width: 0.30,
          height: 0.20,
        };
    }
  }

  switch (element.role) {
    case "hero":
      return {
        width: 0.45,
        height: 0.58,
      };

    case "primary":
      return {
        width: 0.72,
        height: 0.15,
      };

    case "action":
      return {
        width: 0.42,
        height: 0.11,
      };

    case "branding":
      return {
        width: 0.22,
        height: 0.07,
      };

    case "secondary":
      return {
        width: 0.55,
        height: 0.095,
      };
  }
}

function getMinimumFraction(
  element: AdElement,
  direction: LayoutDirection
): ElementSize {
  if (direction === "vertical") {
    switch (element.role) {
      case "hero":
        return {
          width: 0.42,
          height: 0.18,
        };

      case "primary":
        return {
          width: 0.50,
          height: 0.065,
        };

      case "action":
        return {
          width: 0.30,
          height: 0.07,
        };

      case "branding":
        return {
          width: 0.10,
          height: 0.035,
        };

      case "secondary":
        return {
          width: 0.32,
          height: 0.05,
        };
    }
  }

  if (direction === "horizontal") {
    switch (element.role) {
      case "hero":
        return {
          width: 0.18,
          height: 0.50,
        };

      case "primary":
        return {
          width: 0.25,
          height: 0.15,
        };

      case "action":
        return {
          width: 0.12,
          height: 0.12,
        };

      case "branding":
        return {
          width: 0.06,
          height: 0.06,
        };

      case "secondary":
        return {
          width: 0.15,
          height: 0.08,
        };
    }
  }

  switch (element.role) {
    case "hero":
      return {
        width: 0.28,
        height: 0.32,
      };

    case "primary":
      return {
        width: 0.40,
        height: 0.08,
      };

    case "action":
      return {
        width: 0.22,
        height: 0.07,
      };

    case "branding":
      return {
        width: 0.10,
        height: 0.04,
      };

    case "secondary":
      return {
        width: 0.24,
        height: 0.05,
      };
  }
}

function getMinimumTextHeight(
  element: AdElement,
  surface: SurfaceProfile
): number {
  if (
    element.type !== "text" ||
    !surface.minTextSize
  ) {
    return 0;
  }

  return surface.minTextSize * 1.25;
}

function getMinimumTapHeight(
  element: AdElement,
  surface: SurfaceProfile
): number {
  if (
    element.type !== "button" ||
    !surface.minTapTarget
  ) {
    return 0;
  }

  return surface.minTapTarget;
}

/*
 * Physical constraints only.
 *
 * These are constraints imposed by the rendering surface,
 * such as minimum text size and minimum interactive target size.
 */
function getMinimumPhysicalSize(
  element: AdElement,
  surface: SurfaceProfile
): ElementSize {
  const textHeight =
    getMinimumTextHeight(
      element,
      surface
    );

  const tapHeight =
    getMinimumTapHeight(
      element,
      surface
    );

  const minimumHeight =
    Math.max(
      textHeight,
      tapHeight
    );

  return {
    width:
      element.type === "button" &&
      surface.minTapTarget
        ? surface.minTapTarget
        : 1,

    height:
      Math.max(
        1,
        minimumHeight
      ),
  };
}

/*
 * Content constraints.
 *
 * These are independent from physical surface constraints.
 * This makes CTA content protection work identically in
 * vertical, horizontal, balanced, and adaptive compositions.
 */
function getMinimumContentSize(
  element: AdElement
): ElementSize {
  if (
    element.type === "button" &&
    element.role === "action"
  ) {
    return {
      width: MIN_CTA_TEXT_WIDTH,
      height: 1,
    };
  }

  return {
    width: 1,
    height: 1,
  };
}

/*
 * Combines all minimum constraints:
 *
 * fractional minimum
 *        +
 * physical minimum
 *        +
 * content minimum
 *        ↓
 * final minimum size
 */
function getMinimumElementSize(
  element: AdElement,
  region: UsableArea | Region,
  minimumFraction: ElementSize,
  surface: SurfaceProfile
): ElementSize {
  const physicalMinimum =
    getMinimumPhysicalSize(
      element,
      surface
    );

  const contentMinimum =
    getMinimumContentSize(
      element
    );

  return {
    width: Math.max(
      region.width *
        minimumFraction.width,
      physicalMinimum.width,
      contentMinimum.width
    ),

    height: Math.max(
      region.height *
        minimumFraction.height,
      physicalMinimum.height,
      contentMinimum.height
    ),
  };
}

function createSizedElements(
  elements: AdElement[],
  region: UsableArea | Region,
  direction: LayoutDirection,
  surface: SurfaceProfile
): SizedElement[] {
  return elements.map(
    (element) => {
      const preferred =
        getPreferredFraction(
          element,
          direction
        );

      const minimum =
        getMinimumFraction(
          element,
          direction
        );

      const minimumSize =
        getMinimumElementSize(
          element,
          region,
          minimum,
          surface
        );

      return {
        element,

        size: {
          width:
            region.width *
            preferred.width,

          height:
            region.height *
            preferred.height,
        },

        minimum: minimumSize,
      };
    }
  );
}

function getMainAxisSize(
  item: SizedElement,
  direction: LayoutDirection
): number {
  return direction === "horizontal"
    ? item.size.width
    : item.size.height;
}

function getMinimumMainAxisSize(
  item: SizedElement,
  direction: LayoutDirection
): number {
  return direction === "horizontal"
    ? item.minimum.width
    : item.minimum.height;
}

function fitMainAxis(
  items: SizedElement[],
  available: number,
  direction: LayoutDirection
): boolean {
  if (items.length === 0) {
    return true;
  }

  const totalGap =
    Math.max(
      items.length - 1,
      0
    ) * GAP;

  const getTotal = () =>
    items.reduce(
      (total, item) =>
        total +
        getMainAxisSize(
          item,
          direction
        ),
      totalGap
    );

  if (
    getTotal() <=
    available + EPSILON
  ) {
    return true;
  }

  let remaining =
    getTotal() -
    available;

  /*
   * Higher numeric priority means lower importance.
   *
   * Therefore lower-priority elements shrink first.
   */
  const ordered =
    [...items].sort(
      (a, b) =>
        b.element.priority -
        a.element.priority
    );

  for (const item of ordered) {
    if (
      remaining <=
      EPSILON
    ) {
      break;
    }

    const current =
      getMainAxisSize(
        item,
        direction
      );

    const minimum =
      getMinimumMainAxisSize(
        item,
        direction
      );

    const shrinkable =
      Math.max(
        0,
        current - minimum
      );

    const amount =
      Math.min(
        shrinkable,
        remaining
      );

    if (
      direction ===
      "horizontal"
    ) {
      item.size.width =
        current - amount;
    } else {
      item.size.height =
        current - amount;
    }

    remaining -= amount;
  }

  return (
    remaining <=
    EPSILON
  );
}

function fitsWithinArea(
  elements: ResolvedElement[],
  area: UsableArea
): boolean {
  const right =
    area.x + area.width;

  const bottom =
    area.y + area.height;

  return elements.every(
    (element) => {
      const box =
        element.box;

      return (
        box.x >=
          area.x -
            EPSILON &&

        box.y >=
          area.y -
            EPSILON &&

        box.x +
          box.width <=
          right +
            EPSILON &&

        box.y +
          box.height <=
          bottom +
            EPSILON
      );
    }
  );
}

function hasOverlap(
  elements: ResolvedElement[]
): boolean {
  for (
    let first = 0;
    first < elements.length;
    first++
  ) {
    for (
      let second =
        first + 1;
      second < elements.length;
      second++
    ) {
      const a =
        elements[first].box;

      const b =
        elements[second].box;

      if (
        a.x <
          b.x +
            b.width -
            EPSILON &&

        a.x +
          a.width >
          b.x +
            EPSILON &&

        a.y <
          b.y +
            b.height -
            EPSILON &&

        a.y +
          a.height >
          b.y +
            EPSILON
      ) {
        return true;
      }
    }
  }

  return false;
}

function hasInvalidDimensions(
  elements: ResolvedElement[]
): boolean {
  return elements.some(
    (element) => {
      const box =
        element.box;

      return (
        !Number.isFinite(
          box.x
        ) ||

        !Number.isFinite(
          box.y
        ) ||

        !Number.isFinite(
          box.width
        ) ||

        !Number.isFinite(
          box.height
        ) ||

        box.width <= 0 ||

        box.height <= 0
      );
    }
  );
}

function satisfiesPhysicalConstraints(
  elements: ResolvedElement[],
  sourceElements: AdElement[],
  surface: SurfaceProfile
): boolean {
  return elements.every(
    (resolved) => {
      const source =
        sourceElements.find(
          (element) =>
            element.id ===
            resolved.id
        );

      if (!source) {
        return false;
      }

      const minimum =
        getMinimumPhysicalSize(
          source,
          surface
        );

      return (
        resolved.box.width >=
          minimum.width -
            EPSILON &&

        resolved.box.height >=
          minimum.height -
            EPSILON
      );
    }
  );
}

function satisfiesCtaTextWidth(
  elements: ResolvedElement[],
  sourceElements: AdElement[]
): boolean {
  return elements.every(
    (resolved) => {
      const source =
        sourceElements.find(
          (element) =>
            element.id ===
            resolved.id
        );

      if (!source) {
        return false;
      }

      if (
        source.type !== "button" ||
        source.role !== "action"
      ) {
        return true;
      }

      return (
        resolved.box.width >=
        MIN_CTA_TEXT_WIDTH -
          EPSILON
      );
    }
  );
}

function isFeasible(
  resolved: ResolvedElement[],
  sourceElements: AdElement[],
  area: UsableArea,
  surface: SurfaceProfile
): boolean {
  if (
    resolved.length !==
    sourceElements.length
  ) {
    return false;
  }

  if (
    hasInvalidDimensions(
      resolved
    )
  ) {
    return false;
  }

  if (
    !fitsWithinArea(
      resolved,
      area
    )
  ) {
    return false;
  }

  if (
    hasOverlap(
      resolved
    )
  ) {
    return false;
  }

  if (
    !satisfiesPhysicalConstraints(
      resolved,
      sourceElements,
      surface
    )
  ) {
    return false;
  }

  if (
    !satisfiesCtaTextWidth(
      resolved,
      sourceElements
    )
  ) {
    return false;
  }

  return true;
}

function createHiddenElements(
  elements: AdElement[]
): ResolvedElement[] {
  return elements.map(
    (element) => ({
      id: element.id,

      box: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      },

      visible: false,
    })
  );
}

function removeLowestPriority(
  elements: AdElement[]
): AdElement[] {
  if (
    elements.length <= 1
  ) {
    return elements;
  }

  let removeIndex = 0;

  for (
    let index = 1;
    index < elements.length;
    index++
  ) {
    const current =
      elements[index];

    const selected =
      elements[removeIndex];

    if (
      current.priority >
      selected.priority
    ) {
      removeIndex = index;
      continue;
    }

    if (
      current.priority ===
      selected.priority
    ) {
      removeIndex = index;
    }
  }

  return elements.filter(
    (_, index) =>
      index !==
      removeIndex
  );
}

function resolveVertical(
  elements: AdElement[],
  area: UsableArea,
  surface: SurfaceProfile
): ResolvedElement[] {
  const sizes =
    createSizedElements(
      elements,
      area,
      "vertical",
      surface
    );

  const fits =
    fitMainAxis(
      sizes,
      area.height,
      "vertical"
    );

  if (!fits) {
    return [];
  }

  const totalHeight =
    sizes.reduce(
      (total, item) =>
        total +
        item.size.height,
      0
    ) +
    Math.max(
      sizes.length - 1,
      0
    ) * GAP;

  if (
    totalHeight >
    area.height +
      EPSILON
  ) {
    return [];
  }

  let y =
    area.y +
    Math.max(
      0,
      (
        area.height -
        totalHeight
      ) / 2
    );

  return sizes.map(
    (item) => {
      const width =
        clamp(
          item.size.width,
          item.minimum.width,
          area.width
        );

      const height =
        clamp(
          item.size.height,
          item.minimum.height,
          area.height
        );

      const x =
        area.x +
        (
          area.width -
          width
        ) / 2;

      const result: ResolvedElement = {
        id: item.element.id,

        box: {
          x,
          y,
          width,
          height,
        },

        visible: true,

        minTextSize:
          item.element.type ===
            "text"
            ? surface.minTextSize
            : undefined,

        minTapTarget:
          item.element.type ===
            "button"
            ? surface.minTapTarget
            : undefined,
      };

      y +=
        height + GAP;

      return result;
    }
  );
}

function getInformationElements(
  elements: AdElement[]
): AdElement[] {
  return elements.filter(
    (element) =>
      element.role ===
        "primary" ||
      element.role ===
        "secondary"
  );
}

function getActionElements(
  elements: AdElement[]
): AdElement[] {
  return elements.filter(
    (element) =>
      element.role ===
        "action" ||
      element.role ===
        "branding"
  );
}

interface HorizontalRegionRequirements {
  informationPreferred: number;
  informationMinimum: number;
  heroPreferred: number;
  heroMinimum: number;
  actionPreferred: number;
  actionMinimum: number;
}

function getHorizontalRegionRequirements(
  elements: AdElement[],
  area: UsableArea,
  surface: SurfaceProfile
): HorizontalRegionRequirements {
  const information =
    getInformationElements(
      elements
    );

  const hero =
    elements.find(
      (element) =>
        element.role ===
        "hero"
    );

  const actions =
    getActionElements(
      elements
    );

  const informationSizes =
    createSizedElements(
      information,
      area,
      "horizontal",
      surface
    );

  const actionSizes =
    createSizedElements(
      actions,
      area,
      "horizontal",
      surface
    );

  const informationPreferred =
    informationSizes.reduce(
      (total, item) =>
        total +
        item.size.width,
      0
    ) +
    Math.max(
      informationSizes.length - 1,
      0
    ) * GAP;

  const informationMinimum =
    informationSizes.reduce(
      (total, item) =>
        total +
        item.minimum.width,
      0
    ) +
    Math.max(
      informationSizes.length - 1,
      0
    ) * GAP;

  const actionPreferred =
    actionSizes.reduce(
      (total, item) =>
        total +
        item.size.width,
      0
    ) +
    Math.max(
      actions.length - 1,
      0
    ) * GAP;

  const actionMinimum =
    actionSizes.reduce(
      (total, item) =>
        total +
        item.minimum.width,
      0
    ) +
    Math.max(
      actions.length - 1,
      0
    ) * GAP;

  let heroPreferred = 0;
  let heroMinimum = 0;

  if (hero) {
    const preferred =
      getPreferredFraction(
        hero,
        "horizontal"
      );

    const minimum =
      getMinimumFraction(
        hero,
        "horizontal"
      );

    const physical =
      getMinimumPhysicalSize(
        hero,
        surface
      );

    heroPreferred =
      area.width *
      preferred.width;

    heroMinimum =
      Math.max(
        area.width *
          minimum.width,
        physical.width
      );
  }

  return {
    informationPreferred,
    informationMinimum,
    heroPreferred,
    heroMinimum,
    actionPreferred,
    actionMinimum,
  };
}

function shrinkRegionWidths(
  preferred: number,
  minimum: number,
  amount: number
): {
  width: number;
  remaining: number;
} {
  const shrinkable =
    Math.max(
      0,
      preferred - minimum
    );

  const used =
    Math.min(
      shrinkable,
      amount
    );

  return {
    width:
      preferred - used,

    remaining:
      amount - used,
  };
}

function createHorizontalRegions(
  elements: AdElement[],
  area: UsableArea,
  surface: SurfaceProfile
): {
  information: Region;
  hero: Region;
  actions: Region;
} | null {
  const requirements =
    getHorizontalRegionRequirements(
      elements,
      area,
      surface
    );

  const activeRegions = [
    requirements.informationPreferred >
      EPSILON,
    requirements.heroPreferred >
      EPSILON,
    requirements.actionPreferred >
      EPSILON,
  ].filter(Boolean).length;

  const totalGaps =
    Math.max(
      activeRegions - 1,
      0
    ) * GAP;

  const available =
    Math.max(
      0,
      area.width -
        totalGaps
    );

  let informationWidth =
    requirements.informationPreferred;

  let heroWidth =
    requirements.heroPreferred;

  let actionWidth =
    requirements.actionPreferred;

  let required =
    informationWidth +
    heroWidth +
    actionWidth;

  if (
    required >
    available +
      EPSILON
  ) {
    let deficit =
      required -
      available;

    const actionShrink =
      shrinkRegionWidths(
        actionWidth,
        requirements.actionMinimum,
        deficit
      );

    actionWidth =
      actionShrink.width;

    deficit =
      actionShrink.remaining;

    if (
      deficit >
      EPSILON
    ) {
      const informationShrink =
        shrinkRegionWidths(
          informationWidth,
          requirements.informationMinimum,
          deficit
        );

      informationWidth =
        informationShrink.width;

      deficit =
        informationShrink.remaining;
    }

    if (
      deficit >
      EPSILON
    ) {
      const heroShrink =
        shrinkRegionWidths(
          heroWidth,
          requirements.heroMinimum,
          deficit
        );

      heroWidth =
        heroShrink.width;

      deficit =
        heroShrink.remaining;
    }

    if (
      deficit >
      EPSILON
    ) {
      return null;
    }

    required =
      informationWidth +
      heroWidth +
      actionWidth;
  }

  const visibleInformation =
    informationWidth >
    EPSILON;

  const visibleHero =
    heroWidth >
    EPSILON;

  const visibleActions =
    actionWidth >
    EPSILON;

  let cursor =
    area.x;

  const information: Region = {
    x: cursor,
    y: area.y,
    width: informationWidth,
    height: area.height,
  };

  if (visibleInformation) {
    cursor +=
      informationWidth +
      (
        visibleHero ||
        visibleActions
          ? GAP
          : 0
      );
  }

  const hero: Region = {
    x: cursor,
    y: area.y,
    width: heroWidth,
    height: area.height,
  };

  if (visibleHero) {
    cursor +=
      heroWidth +
      (
        visibleActions
          ? GAP
          : 0
      );
  }

  const actions: Region = {
    x: cursor,
    y: area.y,
    width: actionWidth,
    height: area.height,
  };

  return {
    information,
    hero,
    actions,
  };
}

function createResolvedElement(
  element: AdElement,
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  },
  surface?: SurfaceProfile
): ResolvedElement {
  return {
    id: element.id,

    box,

    visible: true,

    minTextSize:
      element.type === "text"
        ? surface?.minTextSize
        : undefined,

    minTapTarget:
      element.type === "button"
        ? surface?.minTapTarget
        : undefined,
  };
}

function resolveInformationGroup(
  elements: AdElement[],
  region: Region,
  surface: SurfaceProfile
): ResolvedElement[] {
  if (
    elements.length === 0 ||
    region.width <= 0 ||
    region.height <= 0
  ) {
    return [];
  }

  const aspectRatio =
    region.width /
    Math.max(
      region.height,
      MIN_SAFE_DIMENSION
    );

  if (
    aspectRatio >= 3
  ) {
    const sizes =
      createSizedElements(
        elements,
        region,
        "horizontal",
        surface
      );

    const fits =
      fitMainAxis(
        sizes,
        region.width,
        "horizontal"
      );

    if (!fits) {
      return [];
    }

    const totalWidth =
      sizes.reduce(
        (total, item) =>
          total +
          item.size.width,
        0
      ) +
      Math.max(
        sizes.length - 1,
        0
      ) * GAP;

    if (
      totalWidth >
      region.width +
        EPSILON
    ) {
      return [];
    }

    let x =
      region.x +
      Math.max(
        0,
        (
          region.width -
          totalWidth
        ) / 2
      );

    return sizes.map(
      (item) => {
        const width =
          clamp(
            item.size.width,
            item.minimum.width,
            region.width
          );

        const height =
          clamp(
            item.size.height,
            item.minimum.height,
            region.height
          );

        const y =
          region.y +
          (
            region.height -
            height
          ) / 2;

        const result =
          createResolvedElement(
            item.element,
            {
              x,
              y,
              width,
              height,
            },
            surface
          );

        x +=
          width + GAP;

        return result;
      }
    );
  }

  const sizes =
    createSizedElements(
      elements,
      region,
      "vertical",
      surface
    );

  const fits =
    fitMainAxis(
      sizes,
      region.height,
      "vertical"
    );

  if (!fits) {
    return [];
  }

  const totalHeight =
    sizes.reduce(
      (total, item) =>
        total +
        item.size.height,
      0
    ) +
    Math.max(
      sizes.length - 1,
      0
    ) * GAP;

  if (
    totalHeight >
    region.height +
      EPSILON
  ) {
    return [];
  }

  let y =
    region.y +
    Math.max(
      0,
      (
        region.height -
        totalHeight
      ) / 2
    );

  return sizes.map(
    (item) => {
      const width =
        clamp(
          item.size.width,
          item.minimum.width,
          region.width
        );

      const height =
        clamp(
          item.size.height,
          item.minimum.height,
          region.height
        );

      const x =
        region.x +
        (
          region.width -
          width
        ) / 2;

      const result =
        createResolvedElement(
          item.element,
          {
            x,
            y,
            width,
            height,
          },
          surface
        );

      y +=
        height + GAP;

      return result;
    }
  );
}

function resolveActionGroup(
  elements: AdElement[],
  region: Region,
  surface: SurfaceProfile
): ResolvedElement[] {
  if (
    elements.length === 0 ||
    region.width <= 0 ||
    region.height <= 0
  ) {
    return [];
  }

  const aspectRatio =
    region.width /
    Math.max(
      region.height,
      MIN_SAFE_DIMENSION
    );

  if (
    aspectRatio >= 2.5 &&
    elements.length > 1
  ) {
    const sizes =
      createSizedElements(
        elements,
        region,
        "horizontal",
        surface
      );

    const fits =
      fitMainAxis(
        sizes,
        region.width,
        "horizontal"
      );

    if (fits) {
      const totalWidth =
        sizes.reduce(
          (total, item) =>
            total +
            item.size.width,
          0
        ) +
        Math.max(
          sizes.length - 1,
          0
        ) * GAP;

      if (
        totalWidth <=
        region.width +
          EPSILON
      ) {
        let x =
          region.x +
          Math.max(
            0,
            (
              region.width -
              totalWidth
            ) / 2
          );

        return sizes.map(
          (item) => {
            const width =
              clamp(
                item.size.width,
                item.minimum.width,
                region.width
              );

            const height =
              clamp(
                item.size.height,
                item.minimum.height,
                region.height
              );

            const y =
              region.y +
              (
                region.height -
                height
              ) / 2;

            const result =
              createResolvedElement(
                item.element,
                {
                  x,
                  y,
                  width,
                  height,
                },
                surface
              );

            x +=
              width + GAP;

            return result;
          }
        );
      }
    }
  }

  const sizes =
    createSizedElements(
      elements,
      region,
      "vertical",
      surface
    );

  const fits =
    fitMainAxis(
      sizes,
      region.height,
      "vertical"
    );

  if (!fits) {
    return [];
  }

  const totalHeight =
    sizes.reduce(
      (total, item) =>
        total +
        item.size.height,
      0
    ) +
    Math.max(
      sizes.length - 1,
      0
    ) * GAP;

  if (
    totalHeight >
    region.height +
      EPSILON
  ) {
    return [];
  }

  let y =
    region.y +
    Math.max(
      0,
      (
        region.height -
        totalHeight
      ) / 2
    );

  return sizes.map(
    (item) => {
      const width =
        clamp(
          item.size.width,
          item.minimum.width,
          region.width
        );

      const height =
        clamp(
          item.size.height,
          item.minimum.height,
          region.height
        );

      const x =
        region.x +
        (
          region.width -
          width
        ) / 2;

      const result =
        createResolvedElement(
          item.element,
          {
            x,
            y,
            width,
            height,
          },
          surface
        );

      y +=
        height + GAP;

      return result;
    }
  );
}

function resolveAdaptiveLandscape(
  elements: AdElement[],
  area: UsableArea,
  surface: SurfaceProfile
): ResolvedElement[] | null {
  if (
    elements.length === 0 ||
    area.width <= 0 ||
    area.height <= 0
  ) {
    return null;
  }

  const hero =
    elements.find(
      (element) =>
        element.role ===
        "hero"
    );

  if (!hero) {
    return null;
  }

  const information =
    elements.filter(
      (element) =>
        element.id !== hero.id &&
        (
          element.role === "primary" ||
          element.role === "secondary"
        )
    );

  const actions =
    elements.filter(
      (element) =>
        element.id !== hero.id &&
        (
          element.role === "action" ||
          element.role === "branding"
        )
    );

  const assigned = new Set<string>([
    hero.id,
    ...information.map(
      (element) => element.id
    ),
    ...actions.map(
      (element) => element.id
    ),
  ]);

  const unassigned =
    elements.filter(
      (element) =>
        !assigned.has(
          element.id
        )
    );

  if (unassigned.length > 0) {
    return null;
  }

  const informationSizes =
    createSizedElements(
      information,
      area,
      "horizontal",
      surface
    );

  const actionSizes =
    createSizedElements(
      actions,
      area,
      "horizontal",
      surface
    );

  const heroPreferred =
    getPreferredFraction(
      hero,
      "horizontal"
    );

  const heroMinimum =
    getMinimumFraction(
      hero,
      "horizontal"
    );

  const heroPhysical =
    getMinimumPhysicalSize(
      hero,
      surface
    );

  const heroPreferredWidth =
    area.width *
    heroPreferred.width;

  const heroMinimumWidth =
    Math.max(
      area.width *
        heroMinimum.width,
      heroPhysical.width
    );

  const informationPreferredWidth =
    informationSizes.length === 0
      ? 0
      : Math.max(
          ...informationSizes.map(
            (item) =>
              item.size.width
          )
        );

  const informationMinimumWidth =
    informationSizes.length === 0
      ? 0
      : Math.max(
          ...informationSizes.map(
            (item) =>
              item.minimum.width
          )
        );

  const actionPreferredWidth =
    actionSizes.length === 0
      ? 0
      : Math.max(
          ...actionSizes.map(
            (item) =>
              item.size.width
          )
        );

  const actionMinimumWidth =
    actionSizes.length === 0
      ? 0
      : Math.max(
          ...actionSizes.map(
            (item) =>
              item.minimum.width
          )
        );

  const columnCount =
    Number(information.length > 0) +
    Number(true) +
    Number(actions.length > 0);

  const columnGaps =
    Math.max(
      0,
      columnCount - 1
    ) * GAP;

  const minimumTotalWidth =
    informationMinimumWidth +
    heroMinimumWidth +
    actionMinimumWidth +
    columnGaps;

  if (
    minimumTotalWidth >
    area.width + EPSILON
  ) {
    return null;
  }

  let informationWidth =
    informationPreferredWidth;

  let heroWidth =
    heroPreferredWidth;

  let actionWidth =
    actionPreferredWidth;

  const preferredTotal =
    informationWidth +
    heroWidth +
    actionWidth +
    columnGaps;

  let deficit = Math.max(
    0,
    preferredTotal -
      area.width
  );

  if (
    deficit > EPSILON &&
    actions.length > 0
  ) {
    const shrinkable =
      Math.max(
        0,
        actionWidth -
          actionMinimumWidth
      );

    const amount = Math.min(
      shrinkable,
      deficit
    );

    actionWidth -= amount;
    deficit -= amount;
  }

  if (
    deficit > EPSILON &&
    information.length > 0
  ) {
    const shrinkable =
      Math.max(
        0,
        informationWidth -
          informationMinimumWidth
      );

    const amount = Math.min(
      shrinkable,
      deficit
    );

    informationWidth -= amount;
    deficit -= amount;
  }

  if (
    deficit > EPSILON
  ) {
    const shrinkable =
      Math.max(
        0,
        heroWidth -
          heroMinimumWidth
      );

    const amount = Math.min(
      shrinkable,
      deficit
    );

    heroWidth -= amount;
    deficit -= amount;
  }

  if (
    deficit > EPSILON
  ) {
    return null;
  }

  const actualTotalWidth =
    informationWidth +
    heroWidth +
    actionWidth +
    columnGaps;

  if (
    actualTotalWidth >
    area.width + EPSILON
  ) {
    return null;
  }

  const extraWidth = Math.max(
    0,
    area.width -
      actualTotalWidth
  );

  if (information.length > 0) {
    informationWidth +=
      extraWidth;
  } else if (actions.length > 0) {
    actionWidth +=
      extraWidth;
  } else {
    heroWidth +=
      extraWidth;
  }

  const columns: Array<{
    x: number;
    width: number;
  }> = [];

  let columnX = area.x;

  if (information.length > 0) {
    columns.push({
      x: columnX,
      width: informationWidth,
    });

    columnX +=
      informationWidth +
      GAP;
  }

  columns.push({
    x: columnX,
    width: heroWidth,
  });

  columnX +=
    heroWidth;

  if (actions.length > 0) {
    columnX += GAP;

    columns.push({
      x: columnX,
      width: actionWidth,
    });
  }

  const informationColumn =
    information.length > 0
      ? columns[0]
      : undefined;

  const heroColumn =
    columns[
      information.length > 0
        ? 1
        : 0
    ];

  const actionColumn =
    actions.length > 0
      ? columns[
          information.length > 0
            ? 2
            : 1
        ]
      : undefined;

  const result: ResolvedElement[] = [];

  const resolveColumn = (
    sized: SizedElement[],
    column: {
      x: number;
      width: number;
    }
  ): ResolvedElement[] | null => {
    if (sized.length === 0) {
      return [];
    }

    const totalGap =
      Math.max(
        0,
        sized.length - 1
      ) * GAP;

    const preferredHeight =
      sized.reduce(
        (total, item) =>
          total +
          item.size.height,
        0
      ) + totalGap;

    const minimumHeight =
      sized.reduce(
        (total, item) =>
          total +
          item.minimum.height,
        0
      ) + totalGap;

    if (
      minimumHeight >
      area.height + EPSILON
    ) {
      return null;
    }

    let remainingShrink =
      Math.max(
        0,
        preferredHeight -
          area.height
      );

    const shrinkOrder =
      [...sized].sort(
        (a, b) =>
          b.element.priority -
          a.element.priority
      );

    for (
      const item of shrinkOrder
    ) {
      if (
        remainingShrink <=
        EPSILON
      ) {
        break;
      }

      const shrinkable =
        Math.max(
          0,
          item.size.height -
            item.minimum.height
        );

      const amount =
        Math.min(
          shrinkable,
          remainingShrink
        );

      item.size.height -=
        amount;

      remainingShrink -=
        amount;
    }

    if (
      remainingShrink >
      EPSILON
    ) {
      return null;
    }

    const totalHeight =
      sized.reduce(
        (total, item) =>
          total +
          item.size.height,
        0
      ) + totalGap;

    let y =
      area.y +
      Math.max(
        0,
        (
          area.height -
          totalHeight
        ) / 2
      );

    return sized.map(
      (item) => {
        const width = clamp(
          item.size.width,
          Math.min(
            item.minimum.width,
            column.width
          ),
          column.width
        );

        const height = clamp(
          item.size.height,
          Math.min(
            item.minimum.height,
            area.height
          ),
          area.height
        );

        const x = clamp(
          column.x +
            (
              column.width -
              width
            ) / 2,
          area.x,
          area.x +
            area.width -
            width
        );

        const safeY = clamp(
          y,
          area.y,
          area.y +
            area.height -
            height
        );

        const resolved =
          createResolvedElement(
            item.element,
            {
              x,
              y: safeY,
              width,
              height,
            },
            surface
          );

        y =
          safeY +
          height +
          GAP;

        return resolved;
      }
    );
  };

  if (
    informationColumn
  ) {
    const resolvedInformation =
      resolveColumn(
        informationSizes,
        informationColumn
      );

    if (!resolvedInformation) {
      return null;
    }

    result.push(
      ...resolvedInformation
    );
  }

  const heroHeight = clamp(
    area.height *
      heroPreferred.height,
    Math.min(
      Math.max(
        area.height *
          heroMinimum.height,
        heroPhysical.height
      ),
      area.height
    ),
    area.height
  );

  const heroResolvedWidth =
    clamp(
      heroWidth,
      Math.min(
        heroMinimumWidth,
        heroColumn.width
      ),
      heroColumn.width
    );

  const heroX = clamp(
    heroColumn.x +
      (
        heroColumn.width -
        heroResolvedWidth
      ) / 2,
    area.x,
    area.x +
      area.width -
      heroResolvedWidth
  );

  const heroY = clamp(
    area.y +
      (
        area.height -
        heroHeight
      ) / 2,
    area.y,
    area.y +
      area.height -
      heroHeight
  );

  result.push(
    createResolvedElement(
      hero,
      {
        x: heroX,
        y: heroY,
        width:
          heroResolvedWidth,
        height: heroHeight,
      },
      surface
    )
  );

  if (actionColumn) {
    const resolvedActions =
      resolveColumn(
        actionSizes,
        actionColumn
      );

    if (!resolvedActions) {
      return null;
    }

    result.push(
      ...resolvedActions
    );
  }

  const sorted =
    [...result].sort(
      (a, b) => {
        if (
          Math.abs(
            a.box.x - b.box.x
          ) > EPSILON
        ) {
          return (
            a.box.x -
            b.box.x
          );
        }

        return (
          a.box.y -
          b.box.y
        );
      }
    );

  if (
    sorted.length !==
      elements.length ||
    hasInvalidDimensions(
      sorted
    ) ||
    !fitsWithinArea(
      sorted,
      area
    ) ||
    hasOverlap(sorted) ||
    !satisfiesPhysicalConstraints(
      sorted,
      elements,
      surface
    ) ||
    !satisfiesCtaTextWidth(
      sorted,
      elements
    )
  ) {
    return null;
  }

  return sorted;
}

function resolveHorizontal(
  elements: AdElement[],
  area: UsableArea,
  surface: SurfaceProfile
): ResolvedElement[] {
  if (surface.allowAdaptiveLandscapeComposition) {
    const adaptive =
      resolveAdaptiveLandscape(
        elements,
        area,
        surface
      );

    if (adaptive) {
      return adaptive;
    }
  }

  const regions =
    createHorizontalRegions(
      elements,
      area,
      surface
    );

  if (!regions) {
    return [];
  }

  const hero =
    elements.find(
      (element) =>
        element.role ===
        "hero"
    );

  const information =
    getInformationElements(
      elements
    );

  const actions =
    getActionElements(
      elements
    );

  const result:
    ResolvedElement[] = [];

  result.push(
    ...resolveInformationGroup(
      information,
      regions.information,
      surface
    )
  );

  if (hero) {
    const preferred =
      getPreferredFraction(
        hero,
        "horizontal"
      );

    const minimum =
      getMinimumFraction(
        hero,
        "horizontal"
      );

    const physicalMinimum =
      getMinimumPhysicalSize(
        hero,
        surface
      );

    const heroMinimumWidth =
      Math.max(
        regions.hero.width *
          minimum.width,
        physicalMinimum.width
      );

    if (
      regions.hero.width <
      heroMinimumWidth -
        EPSILON
    ) {
      return [];
    }

    const heroWidth =
      clamp(
        regions.hero.width,
        heroMinimumWidth,
        regions.hero.width
      );

    const heroHeight =
      clamp(
        area.height *
          preferred.height,
        Math.max(
          area.height *
            minimum.height,
          physicalMinimum.height
        ),
        area.height
      );

    result.push({
      id: hero.id,

      box: {
        x:
          regions.hero.x,

        y:
          regions.hero.y +
          (
            regions.hero.height -
            heroHeight
          ) / 2,

        width:
          heroWidth,

        height:
          heroHeight,
      },

      visible: true,

      minTextSize:
        undefined,

      minTapTarget:
        undefined,
    });
  }

  result.push(
    ...resolveActionGroup(
      actions,
      regions.actions,
      surface
    )
  );

  return result;
}

function resolveBalanced(
  elements: AdElement[],
  area: UsableArea,
  surface: SurfaceProfile
): ResolvedElement[] {
  const hero =
    elements.find(
      (element) =>
        element.role ===
        "hero"
    );

  if (!hero) {
    return resolveVertical(
      elements,
      area,
      surface
    );
  }

  const minimumCompositionWidth =
    120;

  const minimumCompositionHeight =
    120;

  if (
    area.width <
      minimumCompositionWidth ||
    area.height <
      minimumCompositionHeight
  ) {
    return [];
  }

  const heroRegionWidth =
    clamp(
      area.width * 0.46,
      area.width * 0.32,
      area.width * 0.55
    );

  const informationWidth =
    Math.max(
      1,
      area.width -
        heroRegionWidth -
        GAP
    );

  const informationRegion = {
    x: area.x,
    y: area.y,
    width: informationWidth,
    height: area.height,
  };

  const heroRegion = {
    x:
      area.x +
      informationWidth +
      GAP,

    y: area.y,

    width:
      heroRegionWidth,

    height: area.height,
  };

  const nonHero =
    elements.filter(
      (element) =>
        element.id !==
        hero.id
    );

  const result:
    ResolvedElement[] = [];

  result.push(
    ...resolveInformationGroup(
      nonHero,
      informationRegion,
      surface
    )
  );

  if (
    result.length !==
    nonHero.length
  ) {
    return [];
  }

  const preferred =
    getPreferredFraction(
      hero,
      "balanced"
    );

  const minimum =
    getMinimumFraction(
      hero,
      "balanced"
    );

  const physicalMinimum =
    getMinimumPhysicalSize(
      hero,
      surface
    );

  const heroMinimumWidth =
    Math.max(
      heroRegion.width *
        minimum.width,
      physicalMinimum.width
    );

  if (
    heroRegion.width <
    heroMinimumWidth -
      EPSILON
  ) {
    return [];
  }

  const resolvedHeroWidth =
    clamp(
      heroRegion.width *
        preferred.width,
      heroMinimumWidth,
      heroRegion.width
    );

  const heroHeight =
    clamp(
      area.height *
        preferred.height,
      Math.max(
        area.height *
          minimum.height,
        physicalMinimum.height
      ),
      area.height
    );

  result.push({
    id: hero.id,

    box: {
      x:
        heroRegion.x +
        (
          heroRegion.width -
          resolvedHeroWidth
        ) / 2,

      y:
        heroRegion.y +
        (
          heroRegion.height -
          heroHeight
        ) / 2,

      width:
        resolvedHeroWidth,

      height:
        heroHeight,
    },

    visible: true,

    minTextSize:
      undefined,

    minTapTarget:
      undefined,
  });

  return result;
}

function resolveVisibleElements(
  elements: AdElement[],
  area: UsableArea,
  direction: LayoutDirection,
  surface: SurfaceProfile
): ResolvedElement[] {
  if (
    direction ===
    "vertical"
  ) {
    return resolveVertical(
      elements,
      area,
      surface
    );
  }

  if (
    direction ===
    "horizontal"
  ) {
    return resolveHorizontal(
      elements,
      area,
      surface
    );
  }

  return resolveBalanced(
    elements,
    area,
    surface
  );
}

export function resolveLayout(
  elements: AdElement[],
  surface: SurfaceProfile
): ResolvedLayout {
  if (
    elements.length === 0
  ) {
    return {
      elements: [],
    };
  }

  const area =
    getUsableArea(
      surface
    );

  const direction =
    getLayoutDirection(
      surface
    );

  let remaining =
    [...elements];

  /*
   * Constraint-based degradation:
   *
   * 1. Try all elements.
   * 2. Shrink lower-priority elements toward minimum sizes.
   * 3. Recalculate the composition.
   * 4. If still infeasible, remove the lowest-priority element.
   * 5. Recalculate again.
   *
   * This allows low-priority elements such as branding to
   * shrink before they are removed.
   */
  while (
    remaining.length > 0
  ) {
    const resolved =
      resolveVisibleElements(
        remaining,
        area,
        direction,
        surface
      );

    const feasible =
      isFeasible(
        resolved,
        remaining,
        area,
        surface
      );

    if (feasible) {
      const visibleIds =
        new Set(
          resolved.map(
            (element) =>
              element.id
          )
        );

      const hidden =
        elements.filter(
          (element) =>
            !visibleIds.has(
              element.id
            )
        );

      return {
        elements: [
          ...resolved,
          ...createHiddenElements(
            hidden
          ),
        ],
      };
    }

    const next =
      removeLowestPriority(
        remaining
      );

    if (
      next.length >=
      remaining.length
    ) {
      break;
    }

    remaining =
      next;
  }

  /*
   * Final safety fallback:
   *
   * Keep the highest-priority element if the complete
   * composition cannot be resolved.
   */
  if (
    area.width > 0 &&
    area.height > 0
  ) {
    const highestPriority =
      [...elements].sort(
        (a, b) =>
          a.priority -
          b.priority
      )[0];

    const fallback =
      resolveVisibleElements(
        [highestPriority],
        area,
        direction,
        surface
      );

    if (
      fallback.length > 0 &&
      !hasInvalidDimensions(
        fallback
      ) &&
      fitsWithinArea(
        fallback,
        area
      ) &&
      satisfiesPhysicalConstraints(
        fallback,
        [highestPriority],
        surface
      ) &&
      satisfiesCtaTextWidth(
        fallback,
        [highestPriority]
      )
    ) {
      const hidden =
        elements.filter(
          (element) =>
            element.id !==
            highestPriority.id
        );

      return {
        elements: [
          ...fallback,
          ...createHiddenElements(
            hidden
          ),
        ],
      };
    }
  }

  return {
    elements:
      createHiddenElements(
        elements
      ),
  };
}