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

interface SurfaceProfile extends Dimensions {
  
  safeArea?: SafeArea;
  minTapTarget?: number;
  viewingDistance?: ViewingDistance;
  minTextSize?: number;
  touchOnly?: boolean;
}

export const surfaces: Record<string, SurfaceProfile> = {
  mobilePortrait: {
    width: 320,
    height: 480,
    safeArea: {
      top: 16,
      right: 16,
      bottom: 16,
      left: 16,
    },
    minTapTarget: 44,
  },

  mobileLandscape: {
  width: 480,
  height: 320,
  safeArea: {
    top: 16,
    right: 16,
    bottom: 16,
    left: 16,
  },
  minTapTarget: 44,
},

  broadcastLowerThird: {
    width: 1920,
    height: 250,
    viewingDistance: "far",
    minTextSize: 32,
  },

  retailKiosk: {
    width: 1080,
    height: 1080,
    minTapTarget: 60,
    touchOnly: true,
  },
};