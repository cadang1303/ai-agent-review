/**
 * ai-reviewer.config.js — optional per-project config
 * Drop this in your project root to override defaults.
 */
export default {
  // GitHub Models — model names MUST include publisher prefix
  // "openai/gpt-4o-mini"                 → default, free, fast, great for code
  // "openai/gpt-4o"                      → more powerful, still free
  // "meta/Meta-Llama-3.3-70B-Instruct"  → open-source, strong at code
  // "deepseek/DeepSeek-R1"              → strong reasoning
  // "microsoft/Phi-4-mini-instruct"     → lightweight, very fast
  model: "openai/gpt-4o-mini",

  // Built-in skills: convention | lint | security | logic | tests | performance | types
  // Add custom skills by creating .md files in .ai-reviewer-skills/
  skills: ["convention", "lint", "security", "logic", "tests"],

  failOnError: true,

  ignorePatterns: [
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    ".min.js", ".min.css", "dist/", "build/", "__snapshots__/",
    ".svg", ".png", ".jpg", ".ico",
  ],

  maxTokensPerChunk: 3000,
};
