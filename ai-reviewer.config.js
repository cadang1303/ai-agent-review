/**
 * ai-reviewer.config.js — optional per-project config
 * Drop this in your project root to override defaults.
 */
export default {
  // Anthropic Claude models:
  // "claude-haiku-4-5-20251001"  → fastest & cheapest (default — good for testing)
  // "claude-sonnet-4-6"          → best balance of quality and cost (recommended for production)
  // "claude-opus-4-6"            → most capable (for critical/security-sensitive repos)
  model: "claude-haiku-4-5-20251001",

  // Skills: convention | lint | security | logic | tests | performance | types
  skills: ["convention", "lint", "security", "logic", "tests"],

  // Set to false to post comments without blocking the merge
  failOnError: true,

  ignorePatterns: [
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    ".min.js", ".min.css", "dist/", "build/", "__snapshots__/",
    ".svg", ".png", ".jpg", ".ico",
  ],

  maxTokensPerChunk: 3000,
};
