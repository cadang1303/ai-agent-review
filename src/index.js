/**
 * ai-pr-reviewer — core module
 * Uses Anthropic Claude via the official SDK.
 * Requires ANTHROPIC_API_KEY set as a GitHub Actions secret.
 */

import Anthropic from "@anthropic-ai/sdk";
import { buildReviewPrompt } from "./utils/prompt.js";
import { parseReview } from "./utils/parser.js";
import { chunkPatch } from "./utils/chunker.js";
import { loadConfig } from "./utils/config.js";

export async function reviewFiles(files, options = {}) {
  // Accept a pre-resolved config (from cli.js) or resolve from env + defaults
  const config = options.apiKey ? options : await loadConfig(options);

  if (!config.apiKey) {
    throw new Error(
      "No ANTHROPIC_API_KEY found.\n" +
      "→ Get your key at: console.anthropic.com\n" +
      "→ Add it as a GitHub Actions secret named ANTHROPIC_API_KEY\n" +
      "→ Add to workflow env: ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}"
    );
  }

  const client = new Anthropic({ apiKey: config.apiKey });

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
        response = await client.messages.create({
          model: config.model,
          max_tokens: 1024,
          system: getSystemPrompt(),
          messages: [{ role: "user", content: prompt }],
        });
      } catch (err) {
        console.error(`  ⚠️  API call failed for ${file.filename}: ${err.message}`);
        if (err.status)  console.error(`     Status: ${err.status}`);
        if (err.error)   console.error(`     Detail: ${JSON.stringify(err.error, null, 2)}`);
        continue;
      }

      // Anthropic SDK: response.content is an array of blocks
      const textBlock = response.content?.find(b => b.type === "text");
      if (!textBlock) {
        console.warn(`  ⚠️  No text block in response for ${file.filename}`);
        console.warn("     Full response:", JSON.stringify(response, null, 2));
        continue;
      }

      const parsed = parseReview(textBlock.text, file.filename);
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
