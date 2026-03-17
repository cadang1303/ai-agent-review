/**
 * prompt.js — loads skill instructions from .md files at runtime.
 *
 * Skill resolution order (first match wins):
 *   1. <project-root>/.ai-reviewer-skills/<skill>.md  (per-project override)
 *   2. <reviewer-root>/skills/<skill>.md              (built-in default)
 *
 * This means any project can override any skill by dropping a .md file
 * into their own .ai-reviewer-skills/ folder — no code changes needed.
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Built-in skills live two levels up from src/utils/
const BUILTIN_SKILLS_DIR = resolve(__dirname, "../../skills");

// Per-project overrides live relative to the process cwd (the project root)
const PROJECT_SKILLS_DIR = resolve(process.cwd(), ".ai-reviewer-skills");

// Map file extensions to language display names
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
 * Loads a single skill's markdown content.
 * Returns null if the skill file doesn't exist in either location.
 */
function loadSkill(skillName) {
  // 1. Check for per-project override first
  const projectPath = resolve(PROJECT_SKILLS_DIR, `${skillName}.md`);
  if (existsSync(projectPath)) {
    return readFileSync(projectPath, "utf-8").trim();
  }

  // 2. Fall back to built-in skill
  const builtinPath = resolve(BUILTIN_SKILLS_DIR, `${skillName}.md`);
  if (existsSync(builtinPath)) {
    return readFileSync(builtinPath, "utf-8").trim();
  }

  console.warn(`⚠️  Skill not found: "${skillName}" (checked ${projectPath} and ${builtinPath})`);
  return null;
}

/**
 * Lists all available skill names from the built-in skills directory.
 */
export async function listAvailableSkills() {
  const { readdirSync } = await import("fs");
  return readdirSync(BUILTIN_SKILLS_DIR)
    .filter(f => f.endsWith(".md"))
    .map(f => f.replace(".md", ""));
}

/**
 * Builds the full review prompt for a given file diff.
 * Loads each enabled skill from its .md file and concatenates them.
 */
export function buildReviewPrompt(filename, patch, enabledSkills) {
  const ext = "." + filename.split(".").pop().toLowerCase();
  const language = EXT_LANGUAGE_MAP[ext] ?? "unknown language";

  // Load and concatenate all enabled skill instructions
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
