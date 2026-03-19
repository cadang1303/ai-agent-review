/**
 * chunker.js — splits large unified diffs into chunks within token limits.
 *
 * IMPORTANT: Each chunk preserves its @@ hunk header so that:
 *   1. The model sees the correct context for each hunk
 *   2. We can extract the starting line number from the header
 *      to offset the model's reported line numbers back to file-level
 *
 * Unified diff hunk header format:
 *   @@ -<old_start>,<old_count> +<new_start>,<new_count> @@
 *   new_start = the first line number on the RIGHT side (the new file)
 *   This is what GitHub's createReviewComment API expects as `line`.
 */

const CHARS_PER_TOKEN = 4;

/**
 * Parses the right-side starting line number from a unified diff hunk header.
 * e.g. "@@ -10,6 +83,12 @@ function foo()" → 83
 * Returns null if the header cannot be parsed.
 */
export function parseHunkStartLine(hunkHeader) {
  const match = hunkHeader.match(/@@\s+-\d+(?:,\d+)?\s+\+(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Splits a patch into chunks that fit within maxTokens.
 * Each returned chunk includes:
 *   - patch: the diff text
 *   - startLine: right-side line number where this chunk starts in the file
 *                (null if not parseable — caller should skip line offsetting)
 */
export function chunkPatch(patch, maxTokens = 3000) {
  const maxChars = maxTokens * CHARS_PER_TOKEN;

  if (patch.length <= maxChars) {
    // Single chunk — extract start line from first hunk header
    const firstHeader = patch.match(/^@@[^@]+@@.*$/m)?.[0] ?? "";
    return [{ patch, startLine: parseHunkStartLine(firstHeader) }];
  }

  // Split on hunk header boundaries, keeping the headers
  const parts = patch.split(/(^@@[^@]+@@.*$)/m);

  const chunks = [];
  let current = "";
  let currentStartLine = null;

  for (const part of parts) {
    const isHunkHeader = /^@@[^@]+@@/.test(part);

    // If adding this part exceeds the limit, flush current chunk first
    if (current.length + part.length > maxChars && current.length > 0) {
      chunks.push({ patch: current.trim(), startLine: currentStartLine });
      current = "";
      currentStartLine = null;
    }

    // When we encounter a hunk header and have no start line yet, record it
    if (isHunkHeader && currentStartLine === null) {
      currentStartLine = parseHunkStartLine(part);
    }

    current += part;
  }

  if (current.trim()) {
    chunks.push({ patch: current.trim(), startLine: currentStartLine });
  }

  return chunks.length > 0 ? chunks : [{ patch, startLine: null }];
}
