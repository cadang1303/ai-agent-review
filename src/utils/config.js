import { existsSync } from "fs";
import { resolve } from "path";
import { pathToFileURL } from "url";

// GitHub Models endpoint — OpenAI-compatible, free for prototyping
export const GITHUB_MODELS_ENDPOINT = "https://models.github.ai/inference";

// Free models on GitHub Models — names MUST include publisher prefix
// Browse all at: github.com/marketplace/models
export const GITHUB_MODELS = {
  GPT_4O_MINI:   "openai/gpt-4o-mini",                  // default — free, fast, great for code
  GPT_4O:        "openai/gpt-4o",                        // more powerful, still free
  LLAMA_3_3_70B: "meta/Meta-Llama-3.3-70B-Instruct",    // open-source, strong at code
  PHI_4_MINI:    "microsoft/Phi-4-mini-instruct",        // lightweight + very fast
  DEEPSEEK_R1:   "deepseek/DeepSeek-R1",                 // strong reasoning
};

const DEFAULTS = {
  model: GITHUB_MODELS.GPT_4O_MINI,
  skills: ["convention", "lint", "security", "logic", "tests"],
  ignorePatterns: [
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    ".min.js",
    ".min.css",
    "dist/",
    "build/",
    "__snapshots__/",
    ".svg",
    ".png",
    ".jpg",
  ],
  maxTokensPerChunk: 3000,
  failOnError: true,
  apiKey: undefined,
};

export async function loadConfig(overrides = {}) {
  let config = { ...DEFAULTS };

  // GH_MODELS_TOKEN = PAT with models:read scope (required for GitHub Models)
  // GITHUB_TOKEN    = fallback (auto-set by Actions — still needs models:read if used)
  if (process.env.GH_MODELS_TOKEN)                    config.apiKey      = process.env.GH_MODELS_TOKEN;
  else if (process.env.GITHUB_TOKEN)                  config.apiKey      = process.env.GITHUB_TOKEN;

  if (process.env.REVIEWER_MODEL)                     config.model       = process.env.REVIEWER_MODEL;
  if (process.env.REVIEWER_SKILLS)                    config.skills      = process.env.REVIEWER_SKILLS.split(",").map(s => s.trim());
  if (process.env.REVIEWER_FAIL_ON_ERROR === "false") config.failOnError = false;

  // Optional project-level config file
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

  // Programmatic overrides win over everything
  config = { ...config, ...overrides };

  return config;
}
