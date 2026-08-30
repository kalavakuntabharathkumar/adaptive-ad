export interface LayoutBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ResolvedElement {
  id: string;
  box: LayoutBox;
  visible: boolean;

  /*
   * Rendering constraints resolved by the layout engine.
   *
   * These values allow the renderer to preserve the same
   * minimum text and interaction constraints used by the
   * constraint solver.
   */
  minTextSize?: number;
  minTapTarget?: number;
}

export interface ResolvedLayout {
  elements: ResolvedElement[];
}