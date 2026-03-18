#!/usr/bin/env node

import Anthropic from "@anthropic-ai/sdk";
import { Octokit } from "@octokit/rest";
import { reviewFiles } from "./index.js";
import { loadConfig } from "./utils/config.js";
import { buildSummary } from "./utils/summary.js";
import { deletePreviousSummary, getUnresolvedBotComments } from "./utils/github.js";

async function testModelAccess(config) {
  console.log(`🧪  Testing model access: ${config.model}`);
  const client = new Anthropic({ apiKey: config.apiKey });
  try {
    const res = await client.messages.create({
      model: config.model,
      max_tokens: 16,
      messages: [{ role: "user", content: "Reply with: ok" }],
    });
    const reply = res.content?.find(b => b.type === "text")?.text?.trim();
    console.log(`✅  Model reachable — response: "${reply}"\n`);
  } catch (err) {
    console.error(`❌  Model access failed!`);
    console.error(`    Model:  ${config.model}`);
    console.error(`    Error:  ${err.message}`);
    if (err.status) console.error(`    Status: ${err.status}`);
    if (err.error)  console.error(`    Detail: ${JSON.stringify(err.error, null, 2)}`);
    process.exit(1);
  }
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("❌  Missing ANTHROPIC_API_KEY.");
    console.error("    → Get your key at: console.anthropic.com");
    console.error("    → Add it as a GitHub Actions secret named ANTHROPIC_API_KEY");
    process.exit(1);
  }
  if (!process.env.GITHUB_TOKEN) {
    console.error("❌  Missing GITHUB_TOKEN (auto-set by GitHub Actions).");
    process.exit(1);
  }
  if (!process.env.GITHUB_REPOSITORY) {
    console.error("❌  Missing GITHUB_REPOSITORY env var.");
    process.exit(1);
  }

  const config = await loadConfig();
  const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
  const pullNumber = parseInt(
    process.env.PR_NUMBER || process.env.GITHUB_REF?.match(/\/(\d+)\//)?.[1]
  );
  if (!pullNumber || isNaN(pullNumber)) {
    console.error("❌  Could not determine PR number. Set PR_NUMBER env var.");
    process.exit(1);
  }

  console.log(`\n🤖  AI PR Reviewer (powered by Anthropic Claude)`);
  console.log(`📦  Model: ${config.model}`);
  console.log(`🔑  Key:   ${config.apiKey ? config.apiKey.slice(0, 14) + "..." : "MISSING ❌"}\n`);

  await testModelAccess(config);

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  console.log(`🔍  Fetching PR #${pullNumber} in ${owner}/${repo}\n`);

  // ── Step 1: fetch all PR data + unresolved threads in parallel ─────────────
  const [{ data: pr }, { data: files }, unresolvedComments] = await Promise.all([
    octokit.pulls.get({ owner, repo, pull_number: pullNumber }),
    octokit.pulls.listFiles({ owner, repo, pull_number: pullNumber, per_page: 100 }),
    getUnresolvedBotComments(octokit, { owner, repo, pullNumber }),
  ]);

  const commitSha = pr.head.sha;
  console.log(`📄  Found ${files.length} changed file(s)\n`);

  // ── Step 2: delete old summary BEFORE running the AI (runs early) ──────────
  await deletePreviousSummary(octokit, { owner, repo, pullNumber });

  // ── Step 3: run AI review ──────────────────────────────────────────────────
  const results = await reviewFiles(files, config);

  // ── Step 4: post inline comments with deduplication ───────────────────────
  const postedThisRun = new Set();
  let totalErrors   = 0;
  let totalWarnings = 0;
  let skippedOld    = 0;
  let skippedDup    = 0;
  const allComments = [];

  for (const { filename, comments } of results) {
    for (const comment of comments) {
      if (comment.severity === "error")   totalErrors++;
      if (comment.severity === "warning") totalWarnings++;

      const fingerprint = `${filename}:${comment.line}:${comment.skill}`;

      if (unresolvedComments.has(fingerprint)) {
        console.log(`   ⏭️  Unresolved (skip): ${fingerprint}`);
        skippedOld++;
        continue;
      }
      if (postedThisRun.has(fingerprint)) {
        console.log(`   ⏭️  Duplicate in run (skip): ${fingerprint}`);
        skippedDup++;
        continue;
      }

      const emoji = { error: "🔴", warning: "🟡", info: "🔵" }[comment.severity] ?? "⚪";
      try {
        await octokit.pulls.createReviewComment({
          owner, repo,
          pull_number: pullNumber,
          body: `${emoji} **[${comment.skill.toUpperCase()}]** ${comment.body}`,
          path: filename,
          line: comment.line,
          commit_id: commitSha,
        });
        postedThisRun.add(fingerprint);
        allComments.push({ filename, ...comment });
      } catch (err) {
        console.warn(`   ⚠️  Could not post on ${filename}:${comment.line} — ${err.message}`);
      }
    }
  }

  // ── Step 5: post fresh summary ─────────────────────────────────────────────
  const summary = buildSummary(results, totalErrors, totalWarnings, config);
  await octokit.issues.createComment({
    owner, repo, issue_number: pullNumber, body: summary,
  });

  console.log(`\n✅  Review complete`);
  console.log(`   🔴 Errors:                     ${totalErrors}`);
  console.log(`   🟡 Warnings:                   ${totalWarnings}`);
  console.log(`   💬 New comments posted:        ${allComments.length}`);
  console.log(`   ⏭️  Skipped (still open):       ${skippedOld}`);
  console.log(`   ⏭️  Skipped (dup in this run):  ${skippedDup}`);

  if (config.failOnError && totalErrors > 0) {
    console.log(`\n❌  Failing CI: ${totalErrors} error(s) found`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\nFatal error:", err.message);
  console.error(err.stack);
  process.exit(1);
});
