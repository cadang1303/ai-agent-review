/**
 * chunker.js
 *
 * Splits large unified diffs into chunks and builds a line map for each chunk.
 *
 * LINE MAP STRATEGY
 * ─────────────────
 * We cannot rely on the model to count file-level line numbers accurately.
 * Instead we:
 *   1. Number every line in the diff chunk sequentially (1, 2, 3…) — "diff position"
 *   2. Build a map: diff_position → file_line_number  (only for + lines)
 *   3. Ask the model to report the diff position of the problematic line
 *   4. Look up the real file line number in the map before posting to GitHub
 *
 * This keeps the model's job simple (count visible lines 1…N) and puts the
 * coordinate conversion entirely in deterministic code.
 *
 * Unified diff hunk header format:
 *   @@ -<old_start>,<old_count> +<new_start>,<new_count> @@
 *   new_start = first right-side (new file) line number in this hunk
 */

const CHARS_PER_TOKEN = 4;

/**
 * Parses the right-side starting line number from a hunk header.
 * "@@ -10,6 +83,12 @@ fn()" → 83
 */
function parseHunkStartLine(header) {
  const m = header.match(/@@\s+-\d+(?:,\d+)?\s+\+(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Builds a diff-position → file-line-number map for a patch string.
 *
 * Diff position = 1-based index of each line in the patch text (including
 * hunk headers and context lines). GitHub uses this same counting scheme
 * internally.
 *
 * Only + lines (added lines) get a file line number entry because GitHub's
 * createReviewComment API only accepts positions on added or context lines
 * of the right side — and we only want to comment on added code.
 *
 * Returns: Map<diffPosition, fileLineNumber>
 */
export function buildLineMap(patch) {
  const map = new Map(); // diffPosition → fileLineNumber
  const lines = patch.split("\n");

  let diffPos = 0;       // 1-based position within this patch
  let fileLineNo = null; // current right-side line number

  for (const line of lines) {
    diffPos++;

    if (line.startsWith("@@")) {
      // Hunk header — reset file line counter
      fileLineNo = parseHunkStartLine(line);
      // Don't add hunk headers to the map (can't comment on them)
      continue;
    }

    if (fileLineNo === null) continue; // before first hunk

    if (line.startsWith("+")) {
      // Added line — record mapping and advance file line
      map.set(diffPos, fileLineNo);
      fileLineNo++;
    } else if (line.startsWith("-")) {
      // Removed line — only in old file, don't advance right-side counter
    } else {
      // Context line — exists in both files, advance right-side counter
      fileLineNo++;
    }
  }

  return map;
}

/**
 * Annotates the patch with 1-based diff position numbers on each line.
 * The model sees these numbers and reports back which position has an issue.
 *
 * Example output:
 *   [1]  @@ -10,4 +12,5 @@
 *   [2]   context line
 *   [3] + added line        ← model reports diffPos 3
 *   [4]   another context
 *
 * Only + lines are eligible for comments. We mark them clearly.
 */
function annotatePatch(patch) {
  const lines = patch.split("\n");
  let diffPos = 0;
  return lines.map(line => {
    diffPos++;
    const prefix = String(diffPos).padStart(3);
    if (line.startsWith("+")) {
      return `[${prefix}]+ ${line.slice(1)}`; // clearly marks added lines
    } else if (line.startsWith("-")) {
      return `[${prefix}]- ${line.slice(1)}`;
    } else if (line.startsWith("@@")) {
      return `[${prefix}]  ${line}`;
    } else {
      return `[${prefix}]  ${line}`;
    }
  }).join("\n");
}

/**
 * Splits a patch into chunks, each with:
 *   - patch:        original diff text (for context in the prompt)
 *   - annotated:    patch with [NNN] diff-position numbers prepended
 *   - lineMap:      Map<diffPosition, fileLineNumber> for + lines only
 */
export function chunkPatch(patch, maxTokens = 3000) {
  const maxChars = maxTokens * CHARS_PER_TOKEN;

  if (patch.length <= maxChars) {
    return [{
      patch,
      annotated: annotatePatch(patch),
      lineMap: buildLineMap(patch),
    }];
  }

  // Split on hunk headers, keeping them attached to their content
  const parts = patch.split(/(^@@[^@]+@@.*$)/m);
  const chunks = [];
  let current = "";

  for (const part of parts) {
    if (current.length + part.length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = "";
    }
    current += part;
  }
  if (current.trim()) chunks.push(current.trim());

  return (chunks.length > 0 ? chunks : [patch]).map(p => ({
    patch: p,
    annotated: annotatePatch(p),
    lineMap: buildLineMap(p),
  }));
}