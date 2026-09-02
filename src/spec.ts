
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
  content: string;
}

export interface AdSpec {
  elements: AdElement[];
}

const VALID_ELEMENT_TYPES: readonly ElementType[] = [
  "text",
  "image",
  "button",
];

const VALID_ELEMENT_ROLES: readonly ElementRole[] = [
  "primary",
  "hero",
  "action",
  "branding",
  "secondary",
];

const VALID_PRIORITIES: readonly Priority[] = [1, 2, 3];

function isValidElementType(value: unknown): value is ElementType {
  return (
    typeof value === "string" &&
    VALID_ELEMENT_TYPES.includes(value as ElementType)
  );
}

function isValidElementRole(value: unknown): value is ElementRole {
  return (
    typeof value === "string" &&
    VALID_ELEMENT_ROLES.includes(value as ElementRole)
  );
}

function isValidPriority(value: unknown): value is Priority {
  return (
    typeof value === "number" &&
    VALID_PRIORITIES.includes(value as Priority)
  );
}

function validateElement(
  element: unknown,
  index: number,
  ids: Set<string>
): asserts element is AdElement {
  if (typeof element !== "object" || element === null) {
    throw new Error(
      `Invalid element at index ${index}: expected an object.`
    );
  }

  const candidate = element as Partial<AdElement>;
  const id = candidate.id?.trim();

  if (!id) {
    throw new Error(
      `Invalid element at index ${index}: ID must be a non-empty string.`
    );
  }

  if (ids.has(id)) {
    throw new Error(`Duplicate element ID: "${id}"`);
  }

  ids.add(id);

  if (!isValidElementType(candidate.type)) {
    throw new Error(
      `Invalid element "${id}": type must be one of "text", "image", or "button".`
    );
  }

  if (!isValidElementRole(candidate.role)) {
    throw new Error(
      `Invalid element "${id}": role must be one of "primary", "hero", "action", "branding", or "secondary".`
    );
  }

  if (!isValidPriority(candidate.priority)) {
    throw new Error(
      `Invalid element "${id}": priority must be 1, 2, or 3.`
    );
  }

  if (
    typeof candidate.content !== "string" ||
    candidate.content.trim().length === 0
  ) {
    throw new Error(
      `Invalid element "${id}": content must be a non-empty string.`
    );
  }

  if (candidate.role === "action" && candidate.type !== "button") {
    throw new Error(
      `Invalid element "${id}": action elements must use type "button".`
    );
  }

  if (candidate.role === "hero" && candidate.type !== "image") {
    throw new Error(
      `Invalid element "${id}": hero elements must use type "image".`
    );
  }

  if (candidate.role === "branding" && candidate.type !== "image") {
    throw new Error(
      `Invalid element "${id}": branding elements must use type "image".`
    );
  }
}

export function validateAdSpec(spec: unknown): asserts spec is AdSpec {
  if (typeof spec !== "object" || spec === null) {
    throw new Error("Invalid ad spec: expected an object.");
  }

  const candidate = spec as Partial<AdSpec>;

  if (!Array.isArray(candidate.elements)) {
    throw new Error("Invalid ad spec: elements must be an array.");
  }

  if (candidate.elements.length === 0) {
    throw new Error(
      "Invalid ad spec: at least one element is required."
    );
  }

  const ids = new Set<string>();

  candidate.elements.forEach((element, index) => {
    validateElement(element, index, ids);
  });
}

export const adSpec: AdSpec = {
  elements: [
    {
      id: "headline",
      type: "text",
      role: "primary",
      priority: 1,
      content: "Bharath computer parts",
    },
    {
      id: "product-name",
      type: "text",
      role: "secondary",
      priority: 2,
      content: "The Blessed CPU",
    },
    {
      id: "product-image",
      type: "image",
      role: "hero",
      priority: 1,
      content: "/product.png",
    },
    {
      id: "cta",
      type: "button",
      role: "action",
      priority: 2,
      content: "APPLY NOW",
    },
    {
      id: "logo",
      type: "image",
      role: "branding",
      priority: 3,
      content: "/logo.png",
    },
    {
      id: "price",
      type: "text",
      role: "secondary",
      priority: 2,
      content: "₹40,000",
    },
    
  ],
};

validateAdSpec(adSpec);
