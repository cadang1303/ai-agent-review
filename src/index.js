/**
 * ai-pr-reviewer — core module
 * Uses GitHub Models (free) via the OpenAI-compatible API.
 * Requires GH_MODELS_TOKEN (PAT with models:read scope) as a GitHub Actions secret.
 */

import OpenAI from "openai";
import { buildReviewPrompt } from "./utils/prompt.js";
import { parseReview } from "./utils/parser.js";
import { chunkPatch } from "./utils/chunker.js";
import { loadConfig, GITHUB_MODELS_ENDPOINT } from "./utils/config.js";

export async function reviewFiles(files, options = {}) {
  const config = options.apiKey ? options : await loadConfig(options);

  if (!config.apiKey) {
    throw new Error(
      "No API key found.\n" +
      "GitHub Models requires a PAT with models:read scope.\n" +
      "→ Create one at: github.com/settings/tokens\n" +
      "→ Add it as a GitHub Actions secret named GH_MODELS_TOKEN"
    );
  }

  const client = new OpenAI({
    baseURL: GITHUB_MODELS_ENDPOINT,
    apiKey: config.apiKey,
    defaultHeaders: { "X-GitHub-Api-Version": "2022-11-28" },
  });

  const allResults = [];

  for (const file of files) {
    if (!file.patch) continue;
    if (shouldSkipFile(file.filename, config.ignorePatterns)) continue;

    console.log(`  Reviewing: ${file.filename}`);

    const chunks = chunkPatch(file.patch, config.maxTokensPerChunk);
    const fileComments = [];

    for (const chunk of chunks) {
      const prompt = buildReviewPrompt(file.filename, chunk, config.skills);

      let response;
      try {
        response = await client.chat.completions.create({
          model: config.model,
          max_tokens: 1024,
          messages: [
            { role: "system", content: getSystemPrompt() },
            { role: "user",   content: prompt },
          ],
        });
      } catch (err) {
        console.error(`  ⚠️  API call failed for ${file.filename}: ${err.message}`);
        if (err.status) console.error(`     Status: ${err.status}`);
        if (err.error)  console.error(`     Detail: ${JSON.stringify(err.error, null, 2)}`);
        continue;
      }

      if (!response?.choices?.length) {
        console.warn(`  ⚠️  Unexpected response shape for ${file.filename}:`);
        console.warn("     ", JSON.stringify(response, null, 2));
        continue;
      }

      const text = response.choices[0].message?.content ?? "";
      const parsed = parseReview(text, file.filename);
      fileComments.push(...parsed.comments);
    }

    allResults.push({ filename: file.filename, comments: fileComments });
  }

  return allResults;
}

function shouldSkipFile(filename, ignorePatterns) {
  return ignorePatterns.some((pattern) => {
    if (pattern instanceof RegExp) return pattern.test(filename);
    return filename.includes(pattern);
  });
}

function getSystemPrompt() {
  return `You are an expert code reviewer embedded in a CI pipeline.
Your job is to review pull request diffs and return structured JSON feedback.
Be concise, actionable, and specific. Focus on real issues, not nitpicks.
Severity levels: "error" (must fix, blocks merge), "warning" (should fix), "info" (suggestion).
Always respond with valid JSON only — no preamble, no markdown fences.`;
}
