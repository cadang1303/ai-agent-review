/**
 * test-local.js — test without a real PR
 *
 * Usage:
 *   GH_MODELS_TOKEN=github_pat_... node src/test-local.js
 *
 * Get a PAT at: github.com/settings/tokens — Permission: Models → Read
 */

import { reviewFiles } from "./index.js";

const MOCK_FILES = [
  {
    filename: "src/auth.js",
    patch: `@@ -0,0 +1,30 @@
+const express = require('express')
+const db = require('../db')
+const router = express.Router()
+
+const ADMIN_PASSWORD = 'hunter2'
+const SECRET_KEY = 'abc123secret'
+
+router.post('/login', async (req, res) => {
+  const username = req.body.username
+  const password = req.body.password
+  const query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'"
+  const user = await db.query(query)
+  if (user) { res.json({ token: 'logged_in', user: user }) }
+})
+
+router.get('/users', async (req, res) => {
+  const users = await db.query('SELECT * FROM users')
+  console.log('All users:', JSON.stringify(users))
+  res.json(users)
+})
+
+function validateEmail(e) { return e.includes('@') }
+module.exports = router`,
  },
  {
    filename: "src/utils/math.js",
    patch: `@@ -0,0 +1,15 @@
+export function average(numbers) {
+  let sum = 0
+  for (let i = 0; i <= numbers.length; i++) { sum += numbers[i] }
+  return sum / numbers.length
+}
+export function divide(a, b) { return a / b }
+export function fetchPrices(ids) {
+  const prices = []
+  for (const id of ids) { prices.push(fetch('/api/price/' + id)) }
+  return prices
+}`,
  },
  {
    filename: "package-lock.json",
    patch: `@@ -1,3 +1,3 @@\n-  "version": "1.0.0"\n+  "version": "1.0.1"`,
  },
];

const token = process.env.GH_MODELS_TOKEN || process.env.GITHUB_TOKEN;
if (!token) {
  console.error("❌  Set GH_MODELS_TOKEN before running.");
  console.error("   Create a PAT at: github.com/settings/tokens (Models → Read)");
  process.exit(1);
}

console.log("🤖  ai-pr-reviewer — local test run");
console.log("📦  Model: openai/gpt-4o-mini (GitHub Models — free)\n");

const results = await reviewFiles(MOCK_FILES, {
  apiKey: token,
  model: "openai/gpt-4o-mini",
  skills: ["code-quality", "logic", "reliability", "security"],
  failOnError: false,
  ignorePatterns: ["package-lock.json"],
});

for (const { filename, comments } of results) {
  if (comments.length === 0) continue;
  console.log(`\n── ${filename} ──`);
  for (const c of comments) {
    const icon = { error: "🔴", warning: "🟡", info: "🔵" }[c.severity] ?? "⚪";
    console.log(`  ${icon} [${c.skill}] line ${c.line}: ${c.body}`);
  }
}

const total = results.flatMap(r => r.comments).length;
console.log(`\n✅  Done — ${total} comment(s) across ${results.length} reviewed file(s)`);
