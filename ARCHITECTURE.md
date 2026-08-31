# Architecture — Adaptive Layout Engine

## 1. Overview

The Adaptive Layout Engine is a constraint-based layout system that takes one advertisement specification and adapts it across different surfaces and screen sizes.

The core architectural principle is:

> Define the advertisement once, describe the target surface through constraints, and let the resolver calculate the layout.

The system follows a clear separation of responsibilities:

```text
Advertisement Specification
            +
      Surface Profile
            ↓
    Constraint Resolver
            ↓
      Resolved Layout
            ↓
        React UI
            ↓
        DOM / CSS