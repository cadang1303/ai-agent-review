/**
 * Splits a large unified diff patch into chunks
 * that fit within the model's context window.
 *
 * Strategy: split on hunk boundaries (@@ ... @@) so each
 * chunk is a coherent set of changes, not a mid-line cut.
 */

const CHARS_PER_TOKEN = 4; // rough estimate

export function chunkPatch(patch, maxTokens = 3000) {
  const maxChars = maxTokens * CHARS_PER_TOKEN;

  // If it fits in one chunk, return as-is
  if (patch.length <= maxChars) return [patch];

  // Split on hunk headers
  const hunkPattern = /^@@[^@]+@@.*$/m;
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

  return chunks.length > 0 ? chunks : [patch];
}
