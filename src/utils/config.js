import { existsSync } from "fs";
import { resolve } from "path";
import { pathToFileURL } from "url";

export const GITHUB_MODELS_ENDPOINT = "https://models.github.ai/inference";

export const GITHUB_MODELS = {
  GPT_4O_MINI:   "openai/gpt-4o-mini",
  GPT_4O:        "openai/gpt-4o",
  LLAMA_3_3_70B: "meta/Meta-Llama-3.3-70B-Instruct",
  PHI_4_MINI:    "microsoft/Phi-4-mini-instruct",
  DEEPSEEK_R1:   "deepseek/DeepSeek-R1",
};

const DEFAULTS = {
  model: GITHUB_MODELS.GPT_4O_MINI,
  // Updated to reflect merged skills (code-quality, correctness, reliability replace
  // the old: convention, lint, logic, types, tests, performance)
  skills: ["code-quality", "correctness", "reliability", "security"],
  ignorePatterns: [
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    ".min.js", ".min.css", "dist/", "build/", "__snapshots__/",
    ".svg", ".png", ".jpg", ".md"
  ],
  maxTokensPerChunk: 3000,
  failOnError: true,
  apiKey: undefined,
};

export async function loadConfig(overrides = {}) {
  let config = { ...DEFAULTS };

  if (process.env.GH_MODELS_TOKEN)                    config.apiKey      = process.env.GH_MODELS_TOKEN;
  else if (process.env.GITHUB_TOKEN)                  config.apiKey      = process.env.GITHUB_TOKEN;
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
