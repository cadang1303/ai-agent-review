# Skill: Types — TypeScript and type safety

Check the diff for the following issues:

- **`any` usage** — variables, parameters, or return types annotated as `any` that could be properly typed
- **Missing return type annotations** — exported functions without an explicit return type (makes API surface unclear)
- **Non-null assertions hiding real risks** — use of `!` postfix operator on values that could genuinely be null or undefined
- **Unsafe type casts** — `as SomeType` that bypasses type checking without a type guard or runtime validation
- **`unknown` treated as known** — values of type `unknown` accessed without narrowing via `typeof`, `instanceof`, or a type guard
- **Enums used as bitmasks** — numeric enums combined with bitwise operators; prefer union types or explicit flag objects
- **Implicit `any` from untyped third-party code** — `require()` calls or untyped imports that silently introduce `any`
- **Type assertions on external data** — casting API responses or `JSON.parse` results with `as MyType` instead of runtime validation (e.g. `zod`, `io-ts`)
- **Overly broad union types** — `string | number | boolean | object` where a narrower type or discriminated union would be safer
