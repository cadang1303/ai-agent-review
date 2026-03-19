/**
 * parser.js — parses the model's JSON review response.
 *
 * The model now returns "diffPos" (position in the annotated diff) instead of
 * a file line number. index.js looks up the real line number from the lineMap.
 */

export function parseReview(rawText, filename) {
  let text = rawText.trim();

  // Strip markdown code fences if model added them
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  try {
    const parsed = JSON.parse(text);

    const comments = (parsed.comments ?? [])
      .filter((c) => c && typeof c.body === "string" && c.body.length > 0)
      .map((c) => {
        const diffPos = parseInt(c.diffPos);
        return {
          // diffPos is what the model reports — index.js converts to file line
          diffPos: Number.isFinite(diffPos) && diffPos > 0 ? diffPos : null,
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
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return parseReview(match[0], filename); } catch {}
    }
    console.warn(`  ⚠️  Could not parse review JSON for ${filename}: ${err.message}`);
    return { comments: [], summary: "Parse error — review skipped.", score: 100 };
  }
}

function validateSeverity(value) {
  const allowed = ["error", "warning", "info"];
  return allowed.includes(value) ? value : "info";
}