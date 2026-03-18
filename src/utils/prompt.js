/**
 * prompt.js — loads skill instructions from SKILL.md files at runtime.
 *
 * Follows the Agent Skills open format (agentskills.io):
 *   Each skill is a directory containing a SKILL.md file with YAML frontmatter.
 *
 * Skill resolution order (first match wins):
 *   1. <project-root>/.ai-reviewer-skills/<skill>/SKILL.md  (per-project override)
 *   2. <reviewer-root>/skills/<skill>/SKILL.md               (built-in default)
 *
 * The frontmatter is stripped before sending to the model — only the
 * Markdown body (the actual instructions) is included in the prompt.
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const BUILTIN_SKILLS_DIR = resolve(__dirname, "../../skills");
const PROJECT_SKILLS_DIR = resolve(process.cwd(), ".ai-reviewer-skills");

const EXT_LANGUAGE_MAP = {
  ".js":   "JavaScript",
  ".jsx":  "JavaScript (React)",
  ".ts":   "TypeScript",
  ".tsx":  "TypeScript (React)",
  ".py":   "Python",
  ".go":   "Go",
  ".java": "Java",
  ".rb":   "Ruby",
  ".rs":   "Rust",
  ".php":  "PHP",
  ".cs":   "C#",
  ".cpp":  "C++",
  ".c":    "C",
};

/**
 * Strips YAML frontmatter from a SKILL.md file.
 * Returns only the Markdown body (the instructions).
 */
function stripFrontmatter(content) {
  const trimmed = content.trim();
  if (!trimmed.startsWith("---")) return trimmed;
  const end = trimmed.indexOf("\n---", 3);
  if (end === -1) return trimmed;
  return trimmed.slice(end + 4).trim();
}

/**
 * Loads a single skill's instructions from its SKILL.md file.
 * Checks project override first, then built-in.
 * Returns null if not found in either location.
 */
function loadSkill(skillName) {
  // 1. Per-project override: .ai-reviewer-skills/<skill>/SKILL.md
  const projectPath = resolve(PROJECT_SKILLS_DIR, skillName, "SKILL.md");
  if (existsSync(projectPath)) {
    const raw = readFileSync(projectPath, "utf-8");
    console.log(`   Using project skill: ${skillName}`);
    return stripFrontmatter(raw);
  }

  // 2. Built-in: skills/<skill>/SKILL.md
  const builtinPath = resolve(BUILTIN_SKILLS_DIR, skillName, "SKILL.md");
  if (existsSync(builtinPath)) {
    return stripFrontmatter(readFileSync(builtinPath, "utf-8"));
  }

  console.warn(`⚠️  Skill not found: "${skillName}"`);
  console.warn(`    Checked: ${projectPath}`);
  console.warn(`    Checked: ${builtinPath}`);
  return null;
}

/**
 * Builds the full review prompt for a file diff.
 * Loads each enabled skill's SKILL.md body and concatenates them.
 */
export function buildReviewPrompt(filename, patch, enabledSkills) {
  const ext = "." + filename.split(".").pop().toLowerCase();
  const language = EXT_LANGUAGE_MAP[ext] ?? "unknown language";

  const skillInstructions = enabledSkills
    .map(name => loadSkill(name))
    .filter(Boolean)
    .join("\n\n---\n\n");

  return `Review this ${language} diff from file \`${filename}\`.

Apply only the skills listed below. Skip anything not covered by them.
Be concise — only report real issues, not style preferences.

${skillInstructions}

---

Return ONLY valid JSON in this exact shape — no markdown fences, no preamble:
{
  "comments": [
    {
      "line": <integer — the + line number in the diff where the issue is>,
      "skill": "<skill name>",
      "severity": "error" | "warning" | "info",
      "body": "<clear, actionable description of the issue and how to fix it>"
    }
  ],
  "summary": "<1-2 sentence overall assessment>",
  "score": <integer 0-100, where 100 is perfect>
}

If there are no issues: { "comments": [], "summary": "No issues found.", "score": 100 }

Diff:
\`\`\`diff
${patch}
\`\`\``;
}
