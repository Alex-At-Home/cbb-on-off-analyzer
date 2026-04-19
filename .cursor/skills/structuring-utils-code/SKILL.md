---
name: structuring-utils-code
description: How to organize utility modules — stats classes (GradeUtils-style), vs table helpers with TSX in utils/tables.
---

# Structuring Utils Code

## Stats / pure TS utilities (`src/utils/stats`)

Follow **`GradeUtils`** and **`PortalUtils`** patterns:

1. **File name** — `{Domain}Utils.ts` (e.g. `PortalUtils.ts`, `GradeUtils.ts`).
2. **Exports** — `export class DomainUtils { ... }` as the main surface.
3. **Types first** — At the **top** of the file after imports: all `export type` / interfaces used by the module.
4. **Members** — Use **`static`** methods for functions and **`static readonly`** for constants and immutable collections (tier bands, rule arrays, etc.).
5. **Imports** — Prefer relative imports within `utils` (e.g. `./GradeUtils`), not cycles.

Private helpers can be **`private static`** methods or **`private static readonly`** scalars on the same class.

## Table UI helpers that include TSX (`src/utils/tables`)

If the helper **renders React** (returns JSX) or is tightly coupled to table presentation but **does not belong** in `src/components/` (e.g. shared formatters/builders used by many tables), put it in **`utils/tables`** as:

- **`SomethingTableUtils.tsx`** — the `.tsx` extension is required when the file contains JSX.

Keep **presentational components** under `src/components/` (including `components/shared/`). Use `utils/tables` for reusable **non-page** table logic that happens to need TSX.

## Related

- **`GradeUtils.ts`** — reference implementation for stats utils class shape.
- **`PortalUtils.ts`** — portal eval rules consolidated into one stats utils class.
