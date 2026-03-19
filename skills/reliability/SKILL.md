---
name: reliability
description: Reviews diffs for issues that cause systems to degrade under real production conditions. Covers test coverage and quality (structure, assertions, mocking, boundary values), resource leaks (event listeners, connections, memory), database performance anti-patterns (N+1 queries, missing indexes), and blocking I/O. Use when catching problems that work locally but fail at scale or over time.
---

# Reliability Review

Review only concrete risks visible in the diff. Don't add generic "add more tests" advice when the repo shows no test setup.

---

## Test structure

**RL-01 — New logic without tests** 🟡
Flag only when the repo clearly has tests (has `test/`, `__tests__/`, or test tooling in the diff) and the diff adds/modifies non-trivial logic with no matching test file change. Skip trivial refactors.

**RL-02 — Missing `describe` grouping** 🔵
Multiple `it(...)` blocks at top level with no wrapping `describe`/`suite`.

**RL-03 — Vague test names** 🟡
Test names must describe specific behaviour, not "works" or "test 1".
- ❌ `it('works', ...)` → ✅ `it('returns 0 when cart is empty', ...)`

**RL-04 — Multiple unrelated assertions** 🔵
One `it` block asserting on return value, DB call count, and log output makes failures ambiguous. Split into focused tests.

**RL-05 — Missing setup/teardown hooks** 🔵
Shared state (mocks, DB connections, temp files) repeated in each test body should use `beforeEach`/`afterEach`.

---

## Assertions

**RL-06 — Meaningless assertion** 🟡
Must verify a specific expected value, not just truthiness.
- ❌ `expect(result).toBeTruthy()` → ✅ `expect(result).toEqual({ id: 1, status: 'active' })`

**RL-07 — Asserting on `undefined`** 🟡
Usually signals a bug — the function returned nothing when it should have returned a value.

**RL-08 — Missing error-path assertion** 🟡
Every new `try/catch` or `throw` needs at least one test exercising the error condition.

**RL-09 — Missing boundary values** 🟡
Numeric/collection functions need tests for `0`, `-1`, `[]`, `[x]` — that's where off-by-one bugs hide.

---

## Mocking

**RL-10 — Mock not reset between tests** 🟡
Module-level `jest.fn()` / `sinon.stub()` without `.mockReset()` in `afterEach` bleeds call counts/values across tests.

**RL-11 — Mock configured but never asserted** 🟡
A mock returning a specific value that's never checked with `toHaveBeenCalledWith` provides no coverage.

**RL-12 — Over-mocking internal helpers** 🔵
Mocking private helpers the unit owns couples tests to implementation. Test through the public interface.

**RL-13 — Mocking the function under test** 🟡
The function being tested must not itself be mocked — the test becomes meaningless.

**RL-14 — Async not awaited in test** 🔴
Async operation called without `await` causes the test to pass before the assertion runs.
- ❌ `it('fetches user', async () => { getUser(id); expect(result)... })`

**RL-15 — Skipped test without reason** 🟡
`test.skip`, `xit`, `@pytest.mark.skip` must include a comment explaining why and referencing a tracking issue.

**RL-16 — Real I/O in unit test** 🟡
Real network/DB/filesystem calls in test bodies cause flakiness. Mock them.

---

## Resource leaks

**RL-17 — Event listener not cleaned up** 🔴
Listeners, timers, and subscriptions set up in `useEffect`/`mounted` must be removed on unmount.
- ❌ `useEffect(() => { window.addEventListener('resize', h) }, [])` (no cleanup return)
- ✅ add `return () => window.removeEventListener('resize', h)`

**RL-18 — I/O resource not closed** 🔴
DB connections, file handles, sockets opened manually must be closed in a `finally` block.
- ❌ `const conn = await db.connect(); return await conn.query(...)` (not released on error)

**RL-19 — Unbounded cache** 🟡
Module-level `Map`/`Set`/array that grows without eviction is a memory leak. Add max-size, TTL, or scope to request lifetime.

---

## DB / I/O performance

**RL-20 — N+1 query** 🔴
A DB query inside a loop over an input list. Use a single `IN` query instead.
- ❌ `ids.map(id => db.findOne({ where: { id } }))` → ✅ `db.findMany({ where: { id: { in: ids } } })`

**RL-21 — Query on unindexed column** 🟡
New `WHERE col = ?` or `ORDER BY col` without a corresponding `CREATE INDEX` in the same diff.

**RL-22 — SELECT \*** 🟡
Fetches all columns including blobs and deprecated fields; breaks silently on schema changes. Enumerate needed columns.

**RL-23 — Missing memoization on expensive render computation** 🔵
Expensive sort/filter directly in a React render or Vue template should use `useMemo`/`computed`.

**RL-24 — Sync I/O in request handler** 🔴
`fs.readFileSync` inside a route handler blocks the event loop.
- ✅ Load at startup, or use `await fs.promises.readFile(...)`

---

> See `_shared/shared-config.md` for severity guide and output format.