/**
 * ai-reviewer.config.js — optional per-project config
 */
export default {
  // GitHub Models — model names MUST include publisher prefix
  // "openai/gpt-4o-mini"                 → default, free, fast, great for code
  // "openai/gpt-4o"                      → more powerful, still free
  // "meta/Meta-Llama-3.3-70B-Instruct"  → open-source, strong at code
  // "deepseek/DeepSeek-R1"              → strong reasoning
  // "microsoft/Phi-4-mini-instruct"     → lightweight, very fast
  model: "openai/gpt-4o-mini",

  // Built-in skills (Agent Skills format): convention | lint | security | logic | tests | performance | types | unit-test
  // Add custom skills by creating <skill-name>/SKILL.md in .ai-reviewer-skills/
  skills: ["code-quality", "reliability", "security", "correctness"],

  failOnError: true,
  ignorePatterns: [
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    ".min.js", ".min.css", "dist/", "build/", "__snapshots__/",
    ".svg", ".png", ".jpg", ".ico", ".md"
  ],
  maxTokensPerChunk: 3000,
};
