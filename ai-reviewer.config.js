/**
 * ai-reviewer.config.js — optional per-project config
 */
export default {
  // "claude-haiku-4-5-20251001"  → fastest & cheapest (default — good for testing)
  // "claude-sonnet-4-6"          → best balance of quality and cost (recommended)
  // "claude-opus-4-6"            → most capable (for critical repos)
  model: "claude-haiku-4-5-20251001",

  // Built-in skills: convention | lint | security | logic | tests | performance | types | unit-test
  // Add custom skills by creating .md files in .ai-reviewer-skills/
  skills: ["code-quality", "logic", "reliability", "security"],

  failOnError: true,
  ignorePatterns: [
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    ".min.js", ".min.css", "dist/", "build/", "__snapshots__/",
    ".svg", ".png", ".jpg", ".ico",
  ],
  maxTokensPerChunk: 3000,
};
