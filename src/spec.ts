type ElementType = "text" | "image" | "button";

type ElementRole =
  | "primary"
  | "hero"
  | "action"
  | "branding"
  | "secondary";

type Priority = 1 | 2 | 3;

export interface AdElement {
  id: string;
  type: ElementType;
  role: ElementRole;
  priority: Priority;
}

interface AdSpec {
  elements: AdElement[];
}

export const adSpec: AdSpec = {
  elements: [
    {
      id: "headline",
      type: "text",
      role: "primary",
      priority: 1,
    },
    {
      id: "product-image",
      type: "image",
      role: "hero",
      priority: 1,
    },
    {
      id: "cta",
      type: "button",
      role: "action",
      priority: 2,
    },
    {
      id: "logo",
      type: "image",
      role: "branding",
      priority: 3,
    },
    {
      id: "price",
      type: "text",
      role: "secondary",
      priority: 2,
    },
  ],
};