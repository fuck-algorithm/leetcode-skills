---
name: algorithm-visualization
description: 精简版执行规范：以核心流程、硬约束、references 导航驱动交付，并用统一 PASS/FAIL 验收口径收口
---

# 算法可视化 Agent（精简版）

## 目标

把 LeetCode 题解做成教学用途的单屏可视化网站，重点是”看懂算法执行过程”，而不是只展示静态代码。

## 调用方式

作为 Claude Code 插件技能，使用以下方式调用：

```
/leetcode-skills:algorithm-visualization 帮我为 LeetCode 第 1 题创建可视化
```

或直接描述需求，Claude 会自动识别并调用本技能。

---

## 输入前置（自动获取优先，用户补充 fallback）

**核心原则**：用户只需提供题号或 slug，其余信息优先自动获取。

### 自动获取执行步骤

当用户提供了题号或 slug 后，必须按以下顺序执行：

1. **运行抓取脚本（本地缓存优先）**：执行 `python3 skills/algorithm-visualization/scripts/fetch-leetcode-problem.py {slug_or_number}`，脚本内部会先查本地缓存 `assets/leetcode-problems/{slug}.json`，命中则直接返回，无需联网。
2. **解析 JSON 输出**：提取 `number`, `title_cn`, `description`, `constraints`
3. **缺失项确认**：若脚本失败或返回空字段，一次性向用户确认缺少的信息，不要逐条追问

说明：脚本会自动读取 `assets/leetcode-problems/index.json` 将题号解析为 slug；如果本地缓存未命中，才会联网抓取 leetcode.cn。抓取成功后自动回写缓存。

### 必需（无法自动推断）
1. **题号** 或 **slug**（如：1 或 "two-sum"）— 用户必须提供，或通过对话上下文推断
2. **当前仓库 URL**（通过 `git remote` 获取）
3. **至少一种可运行算法代码**（Java/Python/Go/JavaScript）
4. **演示数据结构类型**（树/图/数组/链表/哈希/栈/队列等）

### 可选（已由脚本自动获取，失败时确认）
5. 中文标题 ← 从 HTML 页面抓取
6. 题目描述 ← 从 GraphQL API 获取
7. 输入约束 ← 从描述中提取
8. 若有多解法：每种解法的代码、复杂度、核心思路

---

## References 导航（先读后做）

执行本 Skill 时，按顺序使用以下文档作为细则来源：

1. `references/01-quality-targets.md`：质量目标与一票否决项
2. `references/02-website-requirements-catalog.md`：完整功能需求目录
3. `references/03-testing-and-acceptance-standard.md`：测试分层与门禁标准
4. `references/04-acceptance-rubric.md`：量化评分标准
5. `references/05-progressive-delivery-plan.md`：M0-M4 渐进式交付
6. `references/06-playwright-acceptance-matrix.md`：Playwright 阻塞/非阻塞矩阵
7. `references/07-leetcode-data-source.md`：题目信息自动获取方法

说明：本文件只保留执行骨架与统一口径；具体条目以 references 与生成项目内 `docs/*` 为准。

---

## 核心流程（固定顺序）

1. **自动获取题目信息**：从用户输入提取题号/slug，优先通过 WebFetch 或 GraphQL 从 leetcode.cn 抓取中文标题、描述、约束。缺失项一次性向用户确认，不要逐条追问。
2. **明确当前阶段**：确定 M0-M4 阶段（见 `references/05-progressive-delivery-plan.md`）。
3. **项目骨架初始化**：按模块化结构搭建页面、特性、服务、类型、样式。
4. **TDD 测试先行（新增）**：
   - 每新增一个 hook/component/feature，先写对应单元测试
   - 每新增一种解法的数据/动画映射，先补 `solutionRegistry.test.ts` 断言
   - 所有测试跑红（预期失败）后再开始实现
   - 运行 `npm run test:unit`，确保全部变绿后才进入下一步
5. **核心交互实现**：完成头部、输入栏、代码面板、可视化画布、控制面板。
6. **多解法隔离实现**（如适用）：每种解法独立步骤、独立代码映射、独立画布上下文。
7. **工程化与部署**：lint/type-check/build + GitHub Pages Action。
8. **Playwright 自测验收**：按验收矩阵执行并留存证据。
9. **逐条核对并出报告**：按 AC 与 Rubric 生成验收结论。

未完成第 8、9 步，不得宣称完成。

---

## 强约束（Blocking）

### 产品与交互

1. 技术栈必须是 **TypeScript + React + D3.js**。
2. 页面必须是**单屏产品**，首屏呈现核心信息。
3. 标题必须是“题号 + 中文标题”，可新标签跳转题目链接。
4. 左上角必须提供 Hot 100 返回链接（新标签）：
   `https://fuck-algorithm.github.io/leetcode-hot-100/`
5. 右上角必须提供 GitHub 徽标与 Star 数，Star 走 GitHub API + IndexedDB 1 小时缓存；请求失败回退旧缓存，无缓存显示 0。
6. 输入区必须单行紧凑，支持自定义输入、样例、随机合法数据；非法输入不得触发演示更新。
7. 代码面板必须支持 Java/Python/Go/JavaScript，默认 Java；支持行号、高亮、当前行、变量旁注；语言偏好持久化。
8. 画布必须支持平移、缩放、默认居中；必须展示状态转移/数据流；空节点（如 null）必须可视化。
9. 控制面板必须含：上一步、下一步、播放/暂停、重置、速度调节、可拖拽进度条；快捷键 Left/Right/Space/R。
10. 速度偏好必须持久化。
11. 若有多解法，必须独立视图容器或独立页面，不得只改文本。
12. 右下角交流群悬浮球必须可用，hover 显示二维码且保持原始比例。
13. 配色必须协调，**禁止紫色系**。

### 工程与交付

14. 代码必须可维护：TS/TSX 建议不超过 250 行，超过 350 行必须拆分。
15. 开发端口使用 30000-65535 高位端口，避免 3000/5173 默认端口。
16. GitHub Pages 必须通过 Actions 流程部署，且至少包含：
   - `npm ci`
   - `npm run lint`
   - `npm run type-check`
   - `npm run build`
   - `configure-pages`
   - `upload-pages-artifact`
   - `deploy-pages`
17. 提交前必须通过 lint、type-check、build，禁止吞失败。
18. 产出项目必须包含 `docs/` 六个文件：
   - `QUALITY_GATE.md`
   - `TEST_PLAN.md`
   - `ACCEPTANCE_CHECKLIST.md`
   - `ACCEPTANCE_REPORT_TEMPLATE.md`
   - `PROGRESSIVE_DELIVERY.md`
   - `PLAYWRIGHT_CASES.md`
19. README 必须精简为三项：题目标题、一句话说明、线上链接。
20. 每个新增 `features/` 模块必须配套至少 1 个 `tests/unit/features/**/*.test.ts(x)` 文件。
21. `tests/unit/` 覆盖率阈值：lines >= 60%，functions >= 60%，branches >= 50%；未达标需写豁免说明并由审批人签字。
22. `npm run test:unit` 必须在本地通过后才能提交；禁止跳过单元测试直接执行 E2E。
23. 每个解法必须保证 `validateInput` 和 `generateRandom` 输出能通过单元测试断言。

---

## 验收口径（统一，不可改）

最终状态只允许：`PASS` 或 `FAIL`。

按 B1-B7 依次判定：

- **B1**：一票否决项为 0
- **B2**：`lint`、`type-check`、`build`、`test:unit`、`test:e2e` 全部 exit code = 0
- **B3**：Playwright 必过集合通过率 100%（见 `references/06-playwright-acceptance-matrix.md`）
- **B4**：AC-001 ~ AC-022 全通过（N/A 需写豁免依据与审批人）
- **B5**：P0/P1 缺陷为 0
- **B6**：Rubric 综合分 >= 80（见 `references/04-acceptance-rubric.md`）
- **B7**：证据完整（命令输出、关键截图、缺陷闭环记录）

判定规则：
- B1-B7 全满足才可 `PASS`
- 任一不满足即 `FAIL`
- `FAIL` 状态下禁止宣称完成

---

## FAIL 闭环（直到 PASS）

每轮失败必须执行：

1. 记录失败证据（日志、截图、trace、复现输入）
2. 缺陷分级（P0/P1/P2/P3）
3. 根因定位（实现/测试脚本/环境）
4. 修复并回归（受影响用例 + 核心冒烟）
5. 更新验收报告（失败项、修复动作、复测结果）
6. 重新执行 B1-B7

补充：同一 flaky 用例最多重试 2 次，仍失败按真实缺陷处理。

---

## 交付输出要求

向用户交付时必须包含：

1. 变更概览（改了什么、为什么）
2. 验证结果（命令与关键输出）
3. 验收结论（AC、E2E、Rubric、最终 PASS/FAIL）
4. 未完成项（阻塞原因与下一步）
5. 若用户要求提交代码，优先拆分为语义清晰的多个 commit
