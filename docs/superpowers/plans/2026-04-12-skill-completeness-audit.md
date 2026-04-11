# Algorithm-Visualization Skill 完整性修复计划

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 修复 algorithm-visualization skill 的 P0/P1 缺陷，使其达到可发布质量。

**Architecture:** 修复集中在 4 个文件：`package.json`（元数据更新）、`templates/.gitignore`（排除 dist）、`SKILL.md`（补充示例流程）、`templates/assets/`（添加占位资源）。

**Tech Stack:** Claude Code Plugin, TypeScript, Markdown

---

## Task 1: 修复 package.json 元数据

**Files:**
- Modify: `skills/algorithm-visualization/templates/package.json:1-32`
- Modify: `package.json:1-32`

### 修改 templates/package.json

当前问题：description 仍然是 "Windsurf Skills" 相关描述，name 含占位符（这是模板所以可以保留）

- [ ] **Step 1: 更新 templates/package.json 的 description 字段**

将 `"description": "Windsurf Skills for algorithm visualization and problem solving"` 改为：

```json
{
  "name": "leetcode-{题号}-{slug}-visualization",
  "description": "Interactive algorithm visualization website for LeetCode problems"
}
```

运行: `cat package.json | grep description`
预期: 看到新的 description 文本

### 修改根 package.json

当前问题：description 含 "Windsurf"，keywords 含 "windsurf"，缺少 author/repository/homepage/license

- [ ] **Step 2: 更新根 package.json**

```json
{
  "name": "@fuck-algorithm/skills",
  "version": "1.0.0",
  "description": "Claude Code plugin for creating interactive algorithm visualization websites for LeetCode problems",
  "main": "index.js",
  "bin": {
    "install-skills": "./install.js"
  },
  "scripts": {
    "install:skills": "node install.js",
    "postinstall": "node install.js"
  },
  "files": [
    "skills/",
    ".claude-plugin/",
    "skills-manifest.json",
    "install.sh",
    "install.js",
    "README.md"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/fuck-algorithm/leetcode-skills.git"
  },
  "author": "fuck-algorithm",
  "license": "MIT",
  "keywords": [
    "claude-code",
    "plugin",
    "algorithm",
    "visualization",
    "leetcode"
  ]
}
```

运行: `node -e "console.log(JSON.parse(require('fs').readFileSync('package.json')).description)"`
预期: 输出 `Claude Code plugin for creating interactive algorithm visualization websites for LeetCode problems`

---

## Task 2: 清理 templates/dist/ 预构建产物

**Files:**
- Modify: `skills/algorithm-visualization/templates/.gitignore`
- 删除: `skills/algorithm-visualization/templates/dist/`

当前问题：`templates/dist/` 包含基于 placeholder 数据预构建的 JS/CSS，不应被提交

- [ ] **Step 1: 更新 templates/gitignore 添加 dist 排除规则**

当前 gitignore 内容需要确认包含 `dist/`。修改 `skills/algorithm-visualization/templates/gitignore` 确保首行包含：

```
node_modules/
dist/
*.local
.DS_Store
```

- [ ] **Step 2: 删除 templates/dist/ 目录**

运行: `rm -rf skills/algorithm-visualization/templates/dist/`
预期: dist 目录被删除，`git status` 显示删除

- [ ] **Step 3: 验证 gitignore 生效**

运行: `git check-ignore -v skills/algorithm-visualization/templates/dist/ 2>/dev/null; echo "exit: $?"`
预期: 如果 dist 已删除则无输出，exit 0

---

## Task 3: SKILL.md 补充端到端生成示例

**Files:**
- Modify: `skills/algorithm-visualization/SKILL.md`

当前问题：SKILL.md 有流程和约束，但缺少一个"从用户输入题号到生成完成"的完整示例，新 AI 执行者容易遗漏步骤

- [ ] **Step 1: 在 SKILL.md 的 "核心流程" 和 "强约束" 之间插入新章节**

在现有的 `## 核心流程（固定顺序）` 章节之后，`## 强约束（Blocking）` 章节之前，插入以下新章节：

```markdown
---

## 端到端执行示例：LeetCode 第 1 题"两数之和"

以下示例展示从用户输入到最终验收的完整流程，执行时参照此步骤但替换为实际题目数据。

### 阶段 1: 获取题目信息

1. 从用户输入提取题号 `1`，运行脚本：
   ```bash
   python3 skills/algorithm-visualization/scripts/fetch-leetcode-problem.py 1
   ```
2. 解析输出获得：中文标题"两数之和"、题目描述、约束 `2 <= nums.length <= 10^4`
3. 确认数据结构类型：**数组**

### 阶段 2: 项目骨架初始化

1. 复制 `templates/` 全部内容到目标项目目录 `leetcode-1-two-sum-visualization/`
2. 批量替换占位符：
   - `{题号}` → `1`
   - `{中文标题}` → `两数之和`
   - `{slug}` → `two-sum`
   - `{github_repo}` → 目标项目的 GitHub URL
3. 运行 `npm install` 安装依赖
4. 确认 `npm run type-check` 通过（类型无报错）

### 阶段 3: 编写解法定义

1. 编辑 `features/solutions/solutionRegistry.ts`：
   - 替换 `parseArrayInput` 为针对两数之和的校验逻辑（验证 `[nums, target]` 格式）
   - 替换 `buildCodes()` 中的示例代码为真实的两数之和代码（暴力解法 + 哈希表解法）
   - 替换 `buildSteps()` 中的示例动画步骤为真实的算法执行步骤
   - 在 `createSolutionRegistry()` 中注册至少 2 个解法
2. 根据新解法更新 `App.tsx` 中的 `PROBLEM_CONFIG` 常量（已在阶段 2 替换占位符）

### 阶段 4: TDD 测试

1. 编写 `tests/unit/features/solutions/solutionRegistry.test.ts`：
   - 断言 `validateInput` 对合法输入返回 `{ valid: true }`
   - 断言 `validateInput` 对非法输入返回 `{ valid: false, error: ... }`
   - 断言 `generateRandom` 生成的数据能通过 `validateInput`
2. 运行 `npm run test:unit`，确保全部通过

### 阶段 5: 工程化与验收

1. 运行 `npm run qa:full`，全部通过
2. 运行 `npm run test:e2e`，Playwright 用例 100% 通过
3. 按 B1-B7 验收口径逐项核对
4. 生成验收报告写入 `docs/ACCEPTANCE_REPORT_TEMPLATE.md`

---
```

运行: `grep -c "端到端执行示例" skills/algorithm-visualization/SKILL.md`
预期: 输出 `1`

---

## Task 4: 添加模板占位资源

**Files:**
- Create: `skills/algorithm-visualization/templates/assets/qrcode-community.png` (占位图)
- Modify: `skills/algorithm-visualization/templates/components/overlay/CommunityFloat.tsx`

当前问题：CommunityFloat 组件引用二维码图片但 assets 中无文件

- [ ] **Step 1: 创建占位二维码图片说明文件**

在 `skills/algorithm-visualization/templates/assets/` 下创建 `README.md`（已存在）中补充二维码说明。读取现有内容后追加：

```markdown
### 交流群二维码

将你的微信群二维码图片命名为 `qrcode-community.png` 放在此目录下。
图片建议尺寸 400x400px，PNG 格式。

生成项目后，确保 `components/overlay/CommunityFloat.tsx` 中的图片路径指向此文件。
```

- [ ] **Step 2: 更新 CommunityFloat.tsx 使用相对路径占位**

读取 `CommunityFloat.tsx`，确认其引用的图片路径。如果指向不存在的绝对路径，改为指向 `../../assets/qrcode-community.png` 并添加注释说明需替换。

运行: `npm run type-check`（在模板项目中）
预期: 类型检查通过

---

## Task 5: 更新缓存新鲜度标记

**Files:**
- Modify: `skills/algorithm-visualization/assets/leetcode-problems/index.json`（如有 metadata 字段）
- Create: `skills/algorithm-visualization/assets/leetcode-problems/METADATA.json`

当前问题：无缓存数据的版本/日期标记，无法判断是否需要更新

- [ ] **Step 1: 创建 METADATA.json**

```json
{
  "version": "1.0.0",
  "generatedAt": "2026-04-12T00:00:00Z",
  "totalProblems": 4280,
  "source": "leetcode.cn",
  "note": "Rebuild with: python3 skills/algorithm-visualization/scripts/build-problem-cache.py"
}
```

运行: `cat skills/algorithm-visualization/assets/leetcode-problems/METADATA.json | python3 -m json.tool`
预期: 合法 JSON，显示缓存元信息

---

## Task 6: 验证修复完整性

**Files:**
- All modified files

- [ ] **Step 1: 运行仓库验证脚本**

运行: `node scripts/validate-skills.js`
预期: exit 0，无错误输出

- [ ] **Step 2: 检查所有修改过的文件无语法错误**

运行: `node -e "JSON.parse(require('fs').readFileSync('package.json'))" && echo "root package.json OK"`
运行: `node -e "JSON.parse(require('fs').readFileSync('skills-manifest.json'))" && echo "manifest OK"`
预期: 均输出 OK

- [ ] **Step 3: 确认无残留 TODO/FIXME（除模板占位符外）**

运行: `grep -rn "TODO\|FIXME\|TBD" skills/ --include="*.md" --include="*.ts" --include="*.tsx" --include="*.js" | grep -v "templates/"`
预期: 无输出

---
