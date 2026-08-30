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

  console.log(`PASS: ${name}`);
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

validateSurface("mobilePortrait");
validateSurface("mobileLandscape");
validateSurface("broadcastLowerThird");
validateSurface("retailKiosk");

validateEmptyLayout();

validatePriorityDegradation();

console.log(
  "All resolver validation checks passed."
);