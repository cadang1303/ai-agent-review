---
name: types
description: Reviews TypeScript code diffs for type safety issues. Use when checking for any usage, missing return type annotations, non-null assertions, unsafe casts, or unvalidated external data.
license: MIT
metadata:
  author: ai-pr-reviewer
  version: "1.0"
compatibility: TypeScript files only (.ts, .tsx). Skip for plain JavaScript.
---

# Types — TypeScript and Type Safety

Check the diff for the following issues. Only apply to `.ts` and `.tsx` files.

## Weak typing
- **`any` usage** — variables, parameters, or return types annotated as `any` that could be properly typed
- **Missing return type annotations** — exported functions without an explicit return type
- **Overly broad union types** — `string | number | boolean | object` where a narrower type or discriminated union would be safer

## Unsafe operations
- **Non-null assertions hiding real risks** — use of `!` postfix on values that could genuinely be null or undefined
- **Unsafe type casts** — `as SomeType` that bypasses type checking without a type guard or runtime validation
- **`unknown` treated as known** — values of type `unknown` accessed without narrowing via `typeof`, `instanceof`, or a type guard

## External data
- **Type assertions on external data** — casting API responses or `JSON.parse` results with `as MyType` instead of runtime validation (e.g. `zod`, `io-ts`)
- **Implicit `any` from untyped imports** — `require()` calls or untyped imports that silently introduce `any`

## Other
- **Enums used as bitmasks** — numeric enums combined with bitwise operators; prefer union types or explicit flag objects

## Response format
Return findings as JSON comments with `"skill": "types"`.
