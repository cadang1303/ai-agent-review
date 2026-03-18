---
name: convention
description: Reviews code style and naming conventions. Use when checking for naming inconsistencies, magic numbers, formatting issues, commented-out code, or style violations in any language.
license: MIT
metadata:
  author: ai-pr-reviewer
  version: "1.0"
compatibility: Works with any text-based programming language diff.
---

# Convention — Code Style and Naming

Check the diff for the following issues:

## Naming
- **Naming conventions**: camelCase for JS/TS variables and functions, PascalCase for classes and React components, snake_case for Python, UPPER_SNAKE_CASE for constants
- **Single-letter variables** outside of loops or map/filter callbacks (e.g. `x`, `a`, `d`)
- **File/folder naming** inconsistencies (e.g. mixing kebab-case and camelCase filenames)

## Formatting
- **Inconsistent indentation** or mixed tabs and spaces within the same file
- **Inconsistent quote style** — mixing single and double quotes without a clear reason
- **Overly long lines** exceeding 120 characters where a line break would improve readability

## Code hygiene
- **Magic numbers** — numeric literals that should be extracted into named constants (e.g. `if (status === 3)` instead of `if (status === STATUS_PENDING)`)
- **Commented-out code blocks** left in (e.g. `// const old = ...`, `/* TODO remove */`)

## Response format
Return findings as JSON comments with `"skill": "convention"`.
