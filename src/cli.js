#!/usr/bin/env node

import Anthropic from "@anthropic-ai/sdk";
import { Octokit } from "@octokit/rest";
import { createHash } from "crypto";
import { reviewFiles } from "./index.js";
import { loadConfig } from "./utils/config.js";
import { buildSummary } from "./utils/summary.js";
import { deletePreviousSummary, getUnresolvedBotComments } from "./utils/github.js";
import { validateSkills } from "./utils/prompt.js";

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

async function listAllFiles(octokit, { owner, repo, pullNumber }) {
  return octokit.paginate(
    octokit.pulls.listFiles,
    { owner, repo, pull_number: pullNumber, per_page: 100 },
    (response) => response.data
  );
}

async function main() {
  const nodeMajor = parseInt(process.versions.node.split(".")[0], 10);
  if (!Number.isFinite(nodeMajor) || nodeMajor < 24) {
    console.error(`❌  Node.js ${process.versions.node} detected — this project requires Node >= 24.`);
    console.error("    Tip: GitHub Actions uses Node 24 via actions/setup-node.");
    process.exit(1);
  }

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

  // Validate skills up front — warn about typos before doing any API work
  config.skills = validateSkills(config.skills);
  if (config.skills.length === 0) {
    console.error("❌  No valid skills found. Check your ai-reviewer.config.js.");
    process.exit(1);
  }

  console.log(`\n🤖  AI PR Reviewer (powered by Anthropic Claude)`);
  console.log(`📦  Model:  ${config.model}`);
  console.log(`🔑  Key:    ${config.apiKey ? config.apiKey.slice(0, 14) + "..." : "MISSING ❌"}`);
  console.log(`🛠️   Skills: ${config.skills.join(", ")}\n`);

  await testModelAccess(config);

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  console.log(`🔍  Fetching PR #${pullNumber} in ${owner}/${repo}\n`);

  const [{ data: pr }, files, unresolvedComments] = await Promise.all([
    octokit.pulls.get({ owner, repo, pull_number: pullNumber }),
    listAllFiles(octokit, { owner, repo, pullNumber }),
    getUnresolvedBotComments(octokit, { owner, repo, pullNumber }),
  ]);

  const commitSha = pr.head.sha;
  console.log(`📄  Found ${files.length} changed file(s)\n`);

  await deletePreviousSummary(octokit, { owner, repo, pullNumber });

  const results = await reviewFiles(files, config);

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

      const bodyHash = createHash("sha1").update(String(comment.body ?? ""), "utf8").digest("hex").slice(0, 10);
      const fingerprintV1 = `${filename}:${comment.line}:${comment.skill}`;
      const fingerprintV2 = `${fingerprintV1}:${bodyHash}`;

      if (unresolvedComments.has(fingerprintV2) || unresolvedComments.has(fingerprintV1)) {
        console.log(`   ⏭️  Unresolved (skip): ${fingerprintV1}`);
        skippedOld++;
        continue;
      }
      if (postedThisRun.has(fingerprintV2)) {
        console.log(`   ⏭️  Duplicate in run (skip): ${fingerprintV1}`);
        skippedDup++;
        continue;
      }

      const emoji = { error: "🔴", warning: "🟡", info: "🔵" }[comment.severity] ?? "⚪";
      try {
        await octokit.pulls.createReviewComment({
          owner, repo,
          pull_number: pullNumber,
          body: `${emoji} **[${comment.skill.toUpperCase()}]** ${comment.body}\n\n<!-- ai-pr-reviewer-fp:${bodyHash} -->`,
          path: filename,
          line: comment.line,
          commit_id: commitSha,
        });
        postedThisRun.add(fingerprintV2);
        allComments.push({ filename, ...comment });
      } catch (err) {
        console.warn(`   ⚠️  Could not post on ${filename}:${comment.line} — ${err.message}`);
      }
    }
  }

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
