/**
 * debug-comments.js — dumps all PR comments to console so you can see
 * exactly what user.type, user.login, and body look like.
 *
 * Usage:
 *   GITHUB_TOKEN=... GITHUB_REPOSITORY=owner/repo PR_NUMBER=1 node src/debug-comments.js
 */

import { Octokit } from "@octokit/rest";

const octokit   = new Octokit({ auth: process.env.GITHUB_TOKEN });
const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
const pullNumber    = parseInt(process.env.PR_NUMBER);

console.log(`\nDumping all issue comments for PR #${pullNumber} in ${owner}/${repo}\n`);

const { data: comments } = await octokit.issues.listComments({
  owner, repo,
  issue_number: pullNumber,
  per_page: 100,
});

console.log(`Total comments: ${comments.length}\n`);

for (const c of comments) {
  console.log(`--- Comment #${c.id} ---`);
  console.log(`  user.login : "${c.user?.login}"`);
  console.log(`  user.type  : "${c.user?.type}"`);
  console.log(`  has marker : ${c.body?.includes("<!-- ai-pr-reviewer-summary -->")}`);
  console.log(`  body start : ${c.body?.slice(0, 80).replace(/\n/g, "\\n")}`);
  console.log();
}
