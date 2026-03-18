#!/usr/bin/env bash
# setup.sh — install ai-pr-reviewer into any project

set -e

REVIEWER_DIR=".ai-reviewer"
WORKFLOW_DIR=".github/workflows"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "🤖  ai-pr-reviewer setup"
echo "────────────────────────"

echo "📁  Copying reviewer into $REVIEWER_DIR/ ..."
mkdir -p "$REVIEWER_DIR"
cp -r "$SCRIPT_DIR/src"      "$REVIEWER_DIR/"
cp -r "$SCRIPT_DIR/skills"   "$REVIEWER_DIR/"
cp    "$SCRIPT_DIR/package.json" "$REVIEWER_DIR/"

cat > "$REVIEWER_DIR/.gitignore" << 'GITIGNORE'
node_modules/
GITIGNORE

# Create .ai-reviewer-skills/ with a template directory
if [ ! -d ".ai-reviewer-skills" ]; then
  mkdir -p ".ai-reviewer-skills/SKILL_TEMPLATE"
  cp "$SCRIPT_DIR/skills/SKILL_TEMPLATE/SKILL.md" ".ai-reviewer-skills/SKILL_TEMPLATE/SKILL.md"
  echo "📝  Created .ai-reviewer-skills/ (add custom skill directories here)"
fi

echo "⚙️   Adding workflow to $WORKFLOW_DIR/ ..."
mkdir -p "$WORKFLOW_DIR"
cp "$SCRIPT_DIR/templates/ai-review.yml" "$WORKFLOW_DIR/ai-review.yml"

if [ ! -f "ai-reviewer.config.js" ]; then
  cp "$SCRIPT_DIR/ai-reviewer.config.js" "ai-reviewer.config.js"
  echo "📋  Created ai-reviewer.config.js"
else
  echo "📋  ai-reviewer.config.js already exists — skipping"
fi

echo ""
echo "✅  Done! Structure:"
echo ""
echo "   $REVIEWER_DIR/skills/           ← built-in skills (Agent Skills format)"
echo "   .ai-reviewer-skills/            ← your custom/override skills go here"
echo "   $WORKFLOW_DIR/ai-review.yml"
echo "   ai-reviewer.config.js"
echo ""
echo "📌  Each skill is a folder with a SKILL.md file — see agentskills.io for the spec"
echo ""
echo "📌  Next steps:"
echo "   1. Add ANTHROPIC_API_KEY in GitHub: Settings → Secrets → Actions"
echo "   2. git add .ai-reviewer .ai-reviewer-skills .github/workflows/ai-review.yml ai-reviewer.config.js"
echo "   3. git commit -m 'chore: add AI PR reviewer'"
echo "   4. git push"
echo ""
