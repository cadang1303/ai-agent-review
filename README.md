# ai-pr-reviewer

AI-powered pull request code reviewer using **GitHub Models (free)**. Skills are plain **Markdown files** — add, edit, or override any skill without touching JavaScript.

**Completely free** — uses a GitHub PAT with `models:read` scope. No credit card, no billing.

---

## Quick start

### 1. Create a GitHub PAT with Models access

1. Go to **[github.com/settings/tokens](https://github.com/settings/tokens)** → **Generate new token (fine-grained)**
2. Under **Permissions** → find **Models** → set to **Read**
3. Copy the token (`github_pat_...`)

### 2. Add it as a repo secret

In your GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**
```
Name:  GH_MODELS_TOKEN
Value: github_pat_...
```

### 3. Run setup

```bash
bash /path/to/ai-pr-reviewer/setup.sh
```

### 4. Commit and push

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
│   │   ├── types.md
│   │   └── SKILL_TEMPLATE.md
│   └── src/
│       ├── cli.js
│       ├── index.js
│       └── utils/
│           ├── prompt.js          ← loads skills from .md files at runtime
│           ├── config.js
│           ├── parser.js
│           ├── chunker.js
│           └── summary.js
├── .ai-reviewer-skills/           ← your custom skill overrides
│   └── SKILL_TEMPLATE.md
├── .github/workflows/
│   └── ai-review.yml
└── ai-reviewer.config.js
```

---

## How skills work

Each skill is a plain `.md` file. Resolution order — **first match wins**:

```
.ai-reviewer-skills/<skill>.md    ← per-project override (your repo)
.ai-reviewer/skills/<skill>.md    ← built-in default
```

### Edit a built-in skill
```bash
nano .ai-reviewer/skills/security.md
```

### Override a skill for just this project
```bash
cp .ai-reviewer/skills/security.md .ai-reviewer-skills/security.md
nano .ai-reviewer-skills/security.md
```

### Add a completely custom skill
```bash
cp .ai-reviewer-skills/SKILL_TEMPLATE.md .ai-reviewer-skills/api-design.md
nano .ai-reviewer-skills/api-design.md
# Then add "api-design" to skills: [...] in ai-reviewer.config.js
```

---

## Free models

| Model | Set in config |
|---|---|
| GPT-4o mini *(default)* | `"openai/gpt-4o-mini"` |
| GPT-4o | `"openai/gpt-4o"` |
| Llama 3.3 70B | `"meta/Meta-Llama-3.3-70B-Instruct"` |
| DeepSeek R1 | `"deepseek/DeepSeek-R1"` |
| Phi-4 mini | `"microsoft/Phi-4-mini-instruct"` |

Browse all at [github.com/marketplace/models](https://github.com/marketplace/models).

---

## Built-in skills

| Skill | What it checks |
|---|---|
| `convention.md` | Naming, formatting, magic numbers, commented code |
| `lint.md` | Unused imports/vars, unreachable code, console.logs |
| `security.md` | Hardcoded secrets, SQL injection, XSS, eval(), path traversal |
| `logic.md` | Off-by-one, unhandled promises, null checks, closure bugs |
| `tests.md` | Missing tests, empty assertions, skipped tests |
| `performance.md` | N+1 queries, missing memoisation, memory leaks |
| `types.md` | TypeScript `any`, missing return types, unsafe casts |

---

## Test locally

```bash
GH_MODELS_TOKEN=github_pat_... node .ai-reviewer/src/test-local.js
```

---

## Workflow env overrides

| Variable | Required | Description |
|---|---|---|
| `GH_MODELS_TOKEN` | ✅ Yes | PAT with `models:read` scope |
| `GITHUB_TOKEN` | Auto-set | Used for posting PR comments |
| `REVIEWER_MODEL` | Optional | Override the model |
| `REVIEWER_SKILLS` | Optional | Comma-separated skill list |
| `REVIEWER_FAIL_ON_ERROR` | Optional | Set `"false"` to warn without blocking |
