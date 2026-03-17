/**
 * Builds the aggregated summary comment posted to the PR.
 */

export function buildSummary(results, totalErrors, totalWarnings, config) {
  const totalInfo = results
    .flatMap((r) => r.comments)
    .filter((c) => c.severity === "info").length;

  const totalComments = totalErrors + totalWarnings + totalInfo;

  const statusEmoji = totalErrors > 0 ? "🔴" : totalWarnings > 0 ? "🟡" : "✅";
  const statusText =
    totalErrors > 0
      ? `**${totalErrors} error(s) found** — please fix before merging`
      : totalWarnings > 0
      ? `${totalWarnings} warning(s) — review recommended`
      : "All checks passed";

  const modelLabel = config.model.replace("claude-", "").replace(/-\d{8}$/, "");

  const fileRows = results
    .filter((r) => r.comments.length > 0)
    .map((r) => {
      const errors = r.comments.filter((c) => c.severity === "error").length;
      const warnings = r.comments.filter((c) => c.severity === "warning").length;
      const infos = r.comments.filter((c) => c.severity === "info").length;
      const badges = [
        errors ? `🔴 ${errors}` : "",
        warnings ? `🟡 ${warnings}` : "",
        infos ? `🔵 ${infos}` : "",
      ]
        .filter(Boolean)
        .join("  ");
      return `| \`${r.filename}\` | ${badges} |`;
    });

  const filesSection =
    fileRows.length > 0
      ? `\n### Files reviewed\n| File | Issues |\n|---|---|\n${fileRows.join("\n")}\n`
      : "";

  const skillsUsed = config.skills.join(", ");

  return `## ${statusEmoji} AI Code Review

${statusText}

| | Count |
|---|---|
| 🔴 Errors | ${totalErrors} |
| 🟡 Warnings | ${totalWarnings} |
| 🔵 Info | ${totalInfo} |
| 💬 Total comments | ${totalComments} |
${filesSection}
---
<sub>Reviewed by [ai-pr-reviewer](https://github.com/your-org/ai-pr-reviewer) · Model: \`${modelLabel}\` · Skills: ${skillsUsed}</sub>`;
}
