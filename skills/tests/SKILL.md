---
name: tests
description: Reviews test files in code diffs for coverage gaps and quality issues. Use when checking for missing tests on new functions, empty assertions, happy-path-only coverage, or skipped/commented-out tests.
license: MIT
metadata:
  author: ai-pr-reviewer
  version: "1.0"
---

# Tests — Test Coverage and Quality

Check the diff for the following issues:

## Coverage
- **New public functions without tests** — exported functions or methods added in the diff that have no corresponding test file changes
- **Missing error case tests** — functions that `throw` or return error states with no test covering those paths
- **Happy-path-only tests** — tests that only cover the success case and skip error, edge, or boundary conditions

## Assertion quality
- **Tests with no assertions** — test bodies that call functions but never assert anything (`expect`, `assert`, `should`)
- **Weak assertions** — `expect(result).toBeTruthy()` where `expect(result).toBe(42)` would be more precise
- **Asserting too much structure** — `expect(result).toEqual(entireHugeObject)` where asserting only relevant fields would be clearer

## Test design
- **Hardcoded test data that should be parameterised** — copy-pasted test cases differing only in input values (use `it.each` / `@pytest.mark.parametrize`)
- **Mocks that never assert** — mocks set up but never checked with `toHaveBeenCalledWith` or `toHaveBeenCalledTimes`
- **Skipped or commented-out tests** — `it.skip`, `xit`, `xdescribe`, or `test.todo` left without explanation

## Response format
Return findings as JSON comments with `"skill": "tests"`.
