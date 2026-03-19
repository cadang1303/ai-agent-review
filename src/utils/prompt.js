/**
 * prompt.js — loads skill instructions from SKILL.md files and builds the review prompt.
 *
 * Agent Skills format (agentskills.io):
 *   Each skill is a directory containing a SKILL.md with YAML frontmatter.
 *
 * Skill resolution order (first match wins):
 *   1. <project-root>/.ai-reviewer-skills/<skill>/SKILL.md  ← per-project override
 *   2. <npm-package>/skills/<skill>/SKILL.md                 ← built-in default
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

function stripFrontmatter(content) {
  const trimmed = content.trim();
  if (!trimmed.startsWith("---")) return trimmed;
  const end = trimmed.indexOf("\n---", 3);
  if (end === -1) return trimmed;
  return trimmed.slice(end + 4).trim();
}

function loadSkill(skillName) {
  const projectPath = resolve(PROJECT_SKILLS_DIR, skillName, "SKILL.md");
  if (existsSync(projectPath)) {
    console.log(`   Using project skill override: ${skillName}`);
    return stripFrontmatter(readFileSync(projectPath, "utf-8"));
  }
  const builtinPath = resolve(BUILTIN_SKILLS_DIR, skillName, "SKILL.md");
  if (existsSync(builtinPath)) {
    return stripFrontmatter(readFileSync(builtinPath, "utf-8"));
  }
  console.warn(`⚠️  Skill not found: "${skillName}"`);
  return null;
}

/**
 * Builds the review prompt for one chunk of a diff.
 *
 * @param {string} filename
 * @param {string} patch      - The diff text for this chunk
 * @param {number|null} startLine - Right-side line number of the first line in this chunk.
 *                                  Used to tell the model which line numbers to use.
 * @param {string[]} enabledSkills
 */
export function buildReviewPrompt(filename, patch, startLine, enabledSkills) {
  const ext = "." + filename.split(".").pop().toLowerCase();
  const language = EXT_LANGUAGE_MAP[ext] ?? "unknown language";

  const skillInstructions = enabledSkills
    .map(name => loadSkill(name))
    .filter(Boolean)
    .join("\n\n---\n\n");

  // Tell the model exactly how to count lines so it returns file-level numbers
  const lineInstruction = startLine != null
    ? `The first added line (+) in this diff is line ${startLine} in the file.
Count lines from there when reporting the "line" field — report the actual file line number, not the position within this diff chunk.`
    : `Report the line number of the added (+) line where each issue appears, as it would appear in the file.`;

  return `Review this ${language} diff from file \`${filename}\`.

${lineInstruction}

Apply only the skills listed below. Flag only what is visible in the diff.

${skillInstructions}

---

Return ONLY valid JSON — no markdown fences, no preamble:
{
  "comments": [
    {
      "line": <integer — the file line number of the added (+) line where the issue is>,
      "skill": "<skill name>",
      "severity": "error" | "warning" | "info",
      "body": "<rule ID and clear, actionable description>"
    }
  ],
  "summary": "<1-2 sentence overall assessment>",
  "score": <integer 0-100>
}

Rules for the "line" field:
- Use the RIGHT-SIDE (+) line number as it appears in the actual file, not the diff position
- Only report lines that start with + in the diff (added lines)
- Do NOT report lines starting with - (removed lines) or space (context lines)
- If the issue spans multiple lines, use the first affected + line

If no issues: { "comments": [], "summary": "No issues found.", "score": 100 }

Diff:
\`\`\`diff
${patch}
\`\`\``;
}
