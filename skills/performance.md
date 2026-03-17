# Skill: Performance — Efficiency concerns

Check the diff for the following issues:

- **N+1 query patterns** — a database or API call inside a loop that could be replaced with a single batched query
- **Missing memoisation** — expensive computations repeated on every render or function call that could be cached (`useMemo`, `useCallback`, `lru-cache`)
- **Unnecessary large object copies** — spreading or cloning large arrays/objects inside hot paths (tight loops, frequent renders)
- **Synchronous I/O in async contexts** — use of `fs.readFileSync`, `execSync`, or other blocking calls inside a Node.js request handler or event loop
- **Missing pagination** — endpoints or queries that fetch all records without a `LIMIT` or page size
- **Repeated DOM queries** — calling `document.querySelector` or `getElementById` inside a loop instead of caching the reference
- **Unindexed query fields** — filtering or ordering by a column that is likely not indexed (flag only if schema is visible in the diff)
- **Large bundle imports** — importing an entire library when only one function is needed (e.g. `import _ from 'lodash'` vs `import debounce from 'lodash/debounce'`)
- **Memory leaks** — event listeners or subscriptions added without a corresponding cleanup/unsubscribe
