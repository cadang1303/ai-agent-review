---
name: lint
description: Detects static analysis issues in code diffs. Use when checking for unused imports, unreachable code, undeclared variables, empty blocks, or console.log statements left in production code.
license: MIT
metadata:
  author: ai-pr-reviewer
  version: "1.0"
---

# Lint — Static Analysis Issues

Check the diff for the following issues:

## Unused code
- **Unused imports** — modules imported but never referenced in the file
- **Unused variables or parameters** — declared but never read
- **Declared but never-called functions** — defined but not exported or used locally

## Dead code
- **Unreachable code** — statements after `return`, `throw`, `break`, or `continue`
- **Empty blocks** — `catch (e) {}`, `if (x) {}` with no body

## Style issues
- **`var` usage** in JS/TS files — should use `const` or `let`
- **Shadowed variable declarations** — a `let` or `const` inside a block redeclares a name from an outer scope
- **Missing semicolons** — only flag if the surrounding code uses semicolons consistently
- **Imports that could be replaced** with a built-in (e.g. importing `lodash.isArray` instead of `Array.isArray`)
- **Console.log / debug statements** left in production code paths

## Response format
Return findings as JSON comments with `"skill": "lint"`.
