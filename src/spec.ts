type ElementType =
  | "text"
  | "image"
  | "button";

type ElementRole =
  | "primary"
  | "hero"
  | "action"
  | "branding"
  | "secondary";

type Priority =
  | 1
  | 2
  | 3;

export interface AdElement {
  id: string;

  type: ElementType;

  role: ElementRole;

  priority: Priority;

  content: string;
}

interface AdSpec {
  elements: AdElement[];
}

export const adSpec: AdSpec = {
  elements: [

    /*
     * Most important textual content.
     *
     * It should survive degradation and should receive
     * enough space to display the complete message.
     */

    {
      id: "headline",

      type: "text",

      role: "primary",

      priority: 1,

      content:
        "Bharath computer parts",
    },

    /*
     * Product name.
     */

    {
      id: "product-name",

      type: "text",

      role: "secondary",

      priority: 2,

      content:
        "The Blessed CPU",
    },

    /*
     * Main visual.
     */

    {
      id: "product-image",

      type: "image",

      role: "hero",

      priority: 1,

      content:
        "/product.png",
    },

    /*
     * Interactive action.
     */

    {
      id: "cta",

      type: "button",

      role: "action",

      priority: 2,

      content:
        "APPLY NOW",
    },

    /*
     * Lowest priority element.
     *
     * This is the first element that should be removed
     * when the surface becomes infeasible.
     */

    {
      id: "logo",

      type: "image",

      role: "branding",

      priority: 3,

      content:
        "/logo.png",
    },

    /*
     * Price.
     */

    {
      id: "price",

      type: "text",

      role: "secondary",

      priority: 2,

      content:
        "₹40,000",
    },
  ],
};