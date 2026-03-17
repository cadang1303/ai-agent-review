# Skill: Lint — Static analysis issues

Check the diff for the following issues:

- **Unused imports** — modules imported but never referenced in the file
- **Unused variables or parameters** — declared but never read
- **Unreachable code** — statements after `return`, `throw`, `break`, or `continue`
- **Declared but never-called functions** — defined but not exported or used locally
- **Shadowed variable declarations** — a `let` or `const` inside a block redeclares a name from an outer scope
- **Missing semicolons** — only flag if the surrounding code uses semicolons consistently
- **Empty blocks** — `catch (e) {}`, `if (x) {}` with no body
- **`var` usage** in JS/TS files — should use `const` or `let`
- **Imports that could be replaced** with a built-in (e.g. importing `lodash.isArray` instead of `Array.isArray`)
- **Console.log / debug statements** left in production code paths
