import { resolveLayout } from "./resolver";
import { surfaces } from "./surfaces";
import { adSpec } from "./spec";

function assert(
  condition: boolean,
  message: string
) {
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
) {
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
    const { x, y, width, height } =
      element.box;

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

function validatePortraitSurface() {
  const result = resolveLayout(
    adSpec.elements,
    surfaces.mobilePortrait
  );

  const visibleElements =
    result.elements.filter(
      (element) => element.visible
    );

  for (let index = 1; index < visibleElements.length; index++) {
    assert(
      visibleElements[index].box.y >=
        visibleElements[index - 1].box.y,
      "portrait layout should progress vertically"
    );
  }

  console.log("PASS: portrait direction");
}

function validateLandscapeSurface() {
  const result = resolveLayout(
    adSpec.elements,
    surfaces.mobileLandscape
  );

  const visibleElements =
    result.elements.filter(
      (element) => element.visible
    );

  for (let index = 1; index < visibleElements.length; index++) {
    assert(
      visibleElements[index].box.x >=
        visibleElements[index - 1].box.x,
      "landscape layout should progress horizontally"
    );
  }

  console.log("PASS: landscape direction");
}

function validateBalancedSurface() {
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

function validateEmptyLayout() {
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

function validateSingleElement() {
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

function validateManyElements() {
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

function validateNoSafeArea() {
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

  console.log("PASS: no safe-area surface");
}

function validateMinimumSizes() {
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

function validatePriorityDegradation() {
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

function validateNoNegativeCoordinates() {
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

function validateNoOverflow() {
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
        element.box.x + element.box.width <=
          surface.width - safeArea.right,
        "visible element must not overflow horizontally"
      );

      assert(
        element.box.y + element.box.height <=
          surface.height - safeArea.bottom,
        "visible element must not overflow vertically"
      );
    }
  }

  console.log("PASS: no overflow");
}

function validateGeneralizedAlgorithm() {
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
        element.box.x >= newSurface.safeArea.left,
        "generalized layout must respect left safe area"
      );

      assert(
        element.box.y >= newSurface.safeArea.top,
        "generalized layout must respect top safe area"
      );

      assert(
        element.box.x + element.box.width <=
          newSurface.width -
            newSurface.safeArea.right,
        "generalized layout must respect right safe area"
      );

      assert(
        element.box.y + element.box.height <=
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

validateSurface("mobilePortrait");
validateSurface("mobileLandscape");
validateSurface("broadcastLowerThird");
validateSurface("retailKiosk");

validatePortraitSurface();
validateLandscapeSurface();
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