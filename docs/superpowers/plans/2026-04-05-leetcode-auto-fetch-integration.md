# [LeetCode Auto-Fetch Integration] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `algorithm-visualization` Skill 能自动、可靠地从 leetcode.cn 获取题目信息，并将获取逻辑嵌入执行流程。

**Architecture:** 先实测现有 Python 抓取脚本的可靠性，修复或重写为更健壮的实现；再更新 SKILL.md 和 references，让题目获取从"参考文档"变成"可执行步骤"；最后补充 fallback 和用户确认策略。

**Tech Stack:** Python 3, urllib, GraphQL, JSON, Markdown

---

## Task 1: 实测现有脚本对 leetcode.cn 的有效性

**Files:**
- Run: `skills/algorithm-visualization/scripts/fetch-leetcode-problem.py`

- [ ] **Step 1: 用真实 slug 测试脚本**

```bash
cd skills/algorithm-visualization
python3 scripts/fetch-leetcode-problem.py two-sum
```

Expected: 返回包含 `number`, `title_cn`, `description`, `constraints` 的 JSON。

- [ ] **Step 2: 再用另一个 slug 验证**

```bash
python3 scripts/fetch-leetcode-problem.py reverse-linked-list
```

Expected: 同样返回有效 JSON，无 `error` 字段。

- [ ] **Step 3: 记录测试结果**

将命令输出保存到临时文件中，判断成功/失败原因。

---

## Task 2: 修复或增强抓取脚本

**Files:**
- Modify: `skills/algorithm-visualization/scripts/fetch-leetcode-problem.py`

- [ ] **Step 1: 根据 Task 1 结果修复问题**

常见问题和修复方向：
- 如果 GraphQL 返回 403：添加 `User-Agent` header
- 如果 `titleCn` 为空：fallback 到 `title`
- 如果 HTML 清理不彻底：增强 `clean_html` 正则
- 如果约束提取遗漏：放宽匹配规则

修复后的 headers 示例：
```python
headers={
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0",
    "Referer": f"https://leetcode.cn/problems/{slug}/",
}
```

- [ ] **Step 2: 增强提取字段**

新增输出字段（如果 API 返回）：
- `examples`：从描述中分离出的示例输入/输出
- `tags`：题目标签/Topics

- [ ] **Step 3: 重新测试并验证通过**

Run: `python3 scripts/fetch-leetcode-problem.py two-sum | jq .`
Expected: 所有字段正常，exit code = 0。

- [ ] **Step 4: Commit**

```bash
git add skills/algorithm-visualization/scripts/fetch-leetcode-problem.py
git commit -m "fix: make leetcode fetch script robust against 403 and html noise"
```

---

## Task 3: 在 SKILL.md 中把"自动获取"从参考文档升级为可执行指令

**Files:**
- Modify: `skills/algorithm-visualization/SKILL.md`

- [ ] **Step 1: 重写"输入前置"中的自动获取部分**

明确写入：

```markdown
### 自动获取执行步骤

当用户提供了题号或 slug 后，必须按以下顺序执行：

1. **构造 URL**：`https://leetcode.cn/problems/{slug}/description/`
2. **尝试 WebFetch**：使用工具抓取页面，提取中文标题和描述
3. **WebFetch 失败时 fallback 到脚本**：运行 `python3 scripts/fetch-leetcode-problem.py {slug}`
4. **解析 JSON 输出**：填入 `number`, `title_cn`, `slug`, `description`, `constraints`
5. **缺失项确认**：以上两步都失败时，一次性向用户确认缺少的信息
```

- [ ] **Step 2: 修改核心流程中第 1 步的表述**

使其明确为可执行动作，而非抽象描述。

- [ ] **Step 3: Commit**

```bash
git add skills/algorithm-visualization/SKILL.md
git commit -m "docs(skill): turn auto-fetch into executable steps in SKILL.md"
```

---

## Task 4: 更新 references/07-leetcode-data-source.md

**Files:**
- Modify: `skills/algorithm-visualization/references/07-leetcode-data-source.md`

- [ ] **Step 1: 补充直接执行脚本的使用方式**

在文档顶部添加：

```markdown
## 快速使用（Claude Code 可执行）

```bash
python3 skills/algorithm-visualization/scripts/fetch-leetcode-problem.py {slug}
```
```

- [ ] **Step 2: 补充 WebFetch 失败处理策略**

添加专门的"403/反爬处理"章节：
- 添加 `User-Agent`
- 缩短请求间隔
- 切换到 GraphQL API fallback

- [ ] **Step 3: Commit**

```bash
git add skills/algorithm-visualization/references/07-leetcode-data-source.md
git commit -m "docs: add executable usage and anti-bot fallback to leetcode data source"
```

---

## Task 5: 为模板项目也生成一个 TS 版获取工具（可选但推荐）

**Files:**
- Create: `skills/algorithm-visualization/templates/scripts/fetchProblem.ts`

- [ ] **Step 1: 编写 TypeScript 版本**

```typescript
#!/usr/bin/env tsx
/**
 * 从 leetcode.cn 获取题目信息（模板项目内可用）
 */

async function fetchProblem(slug: string) {
  const res = await fetch('https://leetcode.cn/graphql/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0',
      'Referer': `https://leetcode.cn/problems/${slug}/`,
    },
    body: JSON.stringify({
      query: `query questionData($titleSlug: String!) { question(titleSlug: $titleSlug) { questionFrontendId title titleCn translatedContent content difficulty } }`,
      variables: { titleSlug: slug },
      operationName: 'questionData',
    }),
  });
  const json = await res.json();
  const q = json.data?.question;
  if (!q) throw new Error('question not found');
  console.log(JSON.stringify({
    number: q.questionFrontendId,
    title_cn: q.titleCn || q.title,
    slug,
    difficulty: q.difficulty,
    description: cleanHtml(q.translatedContent || q.content || ''),
  }, null, 2));
}

function cleanHtml(raw: string) {
  return raw
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

const slug = process.argv[2];
if (!slug) {
  console.error('Usage: tsx scripts/fetchProblem.ts <slug>');
  process.exit(1);
}
fetchProblem(slug).catch((e) => { console.error(e.message); process.exit(1); });
```

- [ ] **Step 2:  Commit**

```bash
git add skills/algorithm-visualization/templates/scripts/fetchProblem.ts
git commit -m "feat(template): add TS fetch script for leetcode problem data"
```

---

## Task 6: 最终验证与提交

**Files:**
- All modified above

- [ ] **Step 1: 再次运行抓取脚本确认端到端通过**

```bash
cd skills/algorithm-visualization
python3 scripts/fetch-leetcode-problem.py two-sum
python3 scripts/fetch-leetcode-problem.py merge-k-sorted-lists
```

Expected: 两条命令都输出有效 JSON，无 error。

- [ ] **Step 2: 检查 Git 状态**

```bash
git log --oneline -8
```

Expected: 显示 Task 1~5 的 commit 序列。

- [ ] **Step 3: 推送（如果用户需要同步远程）**

```bash
git push origin main
```

---
