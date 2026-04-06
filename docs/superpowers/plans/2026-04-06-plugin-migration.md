# Claude Code Plugin Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the leetcode-skills repository from Windsurf Skills format to Claude Code Plugin format for marketplace distribution

**Architecture:** Add `.claude-plugin/plugin.json` manifest, restructure agents to plugin root, update all documentation to reflect namespaced skill invocation (`/leetcode-skills:algorithm-visualization`), and remove legacy Windsurf-specific install scripts

**Tech Stack:** JSON manifest, Markdown documentation updates, directory restructuring

---

## File Structure Changes

```
BEFORE (Windsurf Skills):
├── skills/
│   └── algorithm-visualization/
│       ├── SKILL.md
│       ├── agents/openai.yaml      # Windsurf agent config
│       ├── assets/
│       ├── references/
│       ├── scripts/
│       └── templates/
├── install.js                      # Windsurf install script
├── install.sh
└── skills-manifest.json            # Windsurf manifest

AFTER (Claude Code Plugin):
├── .claude-plugin/
│   └── plugin.json                 # Plugin manifest
├── skills/
│   └── algorithm-visualization/
│       ├── SKILL.md                # Skill definition
│       ├── assets/
│       ├── references/
│       ├── scripts/
│       └── templates/
├── agents/                         # Plugin-level agents (if any)
├── install.js                      # DEVELOPMENT ONLY (claude --plugin-dir)
└── README.md                       # Updated with plugin usage
```

---

## Task 1: Create Plugin Manifest

**Files:**
- Create: `.claude-plugin/plugin.json`

- [ ] **Step 1: Create plugin.json manifest**

```json
{
  "name": "leetcode-skills",
  "description": "Claude Code plugin for creating interactive algorithm visualization websites for LeetCode problems",
  "version": "1.0.0",
  "author": {
    "name": "fuck-algorithm",
    "url": "https://github.com/fuck-algorithm"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/fuck-algorithm/leetcode-skills.git"
  },
  "homepage": "https://github.com/fuck-algorithm/leetcode-skills",
  "license": "MIT",
  "keywords": [
    "leetcode",
    "algorithm",
    "visualization",
    "education",
    "react",
    "d3"
  ]
}
```

- [ ] **Step 2: Verify plugin structure**

Run: `ls -la .claude-plugin/`
Expected: `plugin.json` exists

- [ ] **Step 3: Commit**

```bash
git add .claude-plugin/
git commit -m "feat(plugin): add Claude Code plugin manifest

Add .claude-plugin/plugin.json with plugin metadata
- name: leetcode-skills
- version: 1.0.0
- full repository and author info"
```

---

## Task 2: Migrate Agents to Plugin Root (Optional)

**Files:**
- Move: `skills/algorithm-visualization/agents/openai.yaml` → `agents/algorithm-visualization.yaml`
- Delete: `skills/algorithm-visualization/agents/` directory

**Note:** Claude Code plugin agents are different from Windsurf agents. This step is optional since the current agent is Windsurf-specific. We may delete it instead of migrating.

- [ ] **Step 1: Decide on agent strategy**

Options:
A. Delete Windsurf agent (it's not compatible with Claude Code)
B. Convert to Claude Code agent format

**Decision:** Delete the Windsurf agent file since Claude Code plugins use a different agent system.

- [ ] **Step 2: Remove Windsurf-specific agent**

```bash
rm -rf skills/algorithm-visualization/agents/
```

- [ ] **Step 3: Verify**

Run: `ls skills/algorithm-visualization/`
Expected: No `agents/` directory

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(plugin): remove Windsurf-specific agent config

Claude Code plugins use different agent system.
Windsurf agent config (agents/openai.yaml) removed."
```

---

## Task 3: Update Install Scripts for Development Use

**Files:**
- Modify: `install.js`
- Modify: `install.sh`
- Modify: `README.md`

- [ ] **Step 1: Update install.js header comment**

Change from:
```javascript
/**
 * Windsurf Skills Installer
 * 
 * This script installs skills from this package to the target project's
 * .windsurf/skills/ directory.
 */
```

To:
```javascript
/**
 * Development Installer for Claude Code Plugin
 * 
 * This script is for development use only.
 * For production, use: claude --plugin-dir ./leetcode-skills
 * or install from marketplace: /plugin install leetcode-skills
 */
```

- [ ] **Step 2: Update target directory in install.js**

Change:
```javascript
const targetSkillsDir = path.join(targetProject, '.windsurf', 'skills');
```

To:
```javascript
const targetSkillsDir = path.join(targetProject, '.claude', 'skills');
```

- [ ] **Step 3: Update install.sh header**

Change:
```bash
# Windsurf Skills Installer
# Usage: ./install.sh [target-project-path]
```

To:
```bash
# Development Installer for Claude Code Plugin
# Usage: ./install.sh [target-project-path]
# 
# For production use:
#   claude --plugin-dir ./leetcode-skills
#   or /plugin install leetcode-skills
```

- [ ] **Step 4: Update target directory in install.sh**

Change:
```bash
TARGET_SKILLS_DIR="${TARGET_PROJECT}/.windsurf/skills"
```

To:
```bash
TARGET_SKILLS_DIR="${TARGET_PROJECT}/.claude/skills"
```

- [ ] **Step 5: Update skills-manifest.json**

Change:
```json
{
  "version": 1,
  "defaultInstallPath": ".windsurf/skills",
  ...
}
```

To:
```json
{
  "version": 1,
  "defaultInstallPath": ".claude/skills",
  ...
}
```

- [ ] **Step 6: Commit**

```bash
git add install.js install.sh skills-manifest.json
git commit -m "refactor(plugin): update install scripts for Claude Code

- Change target directory from .windsurf/skills to .claude/skills
- Update comments to indicate development use only
- Production install via /plugin install or --plugin-dir"
```

---

## Task 4: Update README.md for Plugin Usage

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update installation section**

Replace installation methods section with:

```markdown
## Installation

### Method 1: Install from Marketplace (Recommended)

In Claude Code, run:
```
/plugin install leetcode-skills
```

Then use the skill:
```
/leetcode-skills:algorithm-visualization 帮我为 LeetCode 第 1 题创建算法演示
```

### Method 2: Development Mode

Clone and load directly:
```bash
git clone https://github.com/fuck-algorithm/leetcode-skills.git
claude --plugin-dir ./leetcode-skills
```

### Method 3: Legacy Install (Not Recommended)

For backward compatibility with older setups:
```bash
./install.sh /path/to/your/project
```
```

- [ ] **Step 2: Update usage examples**

Replace all instances of `/algorithm-visualization` with `/leetcode-skills:algorithm-visualization`

Find all:
```bash
grep -n "/algorithm-visualization" README.md
```

Replace with:
```
/leetcode-skills:algorithm-visualization
```

- [ ] **Step 3: Add plugin-specific section**

Add after "快速开始":

```markdown
## Claude Code Plugin 特性

作为 Claude Code 官方插件，本仓库提供：

- **Namespace 隔离**: 技能通过 `/leetcode-skills:algorithm-visualization` 调用
- **自动发现**: 安装后 Claude 自动识别何时使用该技能
- **版本管理**: 通过 `/plugin update leetcode-skills` 更新
- **技能参数**: 支持传递参数如 `/leetcode-skills:algorithm-visualization two-sum`
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs(plugin): update README for Claude Code plugin usage

- Add marketplace installation instructions
- Update skill invocation to use namespace (/leetcode-skills:algorithm-visualization)
- Add plugin features section"
```

---

## Task 5: Update CLAUDE.md for Plugin Development

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add plugin development section**

Add to top of file after "Repository Overview":

```markdown
## Plugin Development

This repository is a **Claude Code Plugin** (not standalone skills).

### Plugin Structure

```
.claude-plugin/plugin.json     # Plugin manifest
skills/                         # Skills directory
└── algorithm-visualization/    # Each subfolder = one skill
    └── SKILL.md               # Skill definition
```

### Testing the Plugin

```bash
# Load plugin in development mode
claude --plugin-dir .

# In Claude Code, test the skill
/leetcode-skills:algorithm-visualization 帮我创建两数之和的可视化
```

### Installing in Production

Users install via:
```
/plugin install leetcode-skills
```
```

- [ ] **Step 2: Update references to skill invocation**

Find and replace:
- `/algorithm-visualization` → `/leetcode-skills:algorithm-visualization`

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(plugin): update CLAUDE.md for plugin development

- Add plugin structure and development workflow
- Update skill invocation examples with namespace
- Add production installation instructions"
```

---

## Task 6: Update SKILL.md for Plugin Context

**Files:**
- Modify: `skills/algorithm-visualization/SKILL.md`

- [ ] **Step 1: Update frontmatter**

Current:
```yaml
---
name: algorithm-visualization
description: 精简版执行规范...
---
```

Keep as-is. The `name` field in SKILL.md is still valid for plugin skills.

- [ ] **Step 2: Add plugin invocation note**

Add after "## 目标":

```markdown
## 调用方式

作为 Claude Code 插件技能，使用以下方式调用：

```
/leetcode-skills:algorithm-visualization 帮我为 LeetCode 第 1 题创建可视化
```

或直接描述需求，Claude 会自动识别并调用本技能。
```

- [ ] **Step 3: Commit**

```bash
git add skills/algorithm-visualization/SKILL.md
git commit -m "docs(plugin): update SKILL.md with plugin invocation

Add namespace invocation example (/leetcode-skills:algorithm-visualization)"
```

---

## Task 7: Verify Plugin Works

- [ ] **Step 1: Verify plugin structure**

```bash
ls -la .claude-plugin/plugin.json
ls -la skills/algorithm-visualization/SKILL.md
```

Expected: Both files exist

- [ ] **Step 2: Validate plugin.json syntax**

```bash
node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json'))" && echo "Valid JSON"
```

Expected: "Valid JSON"

- [ ] **Step 3: Test with claude --plugin-dir (if available)**

```bash
# If claude CLI is installed
claude --plugin-dir . --help 2>/dev/null || echo " Claude CLI not available, skip"
```

- [ ] **Step 4: Commit final changes**

```bash
git add -A
git commit -m "chore(plugin): verify plugin structure and validate manifest

- Validate plugin.json syntax
- Verify required files exist
- Ready for marketplace submission"
```

---

## Task 8: Final QA and Push

- [ ] **Step 1: Run full validation**

```bash
# Check all required files exist
[ -f .claude-plugin/plugin.json ] && echo "✓ plugin.json exists"
[ -f skills/algorithm-visualization/SKILL.md ] && echo "✓ SKILL.md exists"
[ -f README.md ] && echo "✓ README.md exists"
[ -f CLAUDE.md ] && echo "✓ CLAUDE.md exists"

# Check no Windsurf references remain
grep -r "windsurf" . --include="*.md" --include="*.js" --include="*.sh" 2>/dev/null | grep -v ".git" | grep -v "node_modules" && echo "⚠ Windsurf references found" || echo "✓ No Windsurf references"
```

- [ ] **Step 2: Final commit and push**

```bash
git add -A
git commit -m "feat(plugin): complete migration to Claude Code Plugin format

BREAKING CHANGE: Repository now follows Claude Code Plugin specification

Changes:
- Add .claude-plugin/plugin.json manifest
- Update install scripts target to .claude/skills
- Update all documentation for /leetcode-skills:algorithm-visualization invocation
- Remove Windsurf-specific agent config
- Add marketplace installation instructions

Users should now install via:
  /plugin install leetcode-skills

Developers should test via:
  claude --plugin-dir .

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

git push origin main
```

---

## Summary

**Migration complete!** The repository is now a valid Claude Code Plugin.

**For users:**
```
/plugin install leetcode-skills
/leetcode-skills:algorithm-visualization 帮我创建算法可视化
```

**For developers:**
```bash
claude --plugin-dir ./leetcode-skills
```

**Key changes made:**
1. ✓ Created `.claude-plugin/plugin.json` manifest
2. ✓ Removed Windsurf-specific files
3. ✓ Updated install scripts to target `.claude/skills`
4. ✓ Updated all documentation with namespace invocation
5. ✓ Validated plugin structure

**Next steps for marketplace submission:**
Submit to https://claude.ai/settings/plugins/submit or https://platform.claude.com/plugins/submit
