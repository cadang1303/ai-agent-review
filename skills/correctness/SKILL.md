---
name: correctness
description: Reviews diffs for bugs causing wrong results, crashes, or silent data corruption. Covers null/undefined safety, async and promise handling, control flow errors, state mutation bugs, and TypeScript type safety. Use when catching logic errors before production. Replaces the separate logic and types skills.
---

# Correctness Review

Review only visible diff changes. Comment only on concrete bugs or high-likelihood bug patterns — no stylistic changes or broad refactors.

---

## Null / undefined safety

**CR-01 — Unguarded property access** 🔴
Guard every access on a value that can be `null`, `undefined`, or absent.
- ❌ `return user.name.toUpperCase()` (user may be null) → ✅ `return user?.name?.toUpperCase() ?? ''`

**CR-02 — Unguarded array index** 🟡
Accessing `arr[0]` without a bounds check when the array may be empty.
- ❌ `const first = items[0].id` → ✅ `const first = items[0]?.id ?? null`

**CR-03 — Unsafe cast bypassing null** 🟡
`as SomeType` that silently bypasses `null | undefined`. Use type narrowing instead.
- ❌ `(user.name as string).trim()` when name is `string | null`

---

## Async / promises

**CR-04 — Missing await** 🔴
Every async call inside an `async` function must be `await`ed or explicitly handled with `.then().catch()`.
- ❌ `const res = fetch(url)` → ✅ `const res = await fetch(url)`

**CR-05 — Unhandled promise rejection** 🟡
Flag only when: a fire-and-forget Promise has no `.catch()`, or a `catch {}` swallows errors silently, or a top-level `await` has no error boundary.
- ❌ `void doWork()` (can reject, no `.catch()`) → ✅ `void doWork().catch(err => logger.error(err))`

**CR-06 — Async referenced but not called** 🔴
Async method referenced as a value without `()` is a silent no-op.
- ❌ `created() { this.fetchData }` → ✅ `created() { this.fetchData() }`

**CR-07 — Unbounded Promise.all** 🟡
`Promise.all` over a large/unbounded array exhausts connections or hits rate limits. Process in fixed batches or use `p-limit`.

---

## Control flow

**CR-08 — Missing else/default branch** 🟡
An `if/else if` chain or `switch` over a finite value set with no terminal `else`/`default` silently ignores unexpected values.

**CR-09 — Infinite loop** 🔴
Loop condition variable never mutated inside the loop body.
- ❌ `while (i < 10) { processItem(); }` (i never incremented)

**CR-10 — Off-by-one** 🔴
Use `< arr.length`, not `<= arr.length`. Slice/substring end indices are exclusive.

**CR-11 — Dead code masking skipped cleanup** 🔴
Unreachable code specifically when a cleanup, error report, or resource release is silently skipped.
- ❌ `return result; conn.release();`

---

## State / mutation

**CR-12 — Direct state mutation in React** 🔴
Never mutate state directly. Always use the setter with a functional update.
- ❌ `count = count + 1; setCount(count)` → ✅ `setCount(prev => prev + 1)`

**CR-13 — useEffect without dependency array** 🔴
No second argument means the effect runs after every render — causes infinite loops when the effect does state updates or API calls.
- ❌ `useEffect(() => { fetchData(); })` → ✅ add `[]` or correct deps

**CR-14 — Stale closure in loop** 🟡
`var` inside loops captured by async callbacks resolves to the final value, not the capture-time value.
- ❌ `for (var i = 0; i < 5; i++) { setTimeout(() => console.log(i), 100) }` → ✅ use `let` or capture `const n = i`

---

## TypeScript type safety

**CR-15 — Explicit `any`** 🟡
Use `unknown` + type guards instead. Exception: third-party interop with an explanatory comment.

**CR-16 — Missing return type on public API** 🔵
Non-trivial exported/public functions should have explicit return type annotations. Only flag for APIs added/modified in the diff.
- ❌ `async function getUser(id: string) { ... }` → ✅ `async function getUser(id: string): Promise<User | null>`

**CR-17 — Non-null assertion on nullable** 🟡
`!` on a legitimately-nullable value defers a crash with no context.
- ❌ `document.getElementById('root')!.innerHTML = html`

**CR-18 — Loose equality** 🟡
Use `===`. Exception: `== null` is accepted for checking both `null` and `undefined` simultaneously.
- ❌ `if (userId == 0)` → ✅ `if (userId === 0)`

---

> See `_shared/shared-config.md` for severity guide and output format.