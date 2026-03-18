# Skill: Tests — Test coverage and quality

Check the diff for the following issues:

## Test structure
- **Missing `describe` blocks** — related tests not grouped under a `describe` or `suite` block, making the output hard to read
- **Vague test names** — test names like `"works"`, `"test 1"`, or `"should work"` that don't describe the specific behaviour being verified (e.g. prefer `"returns null when input is empty"` over `"handles input"`)
- **Multiple assertions testing unrelated things** — a single `it` block asserting on multiple unrelated behaviours; each test should verify one thing
- **Missing `beforeEach` / `afterEach` cleanup** — shared state (DB connections, mocks, temp files) set up inside each test body instead of in setup/teardown hooks

## Assertions
- **No assertions at all** — test body calls the function but never calls `expect`, `assert`, or equivalent
- **Asserting on `undefined`** — `expect(result).toBe(undefined)` often means the function returned nothing; likely a bug in the test or the implementation
- **Weak assertions** — `expect(result).toBeTruthy()` where `expect(result).toBe(42)` or `expect(result).toEqual({ id: 1 })` would be more precise
- **Asserting too much structure** — `expect(result).toEqual(entireHugeObject)` where asserting only the relevant fields would be clearer and less brittle
- **Missing negative assertions** — only testing that a function succeeds; no test that it throws or returns an error on bad input

## Mocking
- **Over-mocking** — mocking things the unit under test owns (e.g. mocking a private helper in the same module); prefer testing through the public interface
- **Mock not reset between tests** — `jest.fn()` or `sinon.stub()` created once at module level without `.mockReset()` or `.restore()` in `afterEach`
- **Mock return value not asserted** — mock set up to return a value but never checked with `expect(mock).toHaveBeenCalledWith(...)` or `expect(mock).toHaveBeenCalledTimes(...)`
- **Mocking the module under test** — the function being tested is itself mocked, making the test meaningless

## Coverage gaps
- **No test for the error/exception path** — function has a `throw` or `catch` block with no corresponding test that triggers it
- **No boundary value tests** — numeric functions not tested with `0`, `-1`, `Number.MAX_SAFE_INTEGER`, or empty arrays/strings
- **Async not awaited in test** — `async` test function calls an async operation without `await`, causing the test to pass before the assertion runs
- **Missing test for new exported function** — a new exported function appears in the diff with no corresponding test file change
