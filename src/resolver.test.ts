
import { resolveLayout } from "./resolver";
import { surfaces } from "./surfaces";
import { adSpec } from "./spec";

type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Surface = {
  width: number;
  height: number;
  safeArea?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  minTapTarget?: number;
  minTextSize?: number;
  touchOnly?: boolean;
  allowAdaptiveLandscapeComposition?: boolean;
};

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`TEST FAILED: ${message}`);
  }
}

function boxesOverlap(first: Box, second: Box): boolean {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

function getVisibleElements(result: ReturnType<typeof resolveLayout>) {
  return result.elements.filter((element) => element.visible);
}

function getSafeArea(surface: Surface) {
  return surface.safeArea ?? {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };
}

function assertWithinSafeArea(
  element: { box: Box },
  surface: Surface,
  message = ""
): void {
  const safeArea = getSafeArea(surface);
  const right = surface.width - safeArea.right;
  const bottom = surface.height - safeArea.bottom;
  const { x, y, width, height } = element.box;

  assert(
    x >= safeArea.left,
    `${message}element starts outside left safe area`
  );

  assert(
    y >= safeArea.top,
    `${message}element starts outside top safe area`
  );

  assert(
    x + width <= right,
    `${message}element exceeds right safe area`
  );

  assert(
    y + height <= bottom,
    `${message}element exceeds bottom safe area`
  );
}

function assertNoOverlap(
  elements: { box: Box }[],
  message: string
): void {
  for (let first = 0; first < elements.length; first++) {
    for (let second = first + 1; second < elements.length; second++) {
      assert(
        !boxesOverlap(elements[first].box, elements[second].box),
        message
      );
    }
  }
}

function validateResolvedLayout(
  result: ReturnType<typeof resolveLayout>,
  surface: Surface,
  message = ""
): void {
  const visible = getVisibleElements(result);

  for (const element of result.elements) {
    assert(
      element.box.width >= 0,
      `${message}width cannot be negative`
    );

    assert(
      element.box.height >= 0,
      `${message}height cannot be negative`
    );
  }

  for (const element of visible) {
    assertWithinSafeArea(element, surface, message);
  }

  assertNoOverlap(
    visible,
    `${message}visible elements should not overlap`
  );
}

function validateSurface(name: keyof typeof surfaces): void {
  const surface = surfaces[name];
  const result = resolveLayout(adSpec.elements, surface);

  assert(
    result.elements.length > 0,
    `${name}: resolver should return elements`
  );

  validateResolvedLayout(result, surface, `${name}: `);

  console.log(`PASS: ${name}`);
}

function validatePortraitSurface(): void {
  const result = resolveLayout(
    adSpec.elements,
    surfaces.mobilePortrait
  );

  const visible = getVisibleElements(result);

  for (let index = 1; index < visible.length; index++) {
    assert(
      visible[index].box.y >= visible[index - 1].box.y,
      "portrait layout should progress vertically"
    );
  }

  console.log("PASS: portrait direction");
}

function validateLandscapeSurface(): void {
  const result = resolveLayout(
    adSpec.elements,
    surfaces.mobileLandscape
  );

  const visible = getVisibleElements(result);

  for (let index = 1; index < visible.length; index++) {
    assert(
      visible[index].box.x >= visible[index - 1].box.x,
      "landscape layout should progress horizontally"
    );
  }

  console.log("PASS: landscape direction");
}

function validateLandscapeAdaptiveComposition(): void {
  const testSurfaces: Surface[] = [
    {
      width: 480,
      height: 320,
      safeArea: {
        top: 16,
        right: 16,
        bottom: 16,
        left: 16,
      },
      minTapTarget: 44,
      minTextSize: 16,
      allowAdaptiveLandscapeComposition: true,
    },
    {
      width: 800,
      height: 320,
      safeArea: {
        top: 16,
        right: 16,
        bottom: 16,
        left: 16,
      },
      minTapTarget: 44,
      minTextSize: 16,
      allowAdaptiveLandscapeComposition: true,
    },
    {
      width: 640,
      height: 240,
      safeArea: {
        top: 12,
        right: 12,
        bottom: 12,
        left: 12,
      },
      minTapTarget: 44,
      minTextSize: 16,
      allowAdaptiveLandscapeComposition: true,
    },
    {
      width: 1200,
      height: 600,
      safeArea: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
      minTapTarget: 44,
      minTextSize: 16,
      allowAdaptiveLandscapeComposition: true,
    },
  ];

  for (const surface of testSurfaces) {
    const result = resolveLayout(adSpec.elements, surface);

    const logo = result.elements.find(
      (element) => element.id === "logo"
    );

    assert(
      logo?.visible === true,
      "feasible adaptive landscape should keep logo visible"
    );

    validateResolvedLayout(
      result,
      surface,
      "adaptive landscape: "
    );
  }

  const tooSmall: Surface = {
    width: 100,
    height: 80,
    safeArea: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    minTapTarget: 44,
    minTextSize: 16,
    allowAdaptiveLandscapeComposition: true,
  };

  const result = resolveLayout(adSpec.elements, tooSmall);

  const logo = result.elements.find(
    (element) => element.id === "logo"
  );

  assert(
    logo?.visible === false,
    "genuinely infeasible landscape should still remove the logo"
  );

  console.log("PASS: adaptive landscape composition");
}

function validateBalancedSurface(): void {
  const result = resolveLayout(
    adSpec.elements,
    surfaces.retailKiosk
  );

  assert(
    result.elements.length > 0,
    "balanced surface should produce a layout"
  );

  console.log("PASS: balanced surface");
}

function validateEmptyLayout(): void {
  const result = resolveLayout([], surfaces.mobilePortrait);

  assert(
    result.elements.length === 0,
    "empty element list should produce empty layout"
  );

  console.log("PASS: empty layout");
}

function validateSingleElement(): void {
  const result = resolveLayout(
    [adSpec.elements[0]],
    surfaces.mobilePortrait
  );

  assert(
    result.elements.length === 1,
    "single element should produce one resolved element"
  );

  assert(
    result.elements[0].visible === true,
    "single element should remain visible"
  );

  console.log("PASS: single element");
}

function validateManyElements(): void {
  const manyElements = [
    ...adSpec.elements,
    ...adSpec.elements.map((element, index) => ({
      ...element,
      id: `${element.id}-copy-${index}`,
      priority: 3 as const,
    })),
  ];

  const result = resolveLayout(
    manyElements,
    surfaces.mobilePortrait
  );

  assert(
    result.elements.length > 0,
    "many elements should produce a resolved layout"
  );

  console.log("PASS: many elements");
}

function validateNoSafeArea(): void {
  const surface: Surface = {
    width: 1080,
    height: 1080,
  };

  const result = resolveLayout(adSpec.elements, surface);

  for (const element of getVisibleElements(result)) {
    assert(
      element.box.x >= 0,
      "no-safe-area surface should allow x >= 0"
    );

    assert(
      element.box.y >= 0,
      "no-safe-area surface should allow y >= 0"
    );
  }

  console.log("PASS: no safe-area surface");
}

function validateMinimumSizes(): void {
  const surface: Surface = {
    width: 100,
    height: 100,
    safeArea: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
  };

  const result = resolveLayout(adSpec.elements, surface);

  for (const element of result.elements) {
    assert(
      element.box.width >= 0,
      "minimum-size degradation cannot create negative width"
    );

    assert(
      element.box.height >= 0,
      "minimum-size degradation cannot create negative height"
    );
  }

  console.log("PASS: minimum sizes");
}

function validatePriorityDegradation(): void {
  const surface: Surface = {
    width: 100,
    height: 100,
    safeArea: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
  };

  const result = resolveLayout(adSpec.elements, surface);
  const visible = getVisibleElements(result);

  assert(
    visible.length < adSpec.elements.length,
    "very small surface should trigger priority degradation"
  );

  console.log("PASS: priority degradation");
}

function validateNoNegativeCoordinates(): void {
  const testSurfaces = [
    surfaces.mobilePortrait,
    surfaces.mobileLandscape,
    surfaces.broadcastLowerThird,
    surfaces.retailKiosk,
  ];

  for (const surface of testSurfaces) {
    for (const element of getVisibleElements(
      resolveLayout(adSpec.elements, surface)
    )) {
      assert(
        element.box.x >= 0,
        "visible element cannot have negative x"
      );

      assert(
        element.box.y >= 0,
        "visible element cannot have negative y"
      );
    }
  }

  console.log("PASS: no negative coordinates");
}

function validateNoOverflow(): void {
  const testSurfaces = [
    surfaces.mobilePortrait,
    surfaces.mobileLandscape,
    surfaces.broadcastLowerThird,
    surfaces.retailKiosk,
  ];

  for (const surface of testSurfaces) {
    const result = resolveLayout(adSpec.elements, surface);

    for (const element of getVisibleElements(result)) {
      assertWithinSafeArea(
        element,
        surface,
        "overflow: "
      );
    }
  }

  console.log("PASS: no overflow");
}

function validateNoOverlap(): void {
  const testSurfaces = [
    surfaces.mobilePortrait,
    surfaces.mobileLandscape,
    surfaces.broadcastLowerThird,
    surfaces.retailKiosk,
  ];

  for (const surface of testSurfaces) {
    const visible = getVisibleElements(
      resolveLayout(adSpec.elements, surface)
    );

    assertNoOverlap(
      visible,
      "visible elements must not overlap"
    );
  }

  console.log("PASS: no overlap");
}

function validateTouchOnlySurface(): void {
  const DEFAULT_TOUCH_MIN_TARGET = 44;

  const touchOnlyNoExplicitTarget: Surface = {
    width: 1080,
    height: 1080,
    safeArea: {
      top: 24,
      right: 24,
      bottom: 24,
      left: 24,
    },
    touchOnly: true,
  };

  const result = resolveLayout(
    adSpec.elements,
    touchOnlyNoExplicitTarget
  );

  const cta = result.elements.find(
    (element) => element.id === "cta"
  );

  assert(
    cta?.visible === true,
    "touch-only surface should keep the CTA visible"
  );

  assert(
    cta !== undefined &&
      cta.box.width >= DEFAULT_TOUCH_MIN_TARGET,
    "touch-only surface without an explicit minTapTarget must enforce minimum tap width"
  );

  assert(
    cta !== undefined &&
      cta.box.height >= DEFAULT_TOUCH_MIN_TARGET,
    "touch-only surface without an explicit minTapTarget must enforce minimum tap height"
  );

  assert(
    cta?.minTapTarget === DEFAULT_TOUCH_MIN_TARGET,
    "touch-only surface without an explicit minTapTarget should report the default touch minimum"
  );

  const touchOnlyWithExplicitTarget: Surface = {
    width: 1080,
    height: 1080,
    safeArea: {
      top: 24,
      right: 24,
      bottom: 24,
      left: 24,
    },
    touchOnly: true,
    minTapTarget: 60,
  };

  const explicitResult = resolveLayout(
    adSpec.elements,
    touchOnlyWithExplicitTarget
  );

  const explicitCta = explicitResult.elements.find(
    (element) => element.id === "cta"
  );

  assert(
    explicitCta?.minTapTarget === 60,
    "explicit minTapTarget must override touch-only default"
  );

  const notTouchOnly: Surface = {
    width: 1080,
    height: 1080,
    safeArea: {
      top: 24,
      right: 24,
      bottom: 24,
      left: 24,
    },
  };

  const notTouchOnlyResult = resolveLayout(
    adSpec.elements,
    notTouchOnly
  );

  const notTouchOnlyCta =
    notTouchOnlyResult.elements.find(
      (element) => element.id === "cta"
    );

  assert(
    notTouchOnlyCta?.minTapTarget === undefined,
    "non-touch surface without explicit minTapTarget should not invent a tap constraint"
  );

  console.log("PASS: touch-only surface");
}

function validateUnknownFifthSurface(): void {
  const surface: Surface = {
    width: 700,
    height: 300,
    safeArea: {
      top: 10,
      right: 10,
      bottom: 10,
      left: 10,
    },
    minTextSize: 28,
    minTapTarget: 48,
  };

  const result = resolveLayout(adSpec.elements, surface);

  assert(
    result.elements.length > 0,
    "unknown fifth surface should produce a layout"
  );

  validateResolvedLayout(
    result,
    surface,
    "unknown fifth surface: "
  );

  console.log("PASS: unknown fifth surface");
}

validateSurface("mobilePortrait");
validateSurface("mobileLandscape");
validateSurface("broadcastLowerThird");
validateSurface("retailKiosk");

validatePortraitSurface();
validateLandscapeSurface();
validateLandscapeAdaptiveComposition();
validateBalancedSurface();

validateEmptyLayout();
validateSingleElement();
validateManyElements();

validateNoSafeArea();
validateMinimumSizes();
validatePriorityDegradation();

validateNoNegativeCoordinates();
validateNoOverflow();
validateNoOverlap();

validateTouchOnlySurface();
validateUnknownFifthSurface();

console.log("All resolver validation checks passed.");
