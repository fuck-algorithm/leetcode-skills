# GitHub Marketplace 支持实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 leetcode-skills 插件支持 GitHub Marketplace 直接安装

**Architecture:** 通过 GitHub Actions 实现自动化发布流程，配置 GitHub Marketplace listing，使插件可通过 `/plugin install leetcode-skills` 直接安装

**Tech Stack:** GitHub Actions, npm, GitHub Marketplace API

---

## 文件结构

```
.github/
├── workflows/
│   ├── release.yml          # 发布工作流（创建 release + npm publish）
│   └── ci.yml               # CI 工作流（lint/test）
├── marketplace.yml          # GitHub Marketplace 配置文件
.gitignore
README.md                    # 更新安装说明
```

---

## 任务 1: 创建 CI 工作流

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: 创建 CI workflow 文件**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm ci

      - name: Validate skills structure
        run: node scripts/validate-skills.js

      - name: Validate skills manifest
        run: |
          node -e "
            const fs = require('fs');
            const manifest = JSON.parse(fs.readFileSync('skills-manifest.json', 'utf8'));
            if (!manifest.skills || manifest.skills.length === 0) {
              console.error('No skills found in manifest');
              process.exit(1);
            }
            console.log('Manifest valid:', manifest.skills.length, 'skills');
          "
```

---

## 任务 2: 创建 Release 工作流

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: 创建 Release workflow 文件**

```yaml
name: Release

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm ci

      - name: Validate skills
        run: node scripts/validate-skills.js

      - name: Extract version from tag
        id: version
        run: echo "VERSION=${GITHUB_REF#refs/tags/v}" >> $GITHUB_OUTPUT

      - name: Publish to npm
        run: npm publish --access public --tag latest
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            package.json
            skills-manifest.json
            README.md
          generate_release_notes: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## 任务 3: 更新 README.md 添加 Marketplace 安装说明

**Files:**
- Modify: `README.md:1-25`

- [ ] **Step 1: 更新 README.md 快速开始部分**

替换现有的 "方法 1：从 Claude Code Marketplace 安装" 部分，添加 GitHub Marketplace badge 和更清晰的安装指示。

```markdown
## 快速开始

### 从 GitHub Marketplace 安装（推荐）

[![GitHub Marketplace](https://img.shields.io/badge/GitHub%20Marketplace-leetcode--skills-blue?style=for-the-badge)](https://github.com/marketplace/leetcode-skills)

在 Claude Code 中直接运行：

```
/plugin install leetcode-skills
```
```

---

## 任务 4: 创建 GitHub Marketplace 配置文件

**Files:**
- Create: `github-marketplace.yml` (在仓库根目录)

- [ ] **Step 1: 创建 marketplace 配置文件**

```yaml
version: 1
name: leetcode-skills
description: Claude Code plugin for creating interactive algorithm visualization websites for LeetCode problems
tagline: Create interactive algorithm visualization websites for LeetCode problems
categories:
  - "developer-tools"
  - "education"
  - "science-and-data-analysis"
  - web-apps
supported-languages:
  - typescript
  - javascript
  - python
  - java
  - go
versions:
  semantic:
    enabled: true
    # 每次 tag v*.*.* 触发发布
```

---

## 任务 5: 更新 .gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: 添加 .gitignore 条目**

添加 `.github/workflows/release.yml` 确认发布流程的文件被跟踪。

确认现有 `.gitignore` 已忽略 `node_modules/` 等。

---

## 任务 6: 验证完整流程

- [ ] **Step 1: 创建 test tag 并验证 CI**

```bash
git checkout -b test-release
git commit --allow-empty -m "test: validate release workflow"
git tag v0.0.1-test.1
git push origin test-release v0.0.1-test.1
```

- [ ] **Step 2: 检查 GitHub Actions 日志**

预期：CI workflow 通过，Release workflow 触发（但 npm publish 会因无 `NPM_TOKEN` 而失败，这是预期行为）

- [ ] **Step 3: 清理 test tag**

```bash
git push origin --delete v0.0.1-test.1
git tag -d v0.0.1-test.1
```

---

## 依赖项

| 依赖 | 说明 |
|------|------|
| `NPM_TOKEN` | GitHub Secret - npm publish 权限 |
| `GITHUB_TOKEN` | 自动提供 - 用于创建 release |

---

## 发布流程

发布新版本时：

1. 更新 `skills-manifest.json` 中的版本（如果技能有变更）
2. 更新 `package.json` 中的版本
3. 创建 git tag: `git tag v1.0.0`
4. 推送 tag: `git push origin v1.0.0`
5. GitHub Actions 自动：
   - 运行 CI 验证
   - 发布 npm 包
   - 创建 GitHub Release

---

## 后续优化（可选）

1. **Verified Publisher**: 在 GitHub Marketplace 注册并验证发布者身份
2. **自动更新检查**: 在 plugin 中添加 `/plugin update` 支持
3. **Release Notes 自动生成**: 使用 AI 生成每次发布的变更说明
