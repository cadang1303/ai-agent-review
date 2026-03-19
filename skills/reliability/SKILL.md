---
name: reliability
description: Reviews diffs for issues that cause systems to degrade under real production conditions. Covers test coverage and quality (structure, assertions, mocking, boundary values), resource leaks (event listeners, connections, memory), database performance anti-patterns (N+1 queries, missing indexes), and blocking I/O. Use when catching problems that work locally but fail at scale or over time.
license: MIT
metadata:
  author: ai-pr-reviewer
  version: "1.1"
---

# Reliability Review

Review the diff for issues that reduce production reliability in realistic conditions (CI flakiness, leaks, scaling pain).
To reduce noise: comment only on concrete risks visible in the diff, not generic "add more tests" advice when the repo/workflow does not show tests.
Flag only what is visible in the diff — do not speculate about files not shown.

---

## Test structure

**RL-01 — New logic without tests**
Flag missing tests ONLY when the repository clearly contains tests (e.g. there is a `test/`, `tests/`, `__tests__/` convention in the diff/repo, or the diff itself touches test tooling), and the diff adds/modifies non-trivial logic.
Do NOT flag when:
- The change is a trivial refactor/rename
- The repo appears to have no test setup
If logic is added and no test file is modified or created, flag the gap.
- Flag: New `calculateDiscount(price, qty)` with no matching test file change
- ✅ Add a test covering the normal case and at least one edge case (zero, negative, empty input)
- Severity: 🟡

**RL-02 — Missing `describe` grouping**
Related tests must be grouped under a `describe` or `suite` block. Flat test files with no grouping produce unreadable output and make it hard to isolate failures.
- ❌ Multiple `it(...)` blocks at the top level with no wrapping `describe`
- ✅ `describe('calculateDiscount', () => { it('applies valid code', ...) it('rejects expired code', ...) })`
- Severity: 🔵

**RL-03 — Vague test names**
Test names must describe the specific behaviour being verified, not just that something "works".
- ❌ `it('works', ...)` / `it('test 1', ...)` / `it('should work', ...)`
- ✅ `it('returns 0 when cart is empty', ...)` / `it('throws when token is expired', ...)`
- Severity: 🟡

**RL-04 — Multiple unrelated assertions in one test**
A single `it` block asserting on multiple unrelated behaviours makes failures ambiguous — you can't tell which behaviour broke.
- ❌ One `it` block that checks the return value, the DB call count, and the log output
- ✅ Split into separate `it` blocks, one assertion focus each
- Severity: 🔵

**RL-05 — Missing `beforeEach` / `afterEach` cleanup**
Shared state (DB connections, mocks, temp files) set up inside each test body should use setup/teardown hooks to avoid repetition and ensure cleanup on failure.
- ❌ Each `it` block manually creates and tears down the same mock
- ✅ Move setup to `beforeEach` and teardown to `afterEach`
- Severity: 🔵

---

## Assertions

**RL-06 — Meaningless assertion**
Test assertions must verify a specific expected value, not just that something exists or is truthy.
- ❌ `expect(result).toBeTruthy()`
- ❌ `assert(response)` with no value check
- ✅ `expect(result).toEqual({ id: 1, status: 'active' })`
- Severity: 🟡

**RL-07 — Asserting on `undefined`**
`expect(result).toBe(undefined)` usually signals a bug in the test or the implementation — the function returned nothing when it should have returned a value.
- Flag when the function signature suggests it should return a value
- Severity: 🟡

**RL-08 — Missing negative / error assertion**
Tests that only cover the success path leave the error handling untested. At least one test must exercise the error, rejection, or invalid-input path for every function that has one.
- Flag: New `try/catch` block or explicit `throw` with no corresponding error-case test in the diff
- ✅ Add a test that triggers the error condition and asserts the expected error response or thrown message
- Severity: 🟡

**RL-09 — Missing boundary value tests**
Numeric functions and collection operations must be tested with boundary values — these are where off-by-one bugs hide.
- Values to test: `0`, `-1`, `Number.MAX_SAFE_INTEGER`, empty array `[]`, single-element array `[x]`
- Flag when a new numeric or collection function has no test covering any of these
- Severity: 🟡

---

## Mocking

**RL-10 — Mock not reset between tests**
`jest.fn()` or `sinon.stub()` created at module level without `.mockReset()` / `.mockClear()` / `.restore()` in `afterEach` causes call counts and return values to bleed between tests.
- ❌ `const mockFn = jest.fn()` at the top of the file, reused across multiple `it` blocks with no reset
- ✅ Call `mockFn.mockReset()` in `afterEach`, or use `jest.resetAllMocks()` in the suite setup
- Severity: 🟡

**RL-11 — Mock configured but never asserted**
A mock set up to return a specific value but never checked with `toHaveBeenCalledWith` or `toHaveBeenCalledTimes` provides no coverage of whether the unit actually used it correctly.
- ❌ `fetchUser.mockResolvedValue(user)` with no `expect(fetchUser).toHaveBeenCalledWith(userId)`
- ✅ Assert both the return value and the call arguments
- Severity: 🟡

**RL-12 — Over-mocking**
Mocking things the unit under test owns (private helpers, internal utilities in the same module) couples the test to implementation details. Test through the public interface instead.
- ❌ Mocking a private `_formatDate` helper that the public function calls internally
- ✅ Call the public function and assert the final output; let internal helpers run naturally
- Severity: 🔵

**RL-13 — Mocking the module under test**
The function being tested must not itself be mocked — doing so makes the test meaningless.
- ❌ `jest.spyOn(myModule, 'calculateTotal').mockReturnValue(100)` in a test of `calculateTotal`
- Severity: 🟡

**RL-14 — Async not awaited in test**
An `async` test function that calls an async operation without `await` causes the test to finish and pass before the assertion runs.
- ❌ `it('fetches user', async () => { getUser(id); expect(result).toBe(...) })` — `getUser` not awaited
- ✅ `it('fetches user', async () => { const result = await getUser(id); expect(result).toBe(...) })`
- Severity: 🔴

**RL-15 — Skipped test without reason**
`test.skip`, `xit`, `xtest`, `@pytest.mark.skip`, or `pending()` must include a comment explaining why and referencing a tracking issue.
- ❌ `test.skip('should validate input', () => { ... })`
- ✅ `test.skip('should validate input — pending JIRA-456 API mock setup', () => { ... })`
- Severity: 🟡

**RL-16 — Real I/O in unit test**
Test bodies that call real network endpoints, databases, or file system paths without mocking are flaky and cause false CI failures.
- ❌ `fetch('https://api.example.com/users')` inside a unit test body with no mock
- ✅ Mock the client: `jest.spyOn(global, 'fetch').mockResolvedValue(...)` or use `msw`
- Severity: 🟡

---

## Resource leaks

**RL-17 — Event listener not cleaned up**
Event listeners, interval timers, and subscriptions created inside a component lifecycle or `useEffect` must be removed when the component unmounts.
- ❌ `useEffect(() => { window.addEventListener('resize', handler) }, [])` with no cleanup return
- ✅ `useEffect(() => { window.addEventListener('resize', handler); return () => window.removeEventListener('resize', handler) }, [])`
- Vue: set up in `mounted`, remove in `unmounted` / `beforeDestroy`
- Severity: 🔴

**RL-18 — I/O resource not closed**
Database connections, file handles, and network sockets opened manually must be closed in a `finally` block.
- ❌ `const conn = await db.connect(); const rows = await conn.query(...); return rows;` — not released on error
- ✅ `try { const rows = await conn.query(...); return rows; } finally { conn.release(); }`
- Severity: 🔴

**RL-19 — Unbounded cache or accumulator**
Module-level `Map`, `Set`, or array values that grow by appending but are never pruned are memory leaks.
- ❌ `const seen = new Map()` at module level, appended on every request with no eviction
- ✅ Add a max-size cap, use a TTL cache library, or scope to request lifetime
- Severity: 🟡

---

## Database and I/O performance

**RL-20 — N+1 query**
A database query inside a loop iterating over an input list creates N separate round trips — one per item.
- ❌ `const users = await Promise.all(ids.map(id => db.findOne({ where: { id } })))`
- ✅ `const users = await db.findMany({ where: { id: { in: ids } } })` — single query with IN clause
- Severity: 🔴

**RL-21 — Query on unindexed column**
A diff that adds a query filtering or ordering by a non-primary-key column should include a migration adding an index. Flag only when: (1) a new `WHERE col = ?` or `ORDER BY col` query is added AND (2) no `CREATE INDEX` for that column exists anywhere in the diff.
- ✅ Add `CREATE INDEX idx_users_email ON users(email)` in the migration file alongside the query
- Severity: 🟡

**RL-22 — SELECT \* in hand-written query**
`SELECT *` fetches all columns including large blobs and deprecated fields, and causes silent breakage when the schema adds columns with incompatible types.
- ❌ `` db.query(`SELECT * FROM orders WHERE user_id = ?`, [userId]) ``
- ✅ `` db.query(`SELECT id, status, total, created_at FROM orders WHERE user_id = ?`, [userId]) ``
- Severity: 🟡

---

## Computation performance

**RL-23 — Missing memoization on expensive computation**
Expensive operations inside a React render function or Vue template expression without memoization run on every render.
- ❌ `const sorted = items.sort((a, b) => b.date - a.date)` directly in render/return
- ✅ React: `const sorted = useMemo(() => [...items].sort((a, b) => b.date - a.date), [items])`
- ✅ Vue: use a `computed` property
- Severity: 🔵

**RL-24 — Synchronous I/O in request handler**
Synchronous file I/O inside a web request handler blocks the entire event loop for the duration of the I/O.
- ❌ `const config = fs.readFileSync('./config.json', 'utf8')` inside an Express route handler
- ✅ Load config at startup outside the handler, or use `await fs.promises.readFile(...)`
- Severity: 🔴

---

## Severity guide

Include the rule ID at the start of the `body` field in each JSON comment.
- 🔴 `"severity": "error"` — crashes, unbounded resource consumption, async not awaited in test
- 🟡 `"severity": "warning"` — degrades performance, stability, or test reliability under real conditions
- 🔵 `"severity": "info"` — structural improvements with low urgency
