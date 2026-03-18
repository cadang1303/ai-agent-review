---
name: unit-test
description: Reviews unit test diffs for structure and quality issues. Use when checking for missing describe blocks, vague test names, over-mocking, unreset mocks, missing boundary value tests, or async not awaited in tests.
license: MIT
metadata:
  author: ai-pr-reviewer
  version: "1.0"
---

# Unit Test — Unit Test Quality and Structure

Check the diff for the following issues:

## Test structure
- **Missing `describe` blocks** — related tests not grouped, making output hard to read
- **Vague test names** — names like `"works"`, `"test 1"`, or `"should work"` that don't describe the specific behaviour (prefer `"returns null when input is empty"`)
- **Multiple unrelated assertions** — a single `it` block asserting on multiple unrelated behaviours; each test should verify one thing
- **Missing `beforeEach` / `afterEach` cleanup** — shared state set up inside each test body instead of setup/teardown hooks

## Assertions
- **No assertions at all** — test body calls the function but never calls `expect`, `assert`, or equivalent
- **Asserting on `undefined`** — `expect(result).toBe(undefined)` often signals a bug in the test or implementation
- **Weak assertions** — `expect(result).toBeTruthy()` where a specific matcher would catch more bugs
- **Missing negative assertions** — only testing the success path; no test that throws or returns an error on bad input

## Mocking
- **Over-mocking** — mocking things the unit under test owns (prefer testing through the public interface)
- **Mock not reset between tests** — `jest.fn()` created at module level without `.mockReset()` or `.restore()` in `afterEach`
- **Mock return value not asserted** — mock configured to return a value but never verified with `toHaveBeenCalledWith`
- **Mocking the module under test** — the function being tested is itself mocked, making the test meaningless

## Coverage gaps
- **No test for the error/exception path** — function has a `throw` or `catch` block with no test triggering it
- **No boundary value tests** — numeric functions not tested with `0`, `-1`, `Number.MAX_SAFE_INTEGER`, or empty arrays/strings
- **Async not awaited in test** — `async` test function calls an async operation without `await`, causing the test to pass prematurely
- **Missing test for new exported function** — a new exported function appears in the diff with no corresponding test

## Response format
Return findings as JSON comments with `"skill": "unit-test"`.
