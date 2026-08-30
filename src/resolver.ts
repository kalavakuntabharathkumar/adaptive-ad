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

const GAP = 16;

function getLayoutDirection(
  surface: SurfaceProfile
): LayoutDirection {
  const aspectRatio = surface.width / surface.height;

  if (aspectRatio < 0.8) {
    return "vertical";
  }

  if (aspectRatio > 1.5) {
    return "horizontal";
  }

  return "balanced";
}

function getUsableArea(
  surface: SurfaceProfile
): UsableArea {
  const safeArea = surface.safeArea ?? {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };

  return {
    x: safeArea.left,
    y: safeArea.top,
    width:
      surface.width -
      safeArea.left -
      safeArea.right,
    height:
      surface.height -
      safeArea.top -
      safeArea.bottom,
  };
}

function getInitialSize(element: AdElement) {
  switch (element.role) {
    case "hero":
      return {
        width: 0.6,
        height: 0.4,
      };

    case "primary":
      return {
        width: 0.8,
        height: 0.15,
      };

    case "action":
      return {
        width: 0.3,
        height: 0.1,
      };

    case "branding":
      return {
        width: 0.25,
        height: 0.08,
      };

    case "secondary":
      return {
        width: 0.4,
        height: 0.08,
      };
  }
}

function getMinimumSize(element: AdElement) {
  switch (element.role) {
    case "hero":
      return {
        width: 0.35,
        height: 0.25,
      };

    case "primary":
      return {
        width: 0.5,
        height: 0.1,
      };

    case "action":
      return {
        width: 0.25,
        height: 0.08,
      };

    case "branding":
      return {
        width: 0.15,
        height: 0.05,
      };

    case "secondary":
      return {
        width: 0.3,
        height: 0.06,
      };
  }
}

function shrinkSizes(
  elements: AdElement[],
  usableArea: UsableArea,
  direction: LayoutDirection
) {
  const sizes = elements.map((element) => ({
    element,
    size: getInitialSize(element),
    minimum: getMinimumSize(element),
  }));

  const availableSpace =
    direction === "horizontal"
      ? usableArea.width
      : usableArea.height;

  const totalGap =
    Math.max(elements.length - 1, 0) * GAP;

  const getRequiredSpace = () =>
    sizes.reduce((total, item) => {
      const dimension =
        direction === "horizontal"
          ? item.size.width
          : item.size.height;

      const availableDimension =
        direction === "horizontal"
          ? usableArea.width
          : usableArea.height;

      return total + dimension * availableDimension;
    }, 0) + totalGap;

  while (getRequiredSpace() > availableSpace) {
    let changed = false;

    for (const item of sizes) {
      const current =
        direction === "horizontal"
          ? item.size.width
          : item.size.height;

      const minimum =
        direction === "horizontal"
          ? item.minimum.width
          : item.minimum.height;

      if (current > minimum) {
        const next = Math.max(
          minimum,
          current - 0.05
        );

        if (direction === "horizontal") {
          item.size.width = next;
        } else {
          item.size.height = next;
        }

        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }

  return sizes;
}

function removeLowestPriority(
  elements: AdElement[]
): AdElement[] {
  if (elements.length === 0) {
    return elements;
  }

  const lowestPriority = Math.min(
    ...elements.map((element) => element.priority)
  );

  const indexToRemove = elements.findIndex(
    (element) =>
      element.priority === lowestPriority
  );

  if (indexToRemove === -1) {
    return elements;
  }

  return elements.filter(
    (_, index) => index !== indexToRemove
  );
}

function resolveVisibleElements(
  elements: AdElement[],
  usableArea: UsableArea,
  direction: LayoutDirection
): ResolvedElement[] {
  const sizes = shrinkSizes(
    elements,
    usableArea,
    direction
  );

  let currentX = usableArea.x;
  let currentY = usableArea.y;

  const resolvedElements: ResolvedElement[] = [];

  for (const item of sizes) {
    const { element, size } = item;

    const width =
      usableArea.width * size.width;

    const height =
      usableArea.height * size.height;

    const resolvedElement: ResolvedElement = {
      id: element.id,
      box: {
        x: currentX,
        y: currentY,
        width,
        height,
      },
      visible: true,
    };

    resolvedElements.push(resolvedElement);

    if (direction === "vertical") {
      currentY += height + GAP;
    }

    if (direction === "horizontal") {
      currentX += width + GAP;
    }

    if (direction === "balanced") {
      currentY += height + GAP;
    }
  }

  return resolvedElements;
}

export function resolveLayout(
  elements: AdElement[],
  surface: SurfaceProfile
): ResolvedLayout {
  const direction = getLayoutDirection(surface);
  const usableArea = getUsableArea(surface);

  let remainingElements = [...elements];

  while (remainingElements.length > 0) {
    const resolvedElements = resolveVisibleElements(
      remainingElements,
      usableArea,
      direction
    );

    const lastElement =
      resolvedElements[resolvedElements.length - 1];

    const requiredSpace =
      direction === "horizontal"
        ? lastElement.box.x +
          lastElement.box.width -
          usableArea.x
        : lastElement.box.y +
          lastElement.box.height -
          usableArea.y;

    const availableSpace =
      direction === "horizontal"
        ? usableArea.width
        : usableArea.height;

    if (requiredSpace <= availableSpace) {
      return {
        elements: resolvedElements,
      };
    }

    const nextElements =
      removeLowestPriority(
        remainingElements
      );

    if (
      nextElements.length ===
      remainingElements.length
    ) {
      break;
    }

    remainingElements = nextElements;
  }

  return {
    elements: remainingElements.map(
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
    ),
  };
}