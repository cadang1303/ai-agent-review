# Skill: Logic — Bugs and edge cases

Check the diff for the following issues:

- **Off-by-one errors** — `<` vs `<=`, `>` vs `>=`, array index starting at 1 instead of 0, or fencepost errors in loops
- **Unhandled promise rejections** — `async` functions called without `await`, missing `.catch()`, or `try/catch` absent in async functions
- **Missing null/undefined checks** — accessing `.property` or calling a method on a value that could be `null` or `undefined`
- **Functions that silently return undefined** — code paths that fall through without a `return` value in a function that is expected to return something
- **Mutation of function arguments** — modifying an object or array passed as a parameter instead of creating a copy
- **Floating-point equality** — using `===` to compare floats instead of checking within a small delta
- **Infinite loop risk** — a loop condition that never becomes false (e.g. incrementing the wrong variable)
- **Incorrect async/await usage** — `await` inside `forEach` (which ignores the promise), or missing `await` on an async function call
- **Wrong variable captured in closure** — classic `var` in a loop closure capturing the final value instead of each iteration's value
- **Type coercion bugs** — relying on implicit JS coercion (`==` instead of `===`, `+` mixing strings and numbers)
