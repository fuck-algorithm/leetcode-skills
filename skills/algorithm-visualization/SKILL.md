---
name: algorithm-visualization
description: 为 LeetCode 题目创建交互式算法可视化教学网站（TypeScript + React + D3.js 单屏应用）。当用户要求为某道 LeetCode 题（题号或 slug）制作算法动画、可视化、题解演示网站，或要求把题解做成可播放的分步演示时使用；支持多解法、四语言代码高亮、播放控制与 GitHub Pages 发布。
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - WebFetch
  - AskUserQuestion
  - Bash(git *)
  - Bash(npm *)
  - Bash(npx *)
  - Bash(node *)
  - Bash(python3 *)
---

# 算法可视化 Skill

## 目标

把 LeetCode 题解做成教学用途的单屏可视化网站，重点是“看懂算法执行过程”，而不是只展示静态代码。

动画不是装饰：每一步必须有语义操作、稳定布局、单一焦点和一句可读解说。实现画布前必须按 `references/08-animation-motion-design.md` 的路径逐步落地，禁止“把数据画出来再整屏刷新”。

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

1. **运行抓取脚本（本地缓存优先）**：执行 `python3 "${CLAUDE_SKILL_DIR}/scripts/fetch-leetcode-problem.py" {slug_or_number}`，脚本内部会先查本地缓存 `assets/leetcode-problems/{slug}.json`，命中则直接返回，无需联网。`${CLAUDE_SKILL_DIR}` 由 Claude Code 在插件环境下替换为当前 skill 目录，**不要**写死仓库相对路径 `skills/algorithm-visualization/...`。
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

## References 导航（按需读取，避免一次性灌入上下文）

**开工前必读：**

1. `references/01-quality-targets.md`：质量目标与一票否决项
2. `references/02-website-requirements-catalog.md`：完整功能需求目录
3. `references/03-testing-and-acceptance-standard.md`：测试分层与门禁标准

**写 `solutionRegistry` 与画布前必读：**

4. `references/08-animation-motion-design.md`：分步规划、运动语法、各数据结构配方、D3 实现骨架、教学层与反模式

**按阶段读取：**

5. `references/05-progressive-delivery-plan.md`：确定 M0-M4 阶段时读取
6. `references/06-playwright-acceptance-matrix.md`：编写/核对 E2E 时读取
7. `references/04-acceptance-rubric.md`：最终评分与验收报告时读取
8. `references/07-leetcode-data-source.md`：抓题脚本失败、需要手工兜底或维护缓存时读取

说明：本文件只保留执行骨架与统一口径；具体条目以 references 与生成项目内 `docs/*` 为准。

---

## 核心流程（固定顺序）

1. **自动获取题目信息**：从用户输入提取题号/slug，先运行 `fetch-leetcode-problem.py`（本地缓存优先）；仅当脚本失败时才使用 WebFetch/GraphQL 兜底。缺失项一次性向用户确认，不要逐条追问。
2. **明确当前阶段**：确定 M0-M4 阶段（见 `references/05-progressive-delivery-plan.md`）。
3. **项目骨架初始化**：必须使用脚手架脚本生成，不要手工复制模板：
   ```bash
   node "${CLAUDE_SKILL_DIR}/scripts/scaffold-project.mjs" \
     --out ./leetcode-{题号}-{slug}-visualization \
     --number {题号} --title "{中文标题}" --slug {slug} \
     --repo "$(git remote get-url origin)"
   ```
   脚本会自动处理 `.gitignore`、`.github/workflows/deploy.yml`、`public/assets/qrcode-community.png` 与全部占位符替换。
3.5. **模板基线自检（改动业务代码前必须做）**：
   ```bash
   cd leetcode-{题号}-{slug}-visualization
   npm install
   npm run test:e2e:install   # 首次执行，安装 Chromium
   npm run qa:guard
   npm run test:coverage
   npm run test:e2e
   ```
   基线必须全绿；若模板本身失败，先修模板，不得把失败带入业务实现。
4. **动画方案设计（写代码前必须完成）**：
   - 阅读 `references/08-animation-motion-design.md` 的 §2、§3、§8
   - 列出可观察状态，按“一步一个语义动作”切步，给每步分配 `operation`、焦点、`narration`、`anchorIds`
   - 按 §5 规划稳定坐标与 ID 规则，按 §3 选定动效时长
   - 将结果写入生成项目的 `docs/ANIMATION_SPEC.md`（模板已提供，必须逐项填写）
5. **TDD 测试先行**：
   - 每新增一个 hook/component/feature，先写对应单元测试
   - 每新增一种解法的数据/动画映射，先补 `solutionRegistry.test.ts` 断言（操作非空、ID 稳定、frame 引用有效）
   - `features/animation/` 的状态/时间/图例纯函数必须有单测
   - 所有测试跑红（预期失败）后再开始实现
   - 运行 `npm run test:unit`，确保全部变绿后才进入下一步
6. **核心交互与动效实现**：完成头部、输入栏、代码面板、可视化画布、控制面板；画布必须按 08 §6 使用分层 keyed join + enter/update/exit 过渡，并渲染操作徽标、解说、固定图例与指标。
7. **多解法隔离实现**（如适用）：每种解法独立步骤、独立代码映射、独立画布上下文。
8. **工程化与部署**：lint/type-check/build + GitHub Pages Action。
9. **Playwright 自测验收**：按验收矩阵执行并留存证据（含 1x 录屏、相邻步骤截图、reduced motion 截图）。
10. **逐条核对并出报告**：按 AC（含 AC-023）与 Rubric 生成验收结论。

未完成第 9、10 步，不得宣称完成。

---

## 端到端执行示例：LeetCode 第 1 题"两数之和"

以下示例展示从用户输入到最终验收的完整流程，执行时参照此步骤但替换为实际题目数据。

### 阶段 1: 获取题目信息

1. 从用户输入提取题号 `1`，运行脚本：
   ```bash
   python3 "${CLAUDE_SKILL_DIR}/scripts/fetch-leetcode-problem.py" 1
   ```
2. 解析输出获得：中文标题"两数之和"、题目描述、约束 `2 <= nums.length <= 10^4`
3. 确认数据结构类型：**数组**

### 阶段 2: 项目骨架初始化

1. 用脚手架生成项目（自动替换占位符、复制 dotfiles 与二维码）：
   ```bash
   node "${CLAUDE_SKILL_DIR}/scripts/scaffold-project.mjs" \
     --out ./leetcode-1-two-sum-visualization \
     --number 1 --title "两数之和" --slug two-sum \
     --repo "$(git remote get-url origin)"
   ```
2. 运行 `npm install`
3. 运行 `npm run qa:guard && npm run test:coverage && npm run test:e2e`，确认模板基线全绿
4. 确认 `npm run type-check` 通过（类型无报错）

### 阶段 3: 编写解法定义

1. 编辑 `features/solutions/solutionRegistry.ts`：
   - 替换 `parseArrayInput` 为针对两数之和的校验逻辑（验证 `[nums, target]` 格式）
   - 替换 `buildCodes()` 中的示例代码为真实的两数之和代码（暴力解法 + 哈希表解法）
   - 替换 `buildSteps()` 中的示例动画步骤为真实的算法执行步骤
   - 在 `createSolutionRegistry()` 中注册至少 2 个解法
2. 根据新解法更新 `App.tsx` 中的 `PROBLEM_CONFIG` 常量（已在阶段 2 由脚手架替换）
3. **同步更新测试**：
   - `tests/unit/features/solutions/solutionRegistry.test.ts` 必须覆盖真实解法的 `validateInput` 正/负向断言（AC-022）
   - 通用 E2E 用例不得写死旧模板的样例值；题目专属断言请新增用例
   - 检查 `tests/e2e/acceptance.spec.ts` 中的样例 ID（`sample-s1`/`sample-s2`）与真实解法一致

### 阶段 3.5: 动画方案与画布实现

按 `references/08-animation-motion-design.md` 执行：

1. 填写 `docs/ANIMATION_SPEC.md`：结构、步骤表、状态图例、坐标规则、解说与指标。
2. 为每步补齐动画字段：
   - `operation`：本步唯一语义动作（`init/read/compare/swap/move/insert/remove/visit/match/push/pop/enqueue/dequeue/recurse/return/done`）
   - `narration`：动作 + 对象 + 原因/结果，1–2 句，且相邻步骤不得重复
   - `frame.nodes[].status` / `badge` / `sublabel`：焦点、轨迹、索引与“这个值是什么”的一句话说明
   - `frame.arrows[].text`：动作 + 对象；必要时用 `curve` 让开重叠元素
   - `frame.labels[].text/detail`：标注“这是什么/下一步做什么”，两行优先
3. 保持节点 ID 与坐标规则稳定；相邻步骤至少 60% 元素位置不变。
4. 栈/队列用 `createStack/createQueue` 生成容器与节点，所有中间态（空容器、容量上限、出栈/出队后的指针）都要能在画面中读出来。
5. 画布使用模板已有分层（`.layer-containers/.layer-edges/.layer-arrows/.layer-nodes/.layer-labels`）做 keyed join 与 enter/update/exit 过渡，**禁止** `selectAll('*').remove()`。
6. 保留模板的 `operation-badge`、`step-narration`、`canvas-legend`、`canvas-metrics` 与 `prefers-reduced-motion` 适配。
7. 打开页面以 1x 播放一遍、3x 播放一遍、随机跳步 10 次、快速切换解法 3 次，确认无闪烁、无跳帧、无残留元素、解说与画面一致。

### 阶段 4: TDD 测试

1. 编写 `tests/unit/features/solutions/solutionRegistry.test.ts`：
   - 断言 `validateInput` 对合法输入返回 `{ valid: true }`
   - 断言 `validateInput` 对非法输入返回 `{ valid: false, error: ... }`
   - 断言 `generateRandom` 生成的数据能通过 `validateInput`
   - 断言每步 `operation` 非空、节点 ID 稳定且 frame 引用有效
2. 保留并扩展 `tests/unit/features/animation/motion.test.ts`，覆盖状态归一化、图例、指标、倍速/降级时长。
3. 运行 `npm run test:coverage`，确保全部通过且覆盖率达标

### 阶段 5: 工程化与验收

1. 运行 `npm run qa:full`，全部通过（含覆盖率与 E2E）
2. 运行 `npm run test:e2e`，15 条 Playwright 用例 100% 通过
3. 按 B1-B7 验收口径逐项核对
4. 生成验收报告写入 `docs/ACCEPTANCE_REPORT_TEMPLATE.md`

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
12. 右下角交流群悬浮球必须可用，hover 显示二维码且保持原始比例；二维码必须位于 `public/assets/qrcode-community.png`，构建后不得 404。
13. 配色必须协调，**禁止紫色系**。

### 工程与交付

14. 代码必须可维护：TS/TSX 建议不超过 250 行，超过 350 行必须拆分。
15. 开发端口使用 30000-65535 高位端口，避免 3000/5173 默认端口。
16. GitHub Pages 必须通过 Actions 流程部署，工作流必须真实位于 `.github/workflows/deploy.yml`，且至少包含：
   - 依赖安装（`npm ci`，无 lockfile 时回退 `npm install`）
   - `npm run lint`
   - `npm run type-check`
   - `npm run build`
   - `configure-pages`
   - `upload-pages-artifact`
   - `deploy-pages`
17. 提交前必须通过 lint、type-check、build、`test:coverage`、`test:e2e`，禁止吞失败。
18. 产出项目必须包含 `docs/` 七个文件，且根目录不得残留 `{题号}`、`{中文标题}`、`{slug}`、`{github_repo}`、`{github_username}` 等模板占位符：
   - `QUALITY_GATE.md`
   - `TEST_PLAN.md`
   - `ACCEPTANCE_CHECKLIST.md`
   - `ACCEPTANCE_REPORT_TEMPLATE.md`
   - `PROGRESSIVE_DELIVERY.md`
   - `PLAYWRIGHT_CASES.md`
   - `ANIMATION_SPEC.md`
19. README 必须精简为三项：题目标题、一句话说明、线上链接。
20. 每个新增 `features/` 模块必须配套至少 1 个 `tests/unit/features/**/*.test.ts(x)` 文件。
21. 覆盖率必须由 `npm run test:coverage` 实测：lines >= 60%，functions >= 60%，branches >= 50%（统计范围 `features/` 与 `services/`）；未达标需写豁免说明并由审批人签字。
22. `npm run test:unit`（或 `test:coverage`）必须在本地通过后才能提交；禁止跳过单元测试直接执行 E2E。
23. 每个解法必须保证 `validateInput` 和 `generateRandom` 输出能通过单元测试断言；`npm run qa:guard` 会检查单元测试中是否覆盖 `validateInput`。

### 动画与教学层（AC-023，Blocking）

24. 每个 `AlgorithmStep` 必须包含 `operation`（语义动作）与 `narration`（动作 + 对象 + 原因/结果）；相邻步骤的解说不得重复，且每步至少绑定一个 `anchorIds`。
25. 画布必须使用按稳定 ID 的 D3 data join 与 enter/update/exit 过渡；**禁止**每步 `selectAll('*').remove()` 整屏重建，禁止无 ID 重排。
26. 同一元素跨步骤必须复用同一个 `id` 与同一套坐标规则；相邻步骤至少 60% 元素位置保持不变；不得每步重新随机布局或重跑力导向。
27. 每帧最多一个 `current`（`compare` 最多两个）；焦点离开后必须转 `visited` 留痕，最终结果转 `done`/`path`。
28. 必须使用固定状态色板与固定图例（默认 `current/compare/visited/done`，用到 `path/error` 时追加）；颜色不得是唯一状态信号；禁止紫色。
29. 动效时长必须来自 `features/animation/motion.ts` 的 `MOTION` token，1x 下动画时长不超过停留时间的 55%；倍速同步缩放；跳步时先中断过渡再从当前位置继续。
30. 必须实现 `prefers-reduced-motion: reduce` 降级：JS 过渡时长归零、CSS 过渡关闭，但状态、解说、图例、代码高亮仍完整更新。
31. 画布必须常驻渲染操作徽标、步骤解说、固定图例与 2–3 个指标；`step.description` 或 `narration` 不得只写“处理中/继续”。
32. 实现画布前必须填写 `docs/ANIMATION_SPEC.md`；`npm run qa:guard` 会检查该文件、动效标记、分层节点与 reduced motion，缺失即 FAIL。
33. 栈/队列必须作为**容器**绘制：使用 `features/animation/structures.ts` 的 `createStack/createQueue` 生成 `CanvasContainer`，由 `render/containers.ts` 渲染固定槽位、占用计数（`n/capacity`）、栈底→栈顶 / 队首→队尾方向指针与空状态文案；禁止只用一排无容器节点表示栈或队列。`npm run qa:guard` 会检查 `structures.ts`、`render/containers.ts`、`.layer-containers` 与 `data-container-kind`。
34. 箭头与标注必须自解释：每条 `CanvasArrow` 必须有 `text`（动作 + 对象，如“入队 3”“pop 6”）或明确的 `kind: 'pointer'`；`CanvasLabel` 必须有 `text`，解释“这是什么/下一步做什么”时补 `detail` 第二行。标签偏移必须按标签尺寸与节点半径计算，引导线不得压住节点、箭头或其它标签。
35. 退场元素必须可靠清理：统一使用 `render/common.ts` 的 `fadeOutAndRemove`；禁止在过渡链上直接 `.remove()`（同元素存在其它命名过渡时 d3 会静默跳过删除，快速切帧会残留透明元素）。

---

## 验收口径（统一，不可改）

最终状态只允许：`PASS` 或 `FAIL`。

按 B1-B7 依次判定：

- **B1**：一票否决项为 0
- **B2**：`lint`、`type-check`、`build`、`test:coverage`、`test:e2e` 全部 exit code = 0
- **B3**：Playwright 必过集合（全部 15 条 E2E）通过率 100%（见 `references/06-playwright-acceptance-matrix.md`）
- **B4**：AC-001 ~ AC-023 全通过（N/A 需写豁免依据与审批人）；AC-023 的动效证据见 `docs/ANIMATION_SPEC.md`
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
