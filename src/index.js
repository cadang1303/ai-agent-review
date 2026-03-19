/**
 * ai-pr-reviewer — core module
 * Uses GitHub Models (free) via the OpenAI-compatible API.
 */

import OpenAI from "openai";
import { buildReviewPrompt } from "./utils/prompt.js";
import { parseReview } from "./utils/parser.js";
import { chunkPatch } from "./utils/chunker.js";
import { loadConfig, GITHUB_MODELS_ENDPOINT } from "./utils/config.js";

// Retry an async fn up to maxAttempts times with exponential backoff.
// Only retries on rate-limit (429) and transient server errors (500/502/503/504).
async function withRetry(fn, { maxAttempts = 3, baseDelayMs = 1000 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = err.status ?? err.response?.status;
      const isRetryable = status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
      if (!isRetryable || attempt === maxAttempts) throw err;

      const baseDelay = baseDelayMs * 2 ** (attempt - 1); // 1s, 2s, 4s...
      const jitter = Math.floor(baseDelay * 0.2 * Math.random()); // 0-20% jitter
      const delay = baseDelay + jitter;
      console.warn(`  ⚠️  API error ${status} (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms…`);
      await new Promise(r => setTimeout(r, delay));
      lastErr = err;
    }
  }
  throw lastErr;
}

export async function reviewFiles(files, options = {}) {
  // Always merge with defaults/env/project config to avoid runtime crashes when
  // callers pass only { apiKey } (or other partial overrides).
  const config = await loadConfig(options);

  if (!config.apiKey) {
    throw new Error(
      "No API key found.\n" +
      "→ Create a PAT at: github.com/settings/tokens (Models → Read)\n" +
      "→ Add as repo secret: GH_MODELS_TOKEN"
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

    for (const { annotated, lineMap } of chunks) {
      const prompt = buildReviewPrompt(file.filename, annotated, config.skills);

      let response;
      try {
        response = await withRetry(() =>
          client.chat.completions.create({
            model: config.model,
            max_tokens: 4096,   // increased: 1024 too small for files with many issues
            messages: [
              { role: "system", content: getSystemPrompt() },
              { role: "user",   content: prompt },
            ],
          })
        );
      } catch (err) {
        console.error(`  ⚠️  API call failed for ${file.filename}: ${err.message}`);
        if (err.status) console.error(`     Status: ${err.status}`);
        if (err.error)  console.error(`     Detail: ${JSON.stringify(err.error, null, 2)}`);
        continue;
      }

      if (!response?.choices?.length) {
        console.warn(`  ⚠️  Unexpected response for ${file.filename}`);
        continue;
      }

      const text = response.choices[0].message?.content ?? "";
      const parsed = parseReview(text, file.filename);

      for (const comment of parsed.comments) {
        if (comment.diffPos === null) {
          console.warn(`  ⚠️  Skipping comment with invalid diffPos in ${file.filename}`);
          continue;
        }

        const fileLine = lineMap.get(comment.diffPos);
        if (!fileLine) {
          console.warn(`  ⚠️  diffPos ${comment.diffPos} in ${file.filename} is not an added line — skipping`);
          continue;
        }

        fileComments.push({
          line: fileLine,
          skill: comment.skill,
          severity: comment.severity,
          body: comment.body,
        });
      }
    }

    allResults.push({ filename: file.filename, comments: fileComments });
  }

  return allResults;
}

function shouldSkipFile(filename, ignorePatterns) {
  return ignorePatterns.some((pattern) => {
    if (pattern instanceof RegExp) return pattern.test(filename);
    if (typeof pattern !== "string" || pattern.length === 0) return false;

    // Simple glob support: "*", "?" and "**" (path segments)
    if (pattern.includes("*") || pattern.includes("?")) {
      const re = globToRegExpCached(pattern);
      return re.test(filename);
    }

    // Directory-ish patterns like "dist/" should match prefix
    if (pattern.endsWith("/")) return filename.startsWith(pattern);

    return filename.includes(pattern);
  });
}

const _globCache = new Map();
function globToRegExpCached(glob) {
  const cached = _globCache.get(glob);
  if (cached) return cached;
  const re = globToRegExp(glob);
  _globCache.set(glob, re);
  return re;
}

// Minimal glob -> RegExp converter for ignore patterns.
// - "*"  matches any chars except "/"
// - "**" matches any chars including "/"
// - "?"  matches a single char except "/"
function globToRegExp(glob) {
  const g = String(glob);
  let out = "^";
  for (let i = 0; i < g.length; i++) {
    const c = g[i];

    if (c === "*") {
      const isDouble = g[i + 1] === "*";
      if (isDouble) {
        out += ".*";
        i++;
      } else {
        out += "[^/]*";
      }
      continue;
    }
    if (c === "?") {
      out += "[^/]";
      continue;
    }

    // Escape regex special chars
    if ("\\.^$+()[]{}|".includes(c)) out += "\\" + c;
    else out += c;
  }
  out += "$";
  return new RegExp(out);
}

function getSystemPrompt() {
  return `You are an expert code reviewer embedded in a CI pipeline.
Your job is to review pull request diffs and return structured JSON feedback.
Be concise, actionable, and specific. Focus on real issues, not nitpicks.
Severity levels: "error" (must fix, blocks merge), "warning" (should fix), "info" (suggestion).
Always respond with valid JSON only — no preamble, no markdown fences.`;
}
