# Adaptive Layout Engine

A constraint-based layout engine that takes one advertisement specification and adapts it across different surfaces and screen sizes.

The main idea is simple:

> Define the advertisement once. Let the layout engine figure out how it should fit on each surface.

Instead of creating a separate layout for mobile, broadcast, kiosk, etc., the project uses a shared `AdSpec`, surface constraints, and a resolution algorithm to produce a `ResolvedLayout`.

---

## What this project does

An advertisement contains different elements such as:

- Headline
- Product name
- Product image
- Call-to-action button
- Logo
- Price

Each element has information about its:

- Type
- Role
- Priority
- Content

The same advertisement is then passed to the layout engine together with the constraints of the target surface.

For example, the same ad can be resolved for:

- Mobile portrait
- Mobile landscape
- Broadcast lower third
- Square retail kiosk
- A deliberately small constraint-test surface

The engine determines where the elements should go, how much space they can use, and which elements need to be hidden when the available space becomes too small.

---

## The core idea

The project follows this pipeline:

```text
AdSpec
   ↓
Surface Profile
   ↓
Constraint Resolver
   ↓
Resolved Layout
   ↓
Renderer