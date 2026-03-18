---
name: performance
description: Reviews code diffs for performance issues. Use when checking for N+1 query patterns, missing memoisation, unnecessary object copies, synchronous I/O in async contexts, missing pagination, or memory leaks.
license: MIT
metadata:
  author: ai-pr-reviewer
  version: "1.0"
---

# Performance — Efficiency Concerns

Check the diff for the following issues:

## Database and API
- **N+1 query patterns** — a database or API call inside a loop that could be replaced with a single batched query
- **Missing pagination** — endpoints or queries that fetch all records without a `LIMIT` or page size
- **Unindexed query fields** — filtering or ordering by a column that is likely not indexed (flag only if schema is visible in the diff)

## Computation
- **Missing memoisation** — expensive computations repeated on every render or function call that could be cached (`useMemo`, `useCallback`, `lru-cache`)
- **Unnecessary large object copies** — spreading or cloning large arrays/objects inside hot paths (tight loops, frequent renders)
- **Repeated DOM queries** — calling `document.querySelector` inside a loop instead of caching the reference

## I/O and bundles
- **Synchronous I/O in async contexts** — use of `fs.readFileSync`, `execSync`, or other blocking calls inside a Node.js request handler
- **Large bundle imports** — importing an entire library when only one function is needed (e.g. `import _ from 'lodash'` vs `import debounce from 'lodash/debounce'`)

## Memory
- **Memory leaks** — event listeners or subscriptions added without a corresponding cleanup/unsubscribe

## Response format
Return findings as JSON comments with `"skill": "performance"`.
