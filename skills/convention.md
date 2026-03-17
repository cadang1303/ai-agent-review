# Skill: Convention — Code style and naming

Check the diff for the following issues:

- **Naming conventions**: camelCase for JS/TS variables and functions, PascalCase for classes and React components, snake_case for Python, UPPER_SNAKE_CASE for constants
- **Single-letter variables** outside of loops or map/filter callbacks (e.g. `x`, `a`, `d`)
- **Inconsistent indentation** or mixed tabs and spaces within the same file
- **Magic numbers** — numeric literals that should be extracted into named constants (e.g. `if (status === 3)` instead of `if (status === STATUS_PENDING)`)
- **Commented-out code blocks** left in (e.g. `// const old = ...`, `/* TODO remove */`)
- **Inconsistent quote style** — mixing single and double quotes without a clear reason
- **File/folder naming** inconsistencies (e.g. mixing kebab-case and camelCase filenames)
- **Overly long lines** exceeding 120 characters where a line break would improve readability
