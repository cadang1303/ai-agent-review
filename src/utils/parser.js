/**
 * parser.js — parses the model's JSON review response.
 */

export function parseReview(rawText, filename) {
  let text = rawText.trim();

  // Strip markdown code fences if model added them despite instructions
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  try {
    const parsed = JSON.parse(text);

    const comments = (parsed.comments ?? [])
      .filter((c) => c && typeof c.body === "string" && c.body.length > 0)
      .map((c) => {
        const line = parseInt(c.line);
        return {
          // Keep null if line is missing/invalid — do NOT fallback to 1.
          // Fallback to 1 causes all bad-line comments to pile up on line 1.
          // The caller in index.js will skip comments with null lines.
          line: Number.isFinite(line) && line > 0 ? line : null,
          skill: String(c.skill ?? "general").toLowerCase(),
          severity: validateSeverity(c.severity),
          body: c.body,
        };
      });

    return {
      comments,
      summary: parsed.summary ?? "",
      score: parseInt(parsed.score) || 100,
    };
  } catch (err) {
    // Best-effort: try to extract any partial JSON object
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return parseReview(match[0], filename);
      } catch {
        // Fall through
      }
    }

    console.warn(`  ⚠️  Could not parse review JSON for ${filename}: ${err.message}`);
    return { comments: [], summary: "Parse error — review skipped.", score: 100 };
  }
}

function validateSeverity(value) {
  const allowed = ["error", "warning", "info"];
  return allowed.includes(value) ? value : "info";
}
