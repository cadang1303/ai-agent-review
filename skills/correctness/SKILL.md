---
name: correctness
description: Reviews diffs for bugs causing wrong results, crashes, or silent data corruption. Covers null/undefined safety, async and promise handling, control flow errors, state mutation bugs, and TypeScript type safety. Use when catching logic errors before production. Replaces the separate logic and types skills.
license: MIT
metadata:
  author: ai-pr-reviewer
  version: "1.0"
---

# Correctness Review

Review the diff for runtime logic errors and type safety violations. Flag only what is visible in the diff — do not speculate about files not shown.

---

## Null and undefined safety

**CR-01 — Unguarded property access**
Any property access or method call on a value that can be `null`, `undefined`, or absent must be guarded before the access.
- ❌ `return user.name.toUpperCase()` when `user` may be null
- ✅ `return user?.name?.toUpperCase() ?? ''`
- Severity: 🔴

**CR-02 — Unguarded array index access**
Accessing `arr[0]` or any fixed index without a prior length or bounds check is unsafe when the array may be empty.
- ❌ `const first = items[0].id` with no `items.length` check
- ✅ `const first = items[0]?.id ?? null`
- Severity: 🟡

**CR-03 — Unsafe type cast bypassing null**
TypeScript `as SomeType` casts that silently bypass `null | undefined` defer a potential crash. Use type narrowing instead.
- ❌ `const name = (user.name as string).trim()` when `name` is `string | null`
- ✅ `if (!user.name) throw new Error('Name required'); const name = user.name.trim()`
- Severity: 🟡

---

## Async and promises

**CR-04 — Missing await**
Every `async` function call returning a Promise inside an `async` function must be `await`ed, or explicitly handled with `.then().catch()`. Missing `await` before `fetch`, DB queries, or file I/O is always a critical error.
- ❌ `const res = fetch(url)` — `res` is a Promise, not a Response
- ✅ `const res = await fetch(url)`
- Severity: 🔴

**CR-05 — Unhandled promise rejection**
`async` functions performing external I/O must wrap `await` calls in `try/catch`, or attach `.catch()`. An unhandled rejection in Node.js crashes the process.
- ❌ `async function load() { const data = await api.get('/users'); }` with no error handling
- ✅ `try { const data = await api.get('/users'); } catch (err) { logger.error(err); throw err; }`
- Severity: 🟡

**CR-06 — Async function referenced but not called**
An async method referenced as a value without `()` is a silent no-op — the function is never executed.
- ❌ `created() { this.fetchData }` — missing `()`
- ✅ `created() { this.fetchData() }` or `created() { void this.fetchData() }`
- Severity: 🔴

**CR-07 — Unbounded Promise.all**
`Promise.all` over a large or unbounded array fires all Promises concurrently and can exhaust DB connections or hit rate limits. Flag when the input array is not bounded by a known small constant.
- ❌ `await Promise.all(userIds.map(id => db.findOne(id)))` where `userIds` may have hundreds of entries
- ✅ Process in fixed-size batches, or use a concurrency-limited utility like `p-limit`
- Severity: 🟡

---

## Control flow

**CR-08 — Missing else/default branch**
An `if/else if` chain or `switch` that handles a finite set of values but has no terminal `else` or `default` silently ignores unexpected values.
- ✅ Add a branch that throws or logs an error for unrecognized inputs
- Severity: 🟡

**CR-09 — Infinite loop**
A loop whose condition variable is never mutated inside the loop body will run forever.
- ❌ `while (i < 10) { processItem(); }` — `i` is never incremented
- ✅ `while (i < 10) { processItem(); i++; }`
- Severity: 🔴

**CR-10 — Off-by-one**
Array iteration must use `< arr.length`, not `<= arr.length`. Slice/substring end indices are exclusive.
- ❌ `for (let i = 0; i <= arr.length; i++)` — accesses `arr[arr.length]` which is `undefined`
- ✅ `for (let i = 0; i < arr.length; i++)`
- Severity: 🔴

**CR-11 — Dead code masking skipped cleanup**
Unlike a pure style issue, flag unreachable code specifically when a required side effect (cleanup, error reporting, resource release) is silently skipped because it follows an unconditional `return` or `throw`.
- ❌ `return result; conn.release();` — connection is never released
- Severity: 🔴

---

## State and mutation

**CR-12 — Direct state mutation in React**
React state must never be mutated directly. Direct assignment bypasses the reactivity system and causes stale UI or missed re-renders.
- ❌ `count = count + 1; setCount(count)` — mutates local variable before setter, causes stale reads
- ✅ `setCount(prev => prev + 1)` — always derive next state from previous
- Severity: 🔴

**CR-13 — useEffect without dependency array**
A React `useEffect` with no second argument (not even `[]`) runs after every render. When the effect performs state updates or API calls, this creates an infinite re-render loop.
- ❌ `useEffect(() => { fetchData(); })` — no `[]`
- ✅ `useEffect(() => { fetchData(); }, [])` or list the correct dependencies
- Severity: 🔴

**CR-14 — Stale closure in loop or callback**
Variables declared with `var` inside loops and captured by reference in async callbacks resolve to their final value, not the value at capture time.
- ❌ `for (var i = 0; i < 5; i++) { setTimeout(() => console.log(i), 100) }` — logs `5` five times
- ✅ Replace `var` with `let`, or explicitly capture: `const n = i; setTimeout(() => console.log(n), 100)`
- Severity: 🟡

---

## TypeScript type safety

**CR-15 — Explicit `any` type**
`any` must not appear in new code. Use `unknown` when the type is genuinely unknown, then narrow with type guards.
- Exception: third-party interop with an explicit comment explaining why
- ❌ `function process(data: any)` → ✅ `function process(data: unknown)`
- Severity: 🟡

**CR-16 — Missing return type annotation**
Non-trivial functions — those with branching logic, async operations, or multiple return paths — should have explicit return type annotations.
- ❌ `async function getUser(id: string) { ... }` with implicit return type
- ✅ `async function getUser(id: string): Promise<User | null> { ... }`
- Severity: 🔵

**CR-17 — Non-null assertion on potentially null value**
The `!` non-null assertion on a value that can legitimately be null defers a crash to runtime with no context.
- ❌ `document.getElementById('root')!.innerHTML = html`
- ✅ `const root = document.getElementById('root'); if (!root) throw new Error('Root element not found'); root.innerHTML = html`
- Severity: 🟡

**CR-18 — Loose equality**
`==` (loose equality) in TypeScript/modern JS is almost always unintentional. Use `===` for type-safe comparison.
- ❌ `if (userId == 0)` — matches both `0` and `''` and `false`
- Exception: `== null` is an accepted pattern for checking both `null` and `undefined` simultaneously — do not flag when this dual-match is clearly the intent
- ✅ `if (userId === 0)` for a specific value check
- Severity: 🟡

---

## Severity guide

Include the rule ID at the start of the `body` field in each JSON comment.
- 🔴 `"severity": "error"` — will crash or produce wrong results in normal usage
- 🟡 `"severity": "warning"` — dangerous patterns likely to cause bugs under certain conditions
- 🔵 `"severity": "info"` — type annotation gaps that reduce safety without immediate runtime impact
