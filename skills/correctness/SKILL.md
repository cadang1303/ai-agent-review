---
name: correctness
description: Reviews code changes for bugs that cause wrong results, crashes, or silent data corruption at runtime. Covers null/undefined safety, async and promise handling, control flow errors, state mutation bugs, and TypeScript type safety violations. Use this skill when you want to catch logic errors before they reach production. This skill replaces and merges the separate logic and types skills.
---

# Correctness Review

You are reviewing a code diff for runtime logic errors and type safety violations. Flag only what is visible in the diff — do not speculate about files not shown.

For each issue found, post a separate comment using this exact format:

```
🔴 [CORRECTNESS] <RULE-ID>: <What the bug is and what goes wrong at runtime>.
Suggestion: <Minimal corrected snippet showing the fix>.
```

Use 🔴 for issues that will crash or produce wrong results in normal usage. Use 🟡 for issues that are dangerous patterns likely to cause bugs under certain conditions. Use 🔵 for type annotation gaps that reduce safety without immediate runtime impact.

---

## Null and undefined safety

**CR-01 — Unguarded property access** 🔴
Any property access or method call on a value that can be `null`, `undefined`, or an absent optional must be guarded. Use optional chaining (`?.`), nullish coalescing (`??`), or an explicit guard before the access.
- ❌ `return user.name.toUpperCase()` when `user` may be null
- ✅ `return user?.name?.toUpperCase() ?? ''`

**CR-02 — Unguarded array index access** 🟡
Accessing `arr[0]` or any fixed index without a prior length or bounds check is unsafe when the array may be empty.
- ❌ `const first = items[0].id` with no `items.length` check
- ✅ `const first = items[0]?.id ?? null`

**CR-03 — Unsafe type cast bypassing null** 🟡
TypeScript `as SomeType` casts that silently bypass `null | undefined` (e.g., `as string` on a `string | null` value) defer a potential crash. Use type narrowing instead.
- ❌ `const name = (user.name as string).trim()` when `name` is `string | null`
- ✅ `if (!user.name) throw new Error(...); const name = user.name.trim();`

---

## Async and promises

**CR-04 — Missing await** 🔴
Every `async` function call that returns a Promise inside an `async` function must be `await`ed, or the Promise must be explicitly handled with `.then().catch()`. A missing `await` before `fetch`, database queries, file I/O, or any function returning `Promise<T>` is always a critical error.
- ❌ `const res = fetch(url)` inside an async function — `res` is a Promise, not a Response
- ✅ `const res = await fetch(url)`

**CR-05 — Unhandled promise rejection** 🟡
`async` functions that perform external I/O must wrap `await` calls in `try/catch`, or attach `.catch()`. An unhandled rejection in Node.js crashes the process; in browsers it silently fails.
- ❌ `async function load() { const data = await api.get('/users'); }` with no error handling
- ✅ Wrap with `try { ... } catch (err) { logger.error(err); throw err; }`

**CR-06 — Async function referenced but not called** 🔴
An async method referenced as a value without being invoked is a silent no-op — the function is never executed.
- ❌ `created() { this.fetchData }` — missing `()`
- ✅ `created() { this.fetchData() }` or `created() { void this.fetchData() }`

**CR-07 — Unbounded Promise.all** 🟡
`Promise.all` over a large or unbounded array fires all Promises concurrently and can exhaust database connections, hit rate limits, or cause memory spikes. Flag when the input array is not bounded by a known small constant.
- ❌ `await Promise.all(userIds.map(id => db.findOne(id)))` where `userIds` may have hundreds of entries
- ✅ Process in batches, or use a concurrency-limited utility

---

## Control flow

**CR-08 — Missing else/default branch** 🟡
An `if/else if` chain or `switch` that handles a finite set of values but has no terminal `else` or `default` silently ignores unexpected values. Add a branch that throws or logs an error for unrecognized inputs.

**CR-09 — Infinite loop** 🔴
A loop whose condition variable is never mutated inside the loop body will run forever.
- ❌ `while (i < 10) { processItem(); }` — `i` is never incremented
- ✅ `while (i < 10) { processItem(); i++; }`

**CR-10 — Off-by-one** 🔴
Array iteration must use `< arr.length`, not `<= arr.length`. Slice/substring end indices are exclusive — flag assumptions that treat them as inclusive.
- ❌ `for (let i = 0; i <= arr.length; i++)` — accesses `arr[arr.length]` which is `undefined`
- ✅ `for (let i = 0; i < arr.length; i++)`

**CR-11 — Dead code after unconditional jump** 🟡
Statements following a `return`, `throw`, or `break` with no conditional path to reach them are unreachable. Unlike NQ-10 (which is a style issue), flag these here when they indicate that a required side effect or cleanup step is silently skipped.

---

## State and mutation

**CR-12 — Direct state mutation** 🔴
React and Vue state must never be mutated directly. Direct assignment to state variables bypasses the reactivity system and causes stale UI, missed re-renders, or runtime errors.
- ❌ `this.count = this.count + 1` in a Vue component
- ❌ `count = count + 1; setCount(count)` in React (mutates before setter)
- ✅ React: `setCount(prev => prev + 1)` — Vue: `this.count += 1` only inside a reactive method using `this`

**CR-13 — useEffect without dependency array** 🔴
A React `useEffect` with no dependency array (`[]`) runs after every render. When the effect performs state updates or API calls this creates an infinite re-render loop.
- ❌ `useEffect(() => { fetchData(); })` — no `[]`
- ✅ `useEffect(() => { fetchData(); }, [])` or list the relevant dependencies

**CR-14 — Stale closure in loop or callback** 🟡
Variables declared with `var` inside loops and captured by reference in async callbacks resolve to their final value, not the value at the time of capture. This causes all callbacks to see the same (last) value.
- ❌ `for (var i = 0; i < 5; i++) { setTimeout(() => console.log(i), 100) }` — logs `5` five times
- ✅ Replace `var` with `let`, or capture the value explicitly: `const captured = i; setTimeout(() => console.log(captured), 100)`

---

## TypeScript type safety

**CR-15 — Explicit `any` type** 🟡
`any` must not appear in new code. Use `unknown` when the type is genuinely unknown, then narrow it with type guards. Exception: third-party interop with an explicit `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comment explaining why.
- ❌ `function process(data: any)` → ✅ `function process(data: unknown)`

**CR-16 — Missing return type annotation** 🔵
Non-trivial functions — those with branching logic, async operations, or multiple return paths — should have explicit return type annotations. TypeScript's inferred `void` vs `Promise<void>` distinction causes subtle bugs at call sites.
- ❌ `async function getUser(id: string) { ... }` with an implicit return type
- ✅ `async function getUser(id: string): Promise<User | null> { ... }`

**CR-17 — Non-null assertion on potentially null value** 🟡
The `!` non-null assertion operator used on a value that can legitimately be `null` defers a crash to runtime with no context. Use an explicit guard instead.
- ❌ `document.getElementById('root')!.innerHTML = html`
- ✅ `const root = document.getElementById('root'); if (!root) throw new Error('Root element not found'); root.innerHTML = html`

**CR-18 — Loose equality** 🟡
Comparing values with `==` (loose equality) in TypeScript/modern JS is almost always unintentional. Always use `===` for explicit, type-safe comparison.
- ❌ `if (userId == null)` — accidentally matches both `null` and `undefined` (may or may not be intended)
- ✅ `if (userId === null || userId === undefined)` or `if (userId == null)` only when the dual-match is explicitly desired and commented

---

## Examples

**Good comment:**
```
🔴 [CORRECTNESS] CR-04: `fetch(url)` is called without `await` inside an async function.
`res` holds an unresolved Promise — calling `res.json()` on the next line will throw `TypeError: res.json is not a function`.
Suggestion: Change to `const res = await fetch(url);`.
```

**Good comment:**
```
🟡 [CORRECTNESS] CR-14: `var i` captured by closure inside `setTimeout` — all callbacks will log the final value of `i` (5), not the value at the time each was scheduled.
Suggestion: Replace `var` with `let` to create a new binding per iteration.
```

Post one comment per violation. Do not batch multiple rules into a single comment.
