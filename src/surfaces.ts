interface Dimensions {
  width: number;
  height: number;
}

type ViewingDistance = "near" | "far";

interface SafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface SurfaceProfile extends Dimensions {
  safeArea?: SafeArea;
  minTapTarget?: number;
  viewingDistance?: ViewingDistance;
  minTextSize?: number;
  touchOnly?: boolean;
  allowAdaptiveLandscapeComposition?: boolean;
}

export const surfaces: Record<string, SurfaceProfile> = {
  mobilePortrait: {
    width: 320,
    height: 480,
    safeArea: { top: 16, right: 16, bottom: 16, left: 16 },
    minTapTarget: 44,
    viewingDistance: "near",
    minTextSize: 16,
  },

  mobileLandscape: {
    width: 480,
    height: 320,
    safeArea: { top: 16, right: 16, bottom: 16, left: 16 },
    minTapTarget: 44,
    viewingDistance: "near",
    minTextSize: 16,
    allowAdaptiveLandscapeComposition: true,
  },

  broadcastLowerThird: {
    width: 1920,
    height: 250,
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    viewingDistance: "far",
    minTextSize: 24,
    allowAdaptiveLandscapeComposition: true,
  },

  retailKiosk: {
    width: 1080,
    height: 1080,
    safeArea: { top: 24, right: 24, bottom: 24, left: 24 },
    minTapTarget: 60,
    touchOnly: true,
    viewingDistance: "near",
    minTextSize: 20,
  },

  constraintTest: {
    width: 180,
    height: 140,
    safeArea: { top: 8, right: 8, bottom: 8, left: 8 },
    minTapTarget: 44,
    viewingDistance: "near",
    minTextSize: 16,
  },
};