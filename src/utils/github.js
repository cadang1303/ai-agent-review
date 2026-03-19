/**
 * github.js — GitHub API helpers
 */

import { SUMMARY_MARKER } from "./summary.js";

// ─────────────────────────────────────────────────────────────────────────────
// Summary comment management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Finds and deletes ALL previous summary comments.
 * Uses GraphQL for full (untruncated) comment bodies.
 * Only logs when a marker is found or deleted — not every comment.
 */
export async function deletePreviousSummary(octokit, { owner, repo, pullNumber }) {
  console.log("🧹  Scanning for previous summary comments...");

  const query = `
    query GetIssueComments($owner: String!, $repo: String!, $number: Int!, $cursor: String) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $number) {
          comments(first: 100, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            nodes {
              databaseId
              body
              author { login }
            }
          }
        }
      }
    }
  `;

  let cursor = null;
  let deleted = 0;

  while (true) {
    let response;
    try {
      response = await octokit.graphql(query, { owner, repo, number: pullNumber, cursor });
    } catch (err) {
      console.warn(`⚠️  GraphQL comment fetch failed: ${err.message}`);
      console.warn("    Falling back to REST...");
      await deletePreviousSummaryREST(octokit, { owner, repo, pullNumber });
      return;
    }

    const comments = response?.repository?.pullRequest?.comments;
    if (!comments) break;

    for (const c of comments.nodes) {
      if (!c.body?.includes(SUMMARY_MARKER)) continue; // skip silently — no log noise

      console.log(`   Found summary #${c.databaseId} by ${c.author?.login}`);
      try {
        await octokit.issues.deleteComment({ owner, repo, comment_id: c.databaseId });
        console.log(`   ✅ Deleted summary #${c.databaseId}`);
        deleted++;
      } catch (err) {
        console.warn(`   ⚠️  Could not delete #${c.databaseId}: ${err.message}`);
      }
    }

    if (!comments.pageInfo.hasNextPage) break;
    cursor = comments.pageInfo.endCursor;
  }

  console.log(deleted === 0 ? "   No previous summary found" : `   Removed ${deleted} old summary comment(s)`);
}

async function deletePreviousSummaryREST(octokit, { owner, repo, pullNumber }) {
  let page = 1;
  while (true) {
    const { data: comments } = await octokit.issues.listComments({
      owner, repo, issue_number: pullNumber, per_page: 100, page,
    });
    if (comments.length === 0) break;
    for (const c of comments) {
      if (!c.body?.includes(SUMMARY_MARKER)) continue;
      try {
        await octokit.issues.deleteComment({ owner, repo, comment_id: c.id });
        console.log(`   ✅ Deleted summary #${c.id} (REST fallback)`);
      } catch (err) {
        console.warn(`   ⚠️  Could not delete #${c.id}: ${err.message}`);
      }
    }
    if (comments.length < 100) break;
    page++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Unresolved inline comment detection (GraphQL)
// ─────────────────────────────────────────────────────────────────────────────

const REVIEW_THREADS_QUERY = `
  query GetReviewThreads($owner: String!, $repo: String!, $number: Int!, $cursor: String) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        reviewThreads(first: 100, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            isResolved
            isOutdated
            comments(first: 1) {
              nodes {
                path
                line
                originalLine
                originalStartLine
                body
                author { login }
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Returns a Set of fingerprints for unresolved bot inline comments.
 * Fingerprint: "<path>:<line>:<skill>"
 *
 * isResolved = true  → not in set → bot re-flags if issue still exists
 * isOutdated = true  → not in set → bot re-flags on new line
 */
export async function getUnresolvedBotComments(octokit, { owner, repo, pullNumber }) {
  const unresolved = new Set();
  let cursor = null;

  console.log("🔍  Fetching existing review threads...");

  while (true) {
    let response;
    try {
      response = await octokit.graphql(REVIEW_THREADS_QUERY, {
        owner, repo, number: pullNumber, cursor,
      });
    } catch (err) {
      console.warn(`⚠️  GraphQL thread fetch failed: ${err.message}`);
      console.warn("   Deduplication disabled for this run.");
      return unresolved;
    }

    const threads = response?.repository?.pullRequest?.reviewThreads;
    if (!threads) break;

    for (const thread of threads.nodes) {
      if (thread.isResolved) continue;
      if (thread.isOutdated) continue;

      const comment = thread.comments?.nodes?.[0];
      if (!comment) continue;

      const authorLogin = comment.author?.login ?? "";
      if (!authorLogin.endsWith("[bot]")) continue;

      const skillMatch = comment.body?.match(/\*\*\[([A-Z-]+)\]\*\*/);
      if (!skillMatch) continue;

      const skill = skillMatch[1].toLowerCase();
      const line  = comment.line ?? comment.originalLine ?? comment.originalStartLine;
      if (!line) continue;

      const base = `${comment.path}:${line}:${skill}`;
      const fpMatch = comment.body?.match(/<!--\s*ai-pr-reviewer-fp:([a-f0-9]{6,40})\s*-->/i);
      const v2 = fpMatch ? `${base}:${fpMatch[1].toLowerCase()}` : null;

      unresolved.add(base);
      if (v2) unresolved.add(v2);
      console.log(`   Unresolved: ${base}${v2 ? " (v2)" : ""}`);
    }

    if (!threads.pageInfo.hasNextPage) break;
    cursor = threads.pageInfo.endCursor;
  }

  console.log(`   Total unresolved: ${unresolved.size}\n`);
  return unresolved;
}
