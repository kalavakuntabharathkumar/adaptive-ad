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
}

export interface ResolvedLayout {
  elements: ResolvedElement[];
}