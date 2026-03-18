/**
 * github.js — GitHub API helpers for comment management
 */

import { SUMMARY_MARKER } from "./summary.js";

// ─────────────────────────────────────────────────────────────────────────────
// Summary comment management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deletes ALL previous summary comments from this bot on this PR.
 *
 * Identification strategy (both must be true):
 *   1. The comment body contains the hidden SUMMARY_MARKER string
 *   2. The comment was posted by a Bot user
 *
 * Paginates through all comments so it works on PRs with many comments.
 */
export async function deletePreviousSummary(
  octokit,
  { owner, repo, pullNumber }
) {
  console.log("🧹  Checking for previous summary comment...");

  let page = 1;
  let deleted = 0;

  while (true) {
    const { data: comments } = await octokit.issues.listComments({
      owner,
      repo,
      issue_number: pullNumber,
      per_page: 100,
      page,
    });

    if (comments.length === 0) break;

    for (const c of comments) {
      const hasMarker = c.body?.includes(SUMMARY_MARKER);
      const isBot = c.user?.type === "Bot";

      // Log what we see to help debug
      if (hasMarker) {
        console.log(
          `   Found marker in comment #${c.id} — user: "${c.user?.login}" type: "${c.user?.type}"`
        );
      }

      if (hasMarker && isBot) {
        try {
          await octokit.issues.deleteComment({ owner, repo, comment_id: c.id });
          console.log(
            `   ✅ Deleted previous summary (comment #${c.id} by ${c.user?.login})`
          );
          deleted++;
        } catch (err) {
          console.warn(
            `   ⚠️  Could not delete comment #${c.id}: ${err.message}`
          );
        }
      }
    }

    if (comments.length < 100) break;
    page++;
  }

  if (deleted === 0) {
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
 * Fingerprint: "<filename>:<line>:<skill>"  e.g. "src/auth.js:12:security"
 *
 *   isResolved = true  → skip from set → bot re-flags if issue still exists
 *   isResolved = false → add to set    → bot skips re-posting
 *   isOutdated = true  → skip from set → bot re-flags on the new line
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
      console.warn(
        `⚠️  Could not fetch review threads via GraphQL: ${err.message}`
      );
      console.warn("   All issues will be re-posted on this run.");
      return unresolved;
    }

    const threads = response?.repository?.pullRequest?.reviewThreads;
    if (!threads) break;

    for (const thread of threads.nodes) {
      if (thread.isResolved) continue; // developer resolved → let bot re-flag
      if (thread.isOutdated) continue; // outdated line     → let bot re-flag

      const comment = thread.comments?.nodes?.[0];
      if (!comment) continue;

      const authorLogin = comment.author?.login ?? "";
      const isBot =
        authorLogin === "github-actions[bot]" || authorLogin.endsWith("[bot]");
      if (!isBot) continue;

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
