---
name: OpenAPI codegen quirks
description: Compatibility constraints for the workspace OpenAPI-to-Zod generation pipeline.
---

The current OpenAPI-to-Zod generator emits Zod 3-compatible output, so avoid schema constructs that cause it to generate Zod 4-only helpers (notably email formats and integer-specific schemas) unless the generator is upgraded first.

**Why:** Generated client/schema code failed to compile when those constructs were present, while equivalent strict validation can remain in the server-side Zod schemas.

**How to apply:** After editing the OpenAPI contract, regenerate both client hooks and Zod schemas, then run the workspace typecheck before building.