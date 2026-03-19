/**
 * prompt.js — loads skill instructions and builds the review prompt.
 *
 * LINE NUMBER APPROACH
 * ────────────────────
 * The diff sent to the model has each line prefixed with [NNN] where NNN is
 * the diff position (1-based, annotations excluded). The model reports which
 * [NNN] position has an issue. index.js looks up the real file line number
 * from the lineMap built by chunker.js.
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUILTIN_SKILLS_DIR = resolve(__dirname, "../../skills");
const PROJECT_SKILLS_DIR = resolve(process.cwd(), ".ai-reviewer-skills");

const EXT_LANGUAGE_MAP = {
  ".js":   "JavaScript",  ".jsx": "JavaScript (React)",
  ".ts":   "TypeScript",  ".tsx": "TypeScript (React)",
  ".py":   "Python",      ".go":  "Go",
  ".java": "Java",        ".rb":  "Ruby",
  ".rs":   "Rust",        ".php": "PHP",
  ".cs":   "C#",          ".cpp": "C++",
  ".c":    "C",
};

// Cache skill content after first read — skills don't change during a run.
// Avoids O(files × chunks × skills) synchronous disk reads.
const skillCache = new Map();

function stripFrontmatter(content) {
  const trimmed = content.trim();
  if (!trimmed.startsWith("---")) return trimmed;
  const end = trimmed.indexOf("\n---", 3);
  if (end === -1) return trimmed;
  return trimmed.slice(end + 4).trim();
}

function loadSkill(skillName) {
  if (skillCache.has(skillName)) return skillCache.get(skillName);

  // 1. Per-project override
  const projectPath = resolve(PROJECT_SKILLS_DIR, skillName, "SKILL.md");
  if (existsSync(projectPath)) {
    console.log(`   Using project skill override: ${skillName}`);
    const content = stripFrontmatter(readFileSync(projectPath, "utf-8"));
    skillCache.set(skillName, content);
    return content;
  }

  // 2. Built-in
  const builtinPath = resolve(BUILTIN_SKILLS_DIR, skillName, "SKILL.md");
  if (existsSync(builtinPath)) {
    const content = stripFrontmatter(readFileSync(builtinPath, "utf-8"));
    skillCache.set(skillName, content);
    return content;
  }

  // Cache null so we warn only once per skill name, not on every chunk
  skillCache.set(skillName, null);
  console.warn(`⚠️  Skill not found: "${skillName}" — it will be skipped.`);
  console.warn(`    Checked: ${projectPath}`);
  console.warn(`    Checked: ${builtinPath}`);
  return null;
}

/**
 * Validates all skills in the list up front and warns about any missing ones.
 * Call once before starting the review loop.
 */
export function validateSkills(skills) {
  const missing = skills.filter(name => loadSkill(name) === null);
  if (missing.length > 0) {
    console.warn(`⚠️  ${missing.length} skill(s) not found and will be skipped: ${missing.join(", ")}`);
    console.warn(`    Available built-in skills: code-quality, correctness, reliability, security`);
  }
  return skills.filter(name => loadSkill(name) !== null);
}

export function buildReviewPrompt(filename, annotatedPatch, enabledSkills) {
  const ext = "." + filename.split(".").pop().toLowerCase();
  const language = EXT_LANGUAGE_MAP[ext] ?? "unknown language";

  const skillInstructions = enabledSkills
    .map(name => loadSkill(name))
    .filter(Boolean)
    .join("\n\n---\n\n");

  return `Review this ${language} diff from file \`${filename}\`.

Each line is prefixed with [NNN] where NNN is its position number in this diff.
Lines marked with [NNN]+ are ADDED lines (the ones you can comment on).
Lines marked with [NNN]- are REMOVED lines (do not report these).
Lines marked with [NNN]  are CONTEXT lines (do not report these).

Apply only the skills listed below. Flag only what is visible in the diff.

${skillInstructions}

---

Return ONLY valid JSON — no markdown fences, no preamble:
{
  "comments": [
    {
      "diffPos": <integer — the [NNN] position number of the added (+) line with the issue>,
      "skill": "<skill name>",
      "severity": "error" | "warning" | "info",
      "body": "<rule ID and clear, actionable description>"
    }
  ],
  "summary": "<1-2 sentence overall assessment>",
  "score": <integer 0-100>
}

IMPORTANT for "diffPos":
- Only use [NNN] numbers from lines marked with +
- Use the position of the FIRST problematic added line
- Do NOT use positions from - or context lines

If no issues: { "comments": [], "summary": "No issues found.", "score": 100 }

Diff:
\`\`\`diff
${annotatedPatch}
\`\`\``;
}
