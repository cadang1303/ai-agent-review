/**
 * chunker.js
 *
 * Splits large unified diffs into chunks and builds a line map for each chunk.
 *
 * LINE MAP STRATEGY
 * ─────────────────
 * We cannot rely on the model to count file-level line numbers accurately.
 * Instead we:
 *   1. Number every line in the diff chunk sequentially [NNN] — "diff position"
 *   2. Build a map: diff_position → file_line_number  (only for + lines)
 *   3. Ask the model to report the diff position of the problematic line
 *   4. Look up the real file line number in the map — no model arithmetic needed
 *
 * SPECIAL LINE HANDLING
 * ─────────────────────
 * "\ No newline at end of file" (backslash marker) is a diff annotation, NOT
 * a real file line. It must be recognised and skipped in both:
 *   - buildLineMap:   don't advance fileLineNo (it's not a real line)
 *   - annotatePatch:  don't assign a diffPos (model must not reference it)
 *
 * Trailing empty strings produced by split("\n") on a patch ending with \n
 * must also be stripped — they'd produce a spurious [NNN] entry in the
 * annotated output and waste a token.
 *
 * CHUNKING RULES
 * ──────────────
 * A chunk MUST always start with a @@ hunk header. We group whole hunks into
 * chunks — never split a hunk mid-content.
 */

const CHARS_PER_TOKEN = 4;
const NO_NEWLINE_MARKER = "\\ No newline at end of file";

/**
 * Returns true for lines that are diff annotations, not real file lines.
 * These lines must not advance fileLineNo and must not get a diffPos.
 */
function isDiffAnnotation(line) {
  return line.startsWith("\\") || line === "";
}

/**
 * Parses the right-side starting line number from a hunk header.
 * "@@ -10,6 +83,12 @@ fn()" → 83
 */
function parseHunkStartLine(header) {
  const m = header.match(/@@\s+-\d+(?:,\d+)?\s+\+(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Splits a patch string into individual hunks.
 * Each hunk starts with its @@ header and includes all following lines
 * until the next @@ header.
 */
function splitIntoHunks(patch) {
  const lines = patch.split("\n");
  const hunks = [];
  let current = [];

  for (const line of lines) {
    if (line.startsWith("@@") && current.length > 0) {
      hunks.push(current.join("\n"));
      current = [];
    }
    current.push(line);
  }
  if (current.length > 0) hunks.push(current.join("\n"));

  return hunks;
}

/**
 * Builds a diff-position → file-line-number map for a patch string.
 *
 * Diff position = 1-based index, counting only real lines (not annotations).
 * Only + lines (added lines) are mapped.
 *
 * Special handling:
 *   "\ No newline at end of file" — skipped entirely (not a real line)
 *   trailing empty string from split("\n") — skipped
 */
export function buildLineMap(patch) {
  const map = new Map();
  const lines = patch.split("\n");
  let diffPos = 0;
  let fileLineNo = null;

  for (const line of lines) {
    // Skip diff annotations and trailing empty strings — they are not real lines
    // and must not consume a diffPos or advance the file line counter
    if (isDiffAnnotation(line)) continue;

    diffPos++;

    if (line.startsWith("@@")) {
      fileLineNo = parseHunkStartLine(line);
      // hunk headers are not file lines — don't add to map
      continue;
    }

    if (fileLineNo === null) continue;

    if (line.startsWith("+")) {
      map.set(diffPos, fileLineNo);
      fileLineNo++;
    } else if (line.startsWith("-")) {
      // removed line — right-side counter does not advance
    } else {
      // context line (starts with space) — advances right-side counter
      fileLineNo++;
    }
  }

  return map;
}

/**
 * Annotates the patch with [NNN] position numbers on each line.
 * The model sees these and reports back which [NNN] has an issue.
 *
 * Diff annotations ("\ No newline") and trailing empty lines are excluded
 * so that the [NNN] sequence matches the lineMap keys exactly.
 *
 * Example output:
 *   [  1] @@ -10,4 +12,5 @@
 *   [  2]  context line
 *   [  3]+ added line        ← model reports diffPos 3
 *   [  4]  another context
 */
function annotatePatch(patch) {
  const lines = patch.split("\n");
  const annotated = [];
  let diffPos = 0;

  for (const line of lines) {
    // Skip annotations — no diffPos assigned, not shown to model
    if (isDiffAnnotation(line)) continue;

    diffPos++;
    const n = String(diffPos).padStart(3);

    if (line.startsWith("+"))  annotated.push(`[${n}]+ ${line.slice(1)}`);
    else if (line.startsWith("-")) annotated.push(`[${n}]- ${line.slice(1)}`);
    else if (line.startsWith("@@")) annotated.push(`[${n}]  ${line}`);
    else annotated.push(`[${n}]  ${line}`);
  }

  return annotated.join("\n");
}

/**
 * Splits a patch into chunks, each guaranteed to start with a @@ header.
 *
 * Each returned chunk has:
 *   - patch:      original diff text
 *   - annotated:  diff with [NNN] position numbers (annotations excluded)
 *   - lineMap:    Map<diffPosition, fileLineNumber>
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

  const hunks = splitIntoHunks(patch);
  const chunks = [];
  let currentHunks = [];
  let currentLen = 0;

  for (const hunk of hunks) {
    if (currentLen + hunk.length > maxChars && currentHunks.length > 0) {
      const str = currentHunks.join("\n");
      chunks.push({ patch: str, annotated: annotatePatch(str), lineMap: buildLineMap(str) });
      currentHunks = [];
      currentLen = 0;
    }
    currentHunks.push(hunk);
    currentLen += hunk.length;
  }

  if (currentHunks.length > 0) {
    const str = currentHunks.join("\n");
    chunks.push({ patch: str, annotated: annotatePatch(str), lineMap: buildLineMap(str) });
  }

  return chunks.length > 0 ? chunks : [{
    patch,
    annotated: annotatePatch(patch),
    lineMap: buildLineMap(patch),
  }];
}
