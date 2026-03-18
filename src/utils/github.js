/**
 * github.js — GitHub API helpers for comment management
 *
 * Handles two things:
 *   1. deletePreviousSummary        — find and delete the bot's last summary comment
 *   2. getUnresolvedBotComments     — return fingerprints of bot inline comments that
 *                                     are still OPEN (not resolved by the developer)
 *
 * Why GraphQL for resolution status?
 *   The GitHub REST API does not expose whether a review thread is resolved.
 *   Only the GraphQL API has `reviewThreads { isResolved }`.
 *   So we use REST for everything except thread resolution.
 */

import { SUMMARY_MARKER } from "./summary.js";

// ─────────────────────────────────────────────────────────────────────────────
// Summary comment management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deletes the bot's previous summary comment on this PR, if one exists.
 * Identified by the hidden SUMMARY_MARKER inside the comment body.
 */
export async function deletePreviousSummary(
  octokit,
  { owner, repo, pullNumber }
) {
  console.log("🧹  Checking for previous summary comment...");

  const { data: comments } = await octokit.issues.listComments({
    owner,
    repo,
    issue_number: pullNumber,
    per_page: 100,
  });

  const previous = comments.find(
    (c) => c.body?.includes(SUMMARY_MARKER) && c.user?.type === "Bot"
  );

  if (previous) {
    await octokit.issues.deleteComment({
      owner,
      repo,
      comment_id: previous.id,
    });
    console.log(`   ✅ Deleted previous summary (comment #${previous.id})`);
  } else {
    console.log("   No previous summary found");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Unresolved inline comment detection (via GraphQL)
// ─────────────────────────────────────────────────────────────────────────────

const REVIEW_THREADS_QUERY = `
  query GetReviewThreads($owner: String!, $repo: String!, $number: Int!, $cursor: String) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        reviewThreads(first: 100, after: $cursor) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            isResolved
            isOutdated
            comments(first: 1) {
              nodes {
                path
                line
                originalLine
                body
                author {
                  login
                  ... on Bot { login }
                }
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Returns a Set of fingerprints for bot inline comments that are UNRESOLVED.
 *
 * Fingerprint format:  "<filename>:<line>:<skill>"
 * e.g. "src/auth.js:12:security"
 *
 * Logic:
 *   - isResolved = true  → developer marked it resolved → NOT in the set
 *                          → bot will re-flag if the issue still exists in code
 *   - isResolved = false → thread still open → in the set → bot skips re-posting
 *   - isOutdated = true  → comment is on a line that no longer exists in the diff
 *                          → NOT in the set → bot will re-flag on the new line
 */
export async function getUnresolvedBotComments(
  octokit,
  { owner, repo, pullNumber }
) {
  const unresolved = new Set();
  let cursor = null;

  console.log("🔍  Fetching existing review threads...");

  while (true) {
    let response;
    try {
      response = await octokit.graphql(REVIEW_THREADS_QUERY, {
        owner,
        repo,
        number: pullNumber,
        cursor,
      });
    } catch (err) {
      // GraphQL errors are non-fatal — fall back to no deduplication
      console.warn(
        `⚠️  Could not fetch review threads via GraphQL: ${err.message}`
      );
      console.warn("   All issues will be re-posted on this run.");
      return unresolved;
    }

    const threads = response?.repository?.pullRequest?.reviewThreads;
    if (!threads) break;

    for (const thread of threads.nodes) {
      // Skip resolved threads — developer marked this as done
      if (thread.isResolved) continue;

      // Skip outdated threads — the line no longer exists in the current diff
      if (thread.isOutdated) continue;

      const comment = thread.comments?.nodes?.[0];
      if (!comment) continue;

      // Only care about comments from bot accounts
      const authorLogin = comment.author?.login ?? "";
      const isBot =
        authorLogin === "github-actions[bot]" ||
        authorLogin.endsWith("[bot]") ||
        authorLogin === "github-actions";
      if (!isBot) continue;

      // Extract skill tag from body: "🔴 **[SECURITY]** ..."
      const skillMatch = comment.body?.match(/\*\*\[([A-Z-]+)\]\*\*/);
      if (!skillMatch) continue;

      const skill = skillMatch[1].toLowerCase();
      const line = comment.line ?? comment.originalLine;
      const fingerprint = `${comment.path}:${line}:${skill}`;

      unresolved.add(fingerprint);
    }

    if (!threads.pageInfo.hasNextPage) break;
    cursor = threads.pageInfo.endCursor;
  }

  console.log(`   Found ${unresolved.size} unresolved bot comment(s)\n`);
  return unresolved;
}
