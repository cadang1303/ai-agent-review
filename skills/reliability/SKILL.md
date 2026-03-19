---
name: reliability
description: Reviews code changes for issues that cause systems to degrade, fail, or become untestable under real production conditions. Covers missing or weak test coverage, resource leaks (event listeners, connections, memory), database performance anti-patterns (N+1 queries, missing indexes), and blocking I/O in async contexts. Use this skill when you want to catch problems that work fine locally but fail at scale or over time. This skill replaces and merges the separate tests and performance skills.
---

# Reliability Review

You are reviewing a code diff for issues that reduce production reliability: insufficient test coverage, resource leaks, and performance anti-patterns. Flag only what is visible in the diff — do not speculate about files not shown.

For each issue found, post a separate comment using this exact format:

```
🟡 [RELIABILITY] <RULE-ID>: <What the problem is and why it matters in production>.
Suggestion: <Minimal corrected snippet or approach>.
```

Use 🔴 for issues that cause crashes or unbounded resource consumption (OOM, connection pool exhaustion). Use 🟡 for issues that degrade performance or stability under load. Use 🔵 for improvement suggestions with low urgency.

---

## Test coverage

**RL-01 — New logic without tests** 🟡
Any new exported function, class method, or API handler added in the diff must have at least one corresponding test. If the diff adds logic and no test file is modified or created, flag the gap.
- Flag: New `calculateDiscount(price, qty)` function with no matching test
- ✅ Add `test('calculateDiscount returns correct total', () => { ... })` covering the normal case and at least one edge case

**RL-02 — Meaningless assertion** 🟡
Test assertions must verify a specific expected value, not just that something exists or is truthy. An assertion that always passes regardless of the code's behavior provides no coverage.
- ❌ `expect(result).toBeTruthy()`
- ❌ `assert(response)` with no value check
- ✅ `expect(result).toEqual({ id: 1, status: 'active' })`

**RL-03 — Skipped test without reason** 🟡
`test.skip`, `xit`, `@pytest.mark.skip`, `pending()`, or `xtest` must include a comment explaining why the test is skipped and referencing a tracking issue. Unconditionally skipped tests with no explanation are silent coverage gaps.
- ❌ `test.skip('should validate input', () => { ... })`
- ✅ `test.skip('should validate input — skipped pending JIRA-456 API mock setup', () => { ... })`

**RL-04 — Real I/O in unit test** 🟡
Test bodies that call real network endpoints, real databases, or real file system paths without mocking are flaky — they fail on network issues, schema changes, or missing fixtures, causing false CI failures.
- ❌ `fetch('https://api.example.com/users')` inside a unit test body with no mock setup
- ✅ Mock the HTTP client: `jest.spyOn(global, 'fetch').mockResolvedValue(...)` or use `msw` for network interception

**RL-05 — Error path not tested** 🟡
If a function or handler added in the diff can throw, return an error, or call `next(err)`, at least one test must exercise that path. Untested error paths are where production bugs hide.
- Flag: New `try/catch` block or explicit `throw` with no corresponding error-case test
- ✅ Add a test that triggers the error condition and asserts the expected error response or thrown message

---

## Resource leaks

**RL-06 — Event listener not cleaned up** 🔴
Event listeners, interval timers, and subscriptions created inside a component lifecycle or `useEffect` must be removed when the component unmounts. Leaked listeners accumulate across navigations and eventually cause memory leaks and phantom callbacks.
- ❌ `useEffect(() => { window.addEventListener('resize', handler) }, [])` with no cleanup return
- ✅ `useEffect(() => { window.addEventListener('resize', handler); return () => window.removeEventListener('resize', handler) }, [])`
- Vue/class-based: set up in `mounted`, remove in `beforeDestroy`/`unmounted`

**RL-07 — I/O resource not closed** 🔴
Database connections, file handles, and network sockets opened manually must be closed in a `finally` block or using a structured resource management pattern (`using`, `with`, `try-with-resources`). Unclosed resources exhaust the connection pool or hit OS file descriptor limits.
- ❌ `const conn = await db.connect(); const rows = await conn.query(...); return rows;` — connection not released on error
- ✅ `try { const rows = await conn.query(...); return rows; } finally { conn.release(); }`

**RL-08 — Unbounded cache or accumulator** 🟡
Module-level `Map`, `Set`, or array values that grow by appending but are never pruned are memory leaks. Flag when items are added unconditionally with no eviction, expiry, or size cap.
- ❌ `const seen = new Map(); // at module level, appended on every request`
- ✅ Add a max-size cap and evict oldest entries, use a TTL cache library, or scope the structure to the request lifetime

---

## Database and I/O performance

**RL-09 — N+1 query** 🔴
A database query executed inside a loop (`.map()`, `.forEach()`, `for...of`) that iterates over an input list creates N separate round trips to the database — one per item. This causes severe latency at scale and can exhaust connection pools.
- ❌ `const users = await Promise.all(ids.map(id => db.findOne({ where: { id } })))`
- ✅ `const users = await db.findMany({ where: { id: { in: ids } } })` — single query with IN clause

**RL-10 — Query on unindexed column** 🟡
A diff that adds a query filtering or ordering by a column that is not a primary key should be accompanied by a migration adding an index on that column. Without an index, the query performs a full table scan that degrades linearly with table size.
- Flag: New `WHERE email = ?` or `ORDER BY createdAt` query with no corresponding `CREATE INDEX` migration in the diff
- ✅ Add `CREATE INDEX idx_users_email ON users(email);` in the migration file

**RL-11 — SELECT \* in hand-written query** 🟡
`SELECT *` fetches all columns including large blobs, JSON, and deprecated fields the application never uses. This wastes network bandwidth and memory, and causes silent breakage when the schema adds new columns with incompatible types.
- ❌ `` db.query(`SELECT * FROM orders WHERE user_id = ?`, [userId]) ``
- ✅ `` db.query(`SELECT id, status, total, created_at FROM orders WHERE user_id = ?`, [userId]) ``

---

## Computation performance

**RL-12 — Missing memoization on expensive computation** 🔵
Expensive operations (sorting, filtering large arrays, regex matching, complex calculations) performed inside a React render function or Vue template expression without memoization run on every render, degrading performance as the component re-renders.
- ❌ `const sorted = items.sort((a, b) => b.date - a.date)` directly in render/return
- ✅ `const sorted = useMemo(() => [...items].sort((a, b) => b.date - a.date), [items])`
- Vue: use a `computed` property instead of an inline expression

**RL-13 — Synchronous I/O in request handler** 🔴
Synchronous file I/O (`fs.readFileSync`, `open()` without async, Python's blocking `read()`) inside a web request handler blocks the entire event loop for the duration of the I/O. All concurrent requests stall until it completes.
- ❌ `const config = fs.readFileSync('./config.json', 'utf8')` inside an Express route handler
- ✅ Load config at startup (outside the handler), or use `await fs.promises.readFile('./config.json', 'utf8')` inside the async handler

---

## Examples

**Good comment:**
```
🔴 [RELIABILITY] RL-09: `db.findUser(id)` called inside `.map()` over `userIds`.
This fires one SQL query per user — if `userIds` has 200 entries, 200 round trips are made sequentially or concurrently, overwhelming the connection pool.
Suggestion: Replace with `db.findUsers({ where: { id: { in: userIds } } })` to batch into a single query.
```

**Good comment:**
```
🟡 [RELIABILITY] RL-01: New function `applyPromoCode(cart, code)` added with no corresponding test.
Suggestion: Add a test covering: valid code applies correct discount, expired code returns an error, and unknown code is rejected.
```

Post one comment per violation. Do not batch multiple rules into a single comment.
