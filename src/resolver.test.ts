
import { resolveLayout } from "./resolver";
import { surfaces } from "./surfaces";
import { adSpec } from "./spec";

function assert(
  condition: boolean,
  message: string
): void {
  if (!condition) {
    throw new Error(`TEST FAILED: ${message}`);
  }
}

function boxesOverlap(
  first: {
    x: number;
    y: number;
    width: number;
    height: number;
  },
  second: {
    x: number;
    y: number;
    width: number;
    height: number;
  }
): boolean {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

function validateSurface(
  name: keyof typeof surfaces
): void {
  const surface = surfaces[name];

  const result = resolveLayout(
    adSpec.elements,
    surface
  );

  assert(
    result.elements.length > 0,
    `${name}: resolver should return elements`
  );

  const safeArea = surface.safeArea ?? {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };

  const usableRight =
    surface.width - safeArea.right;

  const usableBottom =
    surface.height - safeArea.bottom;

  for (const element of result.elements) {
    const {
      x,
      y,
      width,
      height,
    } = element.box;

    assert(
      width >= 0,
      `${name}: width cannot be negative`
    );

    assert(
      height >= 0,
      `${name}: height cannot be negative`
    );

    if (element.visible) {
      assert(
        x >= safeArea.left,
        `${name}: element starts outside left safe area`
      );

      assert(
        y >= safeArea.top,
        `${name}: element starts outside top safe area`
      );

      assert(
        x + width <= usableRight,
        `${name}: element exceeds right safe area`
      );

      assert(
        y + height <= usableBottom,
        `${name}: element exceeds bottom safe area`
      );
    }
  }

  const visibleElements =
    result.elements.filter(
      (element) => element.visible
    );

  for (
    let firstIndex = 0;
    firstIndex < visibleElements.length;
    firstIndex++
  ) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < visibleElements.length;
      secondIndex++
    ) {
      assert(
        !boxesOverlap(
          visibleElements[firstIndex].box,
          visibleElements[secondIndex].box
        ),
        `${name}: visible elements should not overlap`
      );
    }
  }

  console.log(`PASS: ${name}`);
}

function validatePortraitSurface(): void {
  const result = resolveLayout(
    adSpec.elements,
    surfaces.mobilePortrait
  );

  const visibleElements =
    result.elements.filter(
      (element) => element.visible
    );

  for (
    let index = 1;
    index < visibleElements.length;
    index++
  ) {
    assert(
      visibleElements[index].box.y >=
        visibleElements[index - 1].box.y,
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

  const visibleElements =
    result.elements.filter(
      (element) => element.visible
    );

  for (
    let index = 1;
    index < visibleElements.length;
    index++
  ) {
    assert(
      visibleElements[index].box.x >=
        visibleElements[index - 1].box.x,
      "landscape layout should progress horizontally"
    );
  }

  console.log("PASS: landscape direction");
}

function validateLandscapeAdaptiveComposition(): void {
  const testSurfaces = [
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
    const result = resolveLayout(
      adSpec.elements,
      surface
    );

    const visible =
      result.elements.filter(
        (element) => element.visible
      );

    const logo =
      result.elements.find(
        (element) => element.id === "logo"
      );

    assert(
      logo?.visible === true,
      "feasible adaptive landscape should keep logo visible"
    );

    const safeArea =
      surface.safeArea;

    const right =
      surface.width - safeArea.right;

    const bottom =
      surface.height - safeArea.bottom;

    for (const element of visible) {
      assert(
        element.box.x >= safeArea.left,
        "adaptive landscape must respect left safe area"
      );

      assert(
        element.box.y >= safeArea.top,
        "adaptive landscape must respect top safe area"
      );

      assert(
        element.box.x +
          element.box.width <=
          right,
        "adaptive landscape must respect right safe area"
      );

      assert(
        element.box.y +
          element.box.height <=
          bottom,
        "adaptive landscape must respect bottom safe area"
      );
    }

    for (
      let first = 0;
      first < visible.length;
      first++
    ) {
      for (
        let second = first + 1;
        second < visible.length;
        second++
      ) {
        assert(
          !boxesOverlap(
            visible[first].box,
            visible[second].box
          ),
          "adaptive landscape elements must not overlap"
        );
      }
    }
  }

  const tooSmall = resolveLayout(
    adSpec.elements,
    {
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
    }
  );

  const smallLogo =
    tooSmall.elements.find(
      (element) => element.id === "logo"
    );

  assert(
    smallLogo?.visible === false,
    "genuinely infeasible landscape should still remove the logo"
  );

  console.log(
    "PASS: adaptive landscape composition"
  );
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
  const result = resolveLayout(
    [],
    surfaces.mobilePortrait
  );

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

    ...adSpec.elements.map(
      (element, index) => ({
        ...element,
        id: `${element.id}-copy-${index}`,
        priority: 3 as const,
      })
    ),
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
  const surfaceWithoutSafeArea = {
    width: 1080,
    height: 1080,
  };

  const result = resolveLayout(
    adSpec.elements,
    surfaceWithoutSafeArea
  );

  for (const element of result.elements) {
    if (element.visible) {
      assert(
        element.box.x >= 0,
        "no-safe-area surface should allow x >= 0"
      );

      assert(
        element.box.y >= 0,
        "no-safe-area surface should allow y >= 0"
      );
    }
  }

  console.log(
    "PASS: no safe-area surface"
  );
}

function validateMinimumSizes(): void {
  const verySmallSurface = {
    width: 100,
    height: 100,

    safeArea: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
  };

  const result = resolveLayout(
    adSpec.elements,
    verySmallSurface
  );

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
  const verySmallSurface = {
    width: 100,
    height: 100,

    safeArea: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
  };

  const result = resolveLayout(
    adSpec.elements,
    verySmallSurface
  );

  const visibleElements =
    result.elements.filter(
      (element) => element.visible
    );

  assert(
    visibleElements.length <
      adSpec.elements.length,
    "very small surface should trigger priority degradation"
  );

  console.log(
    "PASS: priority degradation"
  );
}

function validateNoNegativeCoordinates(): void {
  const testSurfaces = [
    surfaces.mobilePortrait,
    surfaces.mobileLandscape,
    surfaces.broadcastLowerThird,
    surfaces.retailKiosk,
  ];

  for (const surface of testSurfaces) {
    const result = resolveLayout(
      adSpec.elements,
      surface
    );

    for (const element of result.elements) {
      if (element.visible) {
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
  }

  console.log(
    "PASS: no negative coordinates"
  );
}

function validateNoOverflow(): void {
  const testSurfaces = [
    surfaces.mobilePortrait,
    surfaces.mobileLandscape,
    surfaces.broadcastLowerThird,
    surfaces.retailKiosk,
  ];

  for (const surface of testSurfaces) {
    const safeArea = surface.safeArea ?? {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    };

    const result = resolveLayout(
      adSpec.elements,
      surface
    );

    for (const element of result.elements) {
      if (!element.visible) {
        continue;
      }

      assert(
        element.box.x +
          element.box.width <=
          surface.width -
            safeArea.right,
        "visible element must not overflow horizontally"
      );

      assert(
        element.box.y +
          element.box.height <=
          surface.height -
            safeArea.bottom,
        "visible element must not overflow vertically"
      );
    }
  }

  console.log("PASS: no overflow");
}

function validateGeneralizedAlgorithm(): void {
  const newSurface = {
    width: 700,
    height: 500,

    safeArea: {
      top: 10,
      right: 10,
      bottom: 10,
      left: 10,
    },
  };

  const result = resolveLayout(
    adSpec.elements,
    newSurface
  );

  assert(
    result.elements.length > 0,
    "new surface should work without special-case layout logic"
  );

  for (const element of result.elements) {
    if (element.visible) {
      assert(
        element.box.x >=
          newSurface.safeArea.left,
        "generalized layout must respect left safe area"
      );

      assert(
        element.box.y >=
          newSurface.safeArea.top,
        "generalized layout must respect top safe area"
      );

      assert(
        element.box.x +
          element.box.width <=
          newSurface.width -
            newSurface.safeArea.right,
        "generalized layout must respect right safe area"
      );

      assert(
        element.box.y +
          element.box.height <=
          newSurface.height -
            newSurface.safeArea.bottom,
        "generalized layout must respect bottom safe area"
      );
    }
  }

  console.log(
    "PASS: generalized algorithm"
  );
}

/*
 * Run all validation checks.
 */

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

validateGeneralizedAlgorithm();

console.log(
  "All resolver validation checks passed."
);
