import { existsSync } from "fs";
import { resolve } from "path";
import { pathToFileURL } from "url";

export const ANTHROPIC_MODELS = {
  HAIKU:  "claude-haiku-4-5-20251001",  // fastest & cheapest — great for testing
  SONNET: "claude-sonnet-4-6",           // best balance of quality and cost (recommended)
  OPUS:   "claude-opus-4-6",             // most capable — for critical repos
};

const DEFAULTS = {
  model: ANTHROPIC_MODELS.HAIKU,
  skills: ["code-quality", "correctness", "reliability", "security"],
  ignorePatterns: [
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    ".min.js", ".min.css", "dist/", "build/", "__snapshots__/",
    ".svg", ".png", ".jpg",
  ],
  maxTokensPerChunk: 3000,
  failOnError: true,
  apiKey: undefined,
};

export async function loadConfig(overrides = {}) {
  let config = { ...DEFAULTS };

  if (process.env.ANTHROPIC_API_KEY)                  config.apiKey      = process.env.ANTHROPIC_API_KEY;
  if (process.env.REVIEWER_MODEL)                     config.model       = process.env.REVIEWER_MODEL;
  if (process.env.REVIEWER_SKILLS)                    config.skills      = process.env.REVIEWER_SKILLS.split(",").map(s => s.trim());
  if (process.env.REVIEWER_FAIL_ON_ERROR === "false") config.failOnError = false;

  const configPath = resolve(process.cwd(), "ai-reviewer.config.js");
  if (existsSync(configPath)) {
    try {
      const projectConfig = await import(pathToFileURL(configPath).href);
      config = { ...config, ...(projectConfig.default ?? projectConfig) };
      console.log("📋  Loaded config from ai-reviewer.config.js");
    } catch (err) {
      console.warn(`⚠️  Could not load ai-reviewer.config.js: ${err.message}`);
    }
  }

  config = { ...config, ...overrides };
  return config;
}
