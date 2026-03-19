export default {
  // "claude-haiku-4-5-20251001"  → fastest & cheapest (default)
  // "claude-sonnet-4-6"          → recommended for production
  // "claude-opus-4-6"            → most capable
  model: "claude-haiku-4-5-20251001",

  skills: ["code-quality", "correctness", "reliability", "security"],
  failOnError: true,
  ignorePatterns: [
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    ".min.js", ".min.css", "dist/", "build/", "__snapshots__/",
    ".svg", ".png", ".jpg", ".ico",
  ],
  maxTokensPerChunk: 3000,
};
