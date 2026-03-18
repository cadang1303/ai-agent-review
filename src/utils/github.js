/**
 * github.js — GitHub API helpers
 */

import { SUMMARY_MARKER } from "./summary.js";

// ─────────────────────────────────────────────────────────────────────────────
// Summary comment management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Finds and deletes ALL previous summary comments.
 * Uses GraphQL to get full (untruncated) comment bodies and handles any
 * number of comments efficiently in one query.
 */
export async function deletePreviousSummary(octokit, { owner, repo, pullNumber }) {
  console.log("🧹  Scanning for previous summary comments (GraphQL)...");

  // GraphQL returns full body text — REST API truncates long comment bodies
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
      response = await octokit.graphql(query, {
        owner, repo, number: pullNumber, cursor,
      });
    } catch (err) {
      console.warn(`⚠️  GraphQL comment fetch failed: ${err.message}`);
      console.warn("    Falling back to REST for summary deletion...");
      await deletePreviousSummaryREST(octokit, { owner, repo, pullNumber });
      return;
    }

    const comments = response?.repository?.pullRequest?.comments;
    if (!comments) break;

    for (const c of comments.nodes) {
      const hasMarker = c.body?.includes(SUMMARY_MARKER);
      console.log(`   #${c.databaseId} author="${c.author?.login}" hasMarker=${hasMarker}`);

      if (hasMarker) {
        try {
          await octokit.issues.deleteComment({
            owner, repo,
            comment_id: c.databaseId,
          });
          console.log(`   ✅ Deleted summary #${c.databaseId}`);
          deleted++;
        } catch (err) {
          console.warn(`   ⚠️  Could not delete #${c.databaseId}: ${err.message}`);
        }
      }
    }

    if (!comments.pageInfo.hasNextPage) break;
    cursor = comments.pageInfo.endCursor;
  }

  console.log(deleted === 0 ? "   No previous summary found" : `   Removed ${deleted} old summary comment(s)`);
}

// REST fallback in case GraphQL fails
async function deletePreviousSummaryREST(octokit, { owner, repo, pullNumber }) {
  let page = 1;
  while (true) {
    const { data: comments } = await octokit.issues.listComments({
      owner, repo, issue_number: pullNumber, per_page: 100, page,
    });
    if (comments.length === 0) break;
    for (const c of comments) {
      if (c.body?.includes(SUMMARY_MARKER)) {
        try {
          await octokit.issues.deleteComment({ owner, repo, comment_id: c.id });
          console.log(`   ✅ Deleted summary #${c.id} (REST fallback)`);
        } catch (err) {
          console.warn(`   ⚠️  Could not delete #${c.id}: ${err.message}`);
        }
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
 * Handles null lines (multi-line comments) by falling back to originalLine
 * and then originalStartLine so fingerprints are never "path:null:skill".
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
      if (thread.isResolved) continue; // resolved → allow re-flagging
      if (thread.isOutdated) continue; // outdated → allow re-flagging on new line

      const comment = thread.comments?.nodes?.[0];
      if (!comment) continue;

      const authorLogin = comment.author?.login ?? "";
      if (!authorLogin.endsWith("[bot]")) continue;

      const skillMatch = comment.body?.match(/\*\*\[([A-Z-]+)\]\*\*/);
      if (!skillMatch) continue;

      const skill = skillMatch[1].toLowerCase();

      // Resolve line number — multi-line comments can have null `line`
      const line = comment.line
        ?? comment.originalLine
        ?? comment.originalStartLine;

      if (!line) continue; // genuinely no line info — skip

      const fingerprint = `${comment.path}:${line}:${skill}`;
      unresolved.add(fingerprint);
      console.log(`   Unresolved: ${fingerprint}`);
    }

    if (!threads.pageInfo.hasNextPage) break;
    cursor = threads.pageInfo.endCursor;
  }

  console.log(`   Total unresolved: ${unresolved.size}\n`);
  return unresolved;
}
