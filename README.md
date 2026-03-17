# ai-pr-reviewer

AI-powered pull request code reviewer using **Anthropic Claude**. Skills are plain **Markdown files** — add, edit, or override any skill without touching JavaScript.

---

## Quick start

### 1. Add your Anthropic API key

In your GitHub repo: **Settings → Secrets → Actions → New repository secret**
```
Name:  ANTHROPIC_API_KEY
Value: sk-ant-...
```
Get your key at [console.anthropic.com](https://console.anthropic.com).

### 2. Run setup

```bash
bash /path/to/ai-pr-reviewer/setup.sh
```

### 3. Commit and push

```bash
git add .ai-reviewer .ai-reviewer-skills .github/workflows/ai-review.yml ai-reviewer.config.js
git commit -m "chore: add AI PR reviewer"
git push
```

---

## Project structure after setup

```
your-project/
├── .ai-reviewer/                  ← reviewer engine (committed)
│   ├── package.json
│   ├── skills/                    ← built-in skill .md files
│   │   ├── convention.md
│   │   ├── lint.md
│   │   ├── security.md
│   │   ├── logic.md
│   │   ├── tests.md
│   │   ├── performance.md
│   │   └── types.md
│   └── src/
│       ├── cli.js
│       ├── index.js
│       └── utils/
│           ├── prompt.js          ← loads skills from .md files
│           ├── config.js
│           ├── parser.js
│           ├── chunker.js
│           └── summary.js
├── .ai-reviewer-skills/           ← your custom skill overrides
│   └── SKILL_TEMPLATE.md          ← copy this to create a new skill
├── .github/workflows/
│   └── ai-review.yml
└── ai-reviewer.config.js
```

---

## How skills work

Each skill is a plain `.md` file describing what the AI should look for.
Skill resolution order — **first match wins**:

```
.ai-reviewer-skills/<skill>.md    ← per-project override (your repo)
.ai-reviewer/skills/<skill>.md    ← built-in default
```

### Edit a built-in skill

```bash
# Just edit the file directly
nano .ai-reviewer/skills/security.md
```

### Override a skill for just this project

```bash
# Copy to override folder and edit
cp .ai-reviewer/skills/security.md .ai-reviewer-skills/security.md
nano .ai-reviewer-skills/security.md
```

### Add a completely new skill

```bash
# 1. Create the skill file
cp .ai-reviewer-skills/SKILL_TEMPLATE.md .ai-reviewer-skills/api-design.md
nano .ai-reviewer-skills/api-design.md

# 2. Add it to your config
# ai-reviewer.config.js → skills: ["convention", "lint", "api-design"]
```

That's it — no JavaScript to change, no redeploy.

---

## Built-in skills

| Skill file | What it checks |
|---|---|
| `convention.md` | Naming, formatting, magic numbers, commented code |
| `lint.md` | Unused imports/vars, unreachable code, console.logs |
| `security.md` | Hardcoded secrets, SQL injection, XSS, eval(), path traversal |
| `logic.md` | Off-by-one, unhandled promises, null checks, closure bugs |
| `tests.md` | Missing tests, empty assertions, skipped tests |
| `performance.md` | N+1 queries, missing memoisation, memory leaks |
| `types.md` | TypeScript `any`, missing return types, unsafe casts |

---

## Config

```js
// ai-reviewer.config.js
export default {
  model: "claude-haiku-4-5-20251001",  // cheapest — swap to claude-sonnet-4-6 for production
  skills: ["convention", "lint", "security", "logic", "tests"],
  failOnError: true,
  ignorePatterns: ["dist/", "*.min.js"],
};
```

## Models

| Model | Best for |
|---|---|
| `claude-haiku-4-5-20251001` | Testing, high-volume repos (cheapest) |
| `claude-sonnet-4-6` | Production (recommended) |
| `claude-opus-4-6` | Critical / security-sensitive repos |

---

## Test locally

```bash
ANTHROPIC_API_KEY=sk-ant-... node .ai-reviewer/src/test-local.js
```

---

## Workflow env overrides

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | *(required)* | Your Anthropic API key |
| `GITHUB_TOKEN` | Auto-set | Used for posting PR comments |
| `REVIEWER_MODEL` | `claude-haiku-4-5-20251001` | Override the model |
| `REVIEWER_SKILLS` | all in config | Comma-separated skill list |
| `REVIEWER_FAIL_ON_ERROR` | `true` | Set `"false"` to warn without blocking |
