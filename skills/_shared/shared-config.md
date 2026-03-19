---
name: pr-review-shared
description: Shared configuration for all PR review skills (code-quality, correctness, reliability, security). Load this file when any of those skills are active.
---

# PR Review — Shared Config

## Core review principles

- Flag only what is **visible in the diff** — never speculate about files not shown
- Prefer signal over noise: skip purely subjective style unless the diff introduces a clear inconsistency or concrete risk
- Comment only on concrete bugs or high-likelihood patterns — no broad refactors

## Severity guide

| Icon | Level | When to use |
|------|-------|-------------|
| 🔴 `error` | Will crash, produce wrong results, or expose sensitive data in normal usage |
| 🟡 `warning` | Dangerous pattern likely to cause bugs, or maintenance pain under real conditions |
| 🔵 `info` | Clear improvement, low urgency, low noise |

Security violations default to 🔴. Only downgrade to 🟡 when exploitation requires additional conditions beyond the visible code.

## Output format

Include the **rule ID** (e.g. `CR-04`, `SEC-01`) at the start of every comment `body` field.

```json
{
  "rule": "CR-04",
  "severity": "error",
  "body": "CR-04 — Missing await: `fetch(url)` returns a Promise, not a Response. Add `await`."
}
```
