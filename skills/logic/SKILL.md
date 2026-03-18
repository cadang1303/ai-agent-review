---
name: logic
description: Reviews code diffs for logic bugs and edge cases. Use when checking for off-by-one errors, unhandled promises, null dereferences, mutation bugs, floating-point comparisons, or infinite loop risks.
license: MIT
metadata:
  author: ai-pr-reviewer
  version: "1.0"
---

# Logic — Bugs and Edge Cases

Check the diff for the following issues:

## Bounds and conditions
- **Off-by-one errors** — `<` vs `<=`, `>` vs `>=`, array index starting at 1 instead of 0, or fencepost errors in loops
- **Infinite loop risk** — a loop condition that never becomes false (e.g. incrementing the wrong variable)
- **Floating-point equality** — using `===` to compare floats instead of checking within a small delta

## Async / error handling
- **Unhandled promise rejections** — `async` functions called without `await`, missing `.catch()`, or `try/catch` absent in async functions
- **Incorrect async/await usage** — `await` inside `forEach` (which ignores the promise), or missing `await` on an async function call

## Null safety
- **Missing null/undefined checks** — accessing `.property` or calling a method on a value that could be `null` or `undefined`
- **Functions that silently return undefined** — code paths that fall through without a `return` value in a function expected to return something

## State and mutation
- **Mutation of function arguments** — modifying an object or array passed as a parameter instead of creating a copy
- **Wrong variable captured in closure** — classic `var` in a loop closure capturing the final value instead of each iteration's value
- **Type coercion bugs** — relying on implicit JS coercion (`==` instead of `===`, `+` mixing strings and numbers)

## Response format
Return findings as JSON comments with `"skill": "logic"`.
