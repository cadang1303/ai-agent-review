/**
 * github.js — GitHub API helpers for comment management
 */

import { SUMMARY_MARKER } from "./summary.js";

// Bot login names GitHub Actions uses — checked against user.login
const BOT_LOGINS = new Set(["github-actions[bot]", "github-actions"]);

function isBotComment(user) {
  if (!user) return false;
  // Match by login (most reliable) OR type field
  return (
    BOT_LOGINS.has(user.login) ||
    user.login?.endsWith("[bot]") ||
    user.type === "Bot"
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary comment management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deletes ALL previous summary comments from this bot on this PR.
 * Paginates through ALL comments — works even on busy PRs.
 */
export async function deletePreviousSummary(
  octokit,
  { owner, repo, pullNumber }
) {
  console.log("🧹  Scanning all comments for previous summary...");

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

    // Log every comment briefly so we can diagnose issues
    for (const c of comments) {
      const hasMarker = c.body?.includes(SUMMARY_MARKER);
      const isBot = isBotComment(c.user);

      console.log(
        `   #${c.id} login="${c.user?.login}" type="${c.user?.type}"` +
          ` hasMarker=${hasMarker} isBot=${isBot}`
      );

      if (hasMarker && isBot) {
        try {
          await octokit.issues.deleteComment({ owner, repo, comment_id: c.id });
          console.log(`   ✅ Deleted summary comment #${c.id}`);
          deleted++;
        } catch (err) {
          console.warn(`   ⚠️  Failed to delete #${c.id}: ${err.message}`);
        }
      } else if (hasMarker && !isBot) {
        // Marker found but not a bot — log so we can adjust the check
        console.warn(
          `   ⚠️  Found marker in #${c.id} but not identified as bot — skipping`
        );
        console.warn(`       login="${c.user?.login}" type="${c.user?.type}"`);
        // Delete it anyway — if it has our marker, it's ours
        try {
          await octokit.issues.deleteComment({ owner, repo, comment_id: c.id });
          console.log(
            `   ✅ Deleted summary comment #${c.id} (marker match, ignoring bot check)`
          );
          deleted++;
        } catch (err) {
          console.warn(`   ⚠️  Failed to delete #${c.id}: ${err.message}`);
        }
      }
    }

    if (comments.length < 100) break;
    page++;
  }

  if (deleted === 0) {
    console.log("   No previous summary found");
  } else {
    console.log(`   Removed ${deleted} previous summary comment(s)`);
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
          pageInfo { hasNextPage endCursor }
          nodes {
            isResolved
            isOutdated
            comments(first: 1) {
              nodes {
                path
                line
                originalLine
                body
                author { login ... on Bot { login } }
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
 * Fingerprint: "<filename>:<line>:<skill>"
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
      console.warn(`⚠️  GraphQL fetch failed: ${err.message}`);
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
      if (!authorLogin.endsWith("[bot]") && !BOT_LOGINS.has(authorLogin))
        continue;

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
