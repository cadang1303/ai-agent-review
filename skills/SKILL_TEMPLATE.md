# Skill: [Your Skill Name] — [One-line description]

<!--
HOW TO CREATE A CUSTOM SKILL
─────────────────────────────
1. Copy this file to your project's .ai-reviewer-skills/ folder
2. Rename it to anything you like, e.g. "my-rules.md"
3. Add the skill name to your ai-reviewer.config.js:
      skills: ["convention", "lint", "security", "my-rules"]
4. Commit — the reviewer will pick it up on the next PR

The filename (without .md) becomes the skill name shown in PR comments.
Project skills override built-in skills of the same name.
-->

Check the diff for the following issues:

- **Issue name** — description of what to look for and why it matters
- **Another issue** — description with example if helpful (e.g. `bad code` → `good code`)
- **And so on** — be specific so the model knows exactly what to flag
