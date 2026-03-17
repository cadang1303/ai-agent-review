#!/usr/bin/env bash
# setup.sh — install ai-pr-reviewer into any project
# Usage: bash /path/to/ai-pr-reviewer/setup.sh

set -e

REVIEWER_DIR=".ai-reviewer"
WORKFLOW_DIR=".github/workflows"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "🤖  ai-pr-reviewer setup"
echo "────────────────────────"

# 1. Copy reviewer source + skills into .ai-reviewer/
echo "📁  Copying reviewer into $REVIEWER_DIR/ ..."
mkdir -p "$REVIEWER_DIR"
cp -r "$SCRIPT_DIR/src"      "$REVIEWER_DIR/"
cp -r "$SCRIPT_DIR/skills"   "$REVIEWER_DIR/"
cp    "$SCRIPT_DIR/package.json" "$REVIEWER_DIR/"

# 2. Ignore node_modules
cat > "$REVIEWER_DIR/.gitignore" << 'GITIGNORE'
node_modules/
GITIGNORE

# 3. Create .ai-reviewer-skills/ for per-project skill overrides
if [ ! -d ".ai-reviewer-skills" ]; then
  mkdir -p ".ai-reviewer-skills"
  cp "$SCRIPT_DIR/skills/SKILL_TEMPLATE.md" ".ai-reviewer-skills/SKILL_TEMPLATE.md"
  echo "📝  Created .ai-reviewer-skills/ (drop custom .md files here to override skills)"
fi

# 4. Copy GitHub Actions workflow
echo "⚙️   Adding workflow to $WORKFLOW_DIR/ ..."
mkdir -p "$WORKFLOW_DIR"
cp "$SCRIPT_DIR/templates/ai-review.yml" "$WORKFLOW_DIR/ai-review.yml"

# 5. Copy example config if none exists
if [ ! -f "ai-reviewer.config.js" ]; then
  cp "$SCRIPT_DIR/ai-reviewer.config.js" "ai-reviewer.config.js"
  echo "📋  Created ai-reviewer.config.js"
else
  echo "📋  ai-reviewer.config.js already exists — skipping"
fi

echo ""
echo "✅  Done! Files added:"
echo ""
echo "   $REVIEWER_DIR/              ← reviewer source + built-in skills"
echo "   .ai-reviewer-skills/        ← drop custom skill .md files here"
echo "   $WORKFLOW_DIR/ai-review.yml"
echo "   ai-reviewer.config.js"
echo ""
echo "📌  Next steps:"
echo "   1. Add secret in GitHub: Settings → Secrets → ANTHROPIC_API_KEY"
echo "   2. git add .ai-reviewer .ai-reviewer-skills .github/workflows/ai-review.yml ai-reviewer.config.js"
echo "   3. git commit -m 'chore: add AI PR reviewer'"
echo "   4. git push"
echo ""
