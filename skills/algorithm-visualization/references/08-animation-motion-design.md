# 08. 动画与运动设计规范（Motion Design）

> 适用阶段：步骤规划（M1）→ 画布实现（M2）→ 验收（M4）。
> 本文回答一个问题：**怎样让算法的每一步既好看，又让第一次看的人立刻看懂？**
> 所有条目都可直接执行；与 `SKILL.md` 的强约束、`docs/ANIMATION_SPEC.md` 一一对应。

---

## 0. 三条不可妥协的原则

1. **重放快照，不在 UI 里跑算法。**
   算法在构建步骤时已经执行完毕；播放器只负责重放 `AlgorithmStep[]`。
   任意跳步、回退、倍速都必须得到同一画面，不允许 UI 侧重新计算。
2. **一步一个焦点。**
   一帧只表达一个语义动作（读取/比较/交换/入栈……）。观众的眼睛每步只需要移动一次。
3. **位置稳定，身份稳定。**
   同一元素跨步骤必须复用同一个 `id` 和同一套坐标体系；动的是元素，不是整张画布。

违反任一条，画面都会“闪、跳、乱”，后续再调颜色和缓动也救不回来。

---

## 1. 步骤数据契约

生成项目使用 `templates/types.ts`，动画相关字段如下（可选字段保证向后兼容）：

```ts
type NodeStatus = 'idle' | 'current' | 'compare' | 'visited' | 'done' | 'path' | 'error';
type EdgeStatus = 'idle' | 'active' | 'visited' | 'path' | 'error';
type StepOperation =
  | 'init' | 'read' | 'compare' | 'swap' | 'move' | 'insert' | 'remove'
  | 'visit' | 'match' | 'push' | 'pop' | 'enqueue' | 'dequeue'
  | 'recurse' | 'return' | 'done';

interface CanvasNode {
  id: string;            // 全解法唯一，跨步骤不变
  label: string;
  x: number; y: number;  // 逻辑坐标，建议 1200x720 画布
  kind?: 'normal' | 'null' | 'highlight'; // 旧字段，保留兼容
  status?: NodeStatus;   // 新字段，优先于 kind
  badge?: string;        // 节点上方的小标签，如索引 i/j、深度、指针名
  radius?: number;       // 默认 24
}

interface CanvasEdge {
  id: string; from: string; to: string; label?: string;
  status?: EdgeStatus;
  directed?: boolean;
}

interface CanvasArrow {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  text?: string;
  kind?: 'flow' | 'transfer' | 'return' | 'pointer';
}

interface CanvasFrame {
  nodes: CanvasNode[]; edges: CanvasEdge[]; arrows: CanvasArrow[];
  labels: CanvasLabel[]; notes: string[];
  legend?: LegendItem[];   // 不填则使用固定四色图例
  metrics?: MetricItem[];  // 不填则自动统计节点/进行中/已访问
}

interface AlgorithmStep {
  id: number; title: string; description: string;
  operation?: StepOperation; // 步骤操作徽标
  narration?: string;        // 面向观众的一句话解说，缺省用 description
  binding: StepBinding;
  frame: CanvasFrame;
}
```

**硬性要求**

- `description` 必须是完整可读的句子，不能写“处理中”“继续”。
- `narration` 用“因为/所以”解释**为什么这一步这样做**，而不是复述画面。
- 同一道题的所有步骤共用一套 `legend`（不填则用默认四色图例），避免图例跳动。
- `nodes` 只能包含**当前帧仍然存在**的元素；被删除的元素不要留在数组里，交给退出动画。

---

## 2. 分步规划算法（写代码前先纸上推演）

### 2.1 从算法里抽取“可观察状态”

先列出算法中所有会变化的东西：

| 类别 | 例子 | 是否每步都画 |
| --- | --- | --- |
| 主结构 | 数组、链表、树、图、网格 | 是 |
| 辅助结构 | 哈希表、栈、队列、递归栈、结果集 | 是（有变化时） |
| 标量 | `i/j`、`ans`、`sum`、`depth` | 用 badge / 变量旁注 |
| 代码位置 | 当前执行行 | 是（anchor 同步） |

### 2.2 切分步骤（伪代码）

```text
steps = []
for 每一个会产生“可见状态变化”的算法事件:
    if 该事件与上一步的可见状态完全相同: continue
    step.operation = 事件类型
    step.frame = 对当前全部可观察状态做一次深拷贝快照
    step.binding = { anchorIds: 当前代码锚点, variables: 当前关键变量 }
    step.narration = 一句话解释“为什么”
    steps.push(step)

合并规则:
- 连续多次读取同一结构且无其他变化 → 合并为一步，用 notes 说明
- 纯内部计算（临时变量、循环自增）→ 不单独成步，并入下一次可见变化
- 每步保证“至少一个元素状态变化”，同时“焦点元素不超过 2 个”
```

### 2.3 每个解法的步骤预算

| 场景 | 建议步数 | 说明 |
| --- | --- | --- |
| 线性扫描/双指针 | 8–20 | 每个关键移动一步 |
| 哈希表一次遍历 | 8–16 | 插入、命中各一步 |
| 链表反转 | 6–12 | 每次改指针一步 |
| 二叉树遍历 | 10–25 | 进入/访问/回溯分开 |
| DP 表格 | 12–30 | 每个关键转移一步，可合并同构行 |
| 图搜索 | 10–25 | 入队/出队/标记访问各一步 |

超过 40 步时先做合并（只保留教学关键帧），否则播放再流畅也没人看完。

### 2.4 为每一步选一个 `operation`

| operation | 语义 | 典型画面 |
| --- | --- | --- |
| `init` | 初始化 | 结构出现，指针落在起点 |
| `read` | 读取 | 当前元素高亮，箭头指向变量 |
| `compare` | 比较 | 两个元素同时 `compare` |
| `swap` | 交换 | 两个元素沿弧线换位 |
| `move` | 移动指针 | badge/指针平移，旧位置转 `visited` |
| `insert` | 插入 | 新元素从上方落下并占位 |
| `remove` | 删除 | 元素淡出，后续元素补位 |
| `visit` | 访问节点 | 节点转 `visited`，邻接边点亮 |
| `match` | 命中目标 | 元素转 `done` 并短暂放大 |
| `push/pop` | 栈操作 | 元素从顶部进入/离开 |
| `enqueue/dequeue` | 队操作 | 元素从尾部进入、头部离开 |
| `recurse` | 递归进入 | 新栈帧从上方落下 |
| `return` | 返回 | 栈帧上浮消失，结果箭头指向调用者 |
| `done` | 完成 | 全路径 `path`，结果强调 |

`operation` 会渲染成步骤徽标，是观众理解“这一步在干什么”的第一信号，不能省。

---

## 3. 运动语法（Motion Grammar）

统一使用以下语义，不要为每道题另发明动画：

| 变化 | 视觉动作 | 时长（1x） | 缓动 |
| --- | --- | --- | --- |
| 元素首次出现 | 从 0.6 倍缩放 + 淡入 | 220ms | `easeBackOut` |
| 元素位置变化 | `transform` 平移到新坐标 | 360ms | `easeCubicOut` |
| 元素消失 | 缩到 0.6 倍 + 淡出 | 180ms | `easeCubicIn` |
| 状态切换 | 填充/描边颜色过渡 | 240ms | 线性/CSS transition |
| 箭头出现 | 沿路径“生长”（dash offset） | 420ms | `easeCubicOut` |
| 边点亮 | 描边变粗 + 颜色过渡 | 240ms | `easeCubicOut` |
| 结果强调 | 放大到 1.08 再回 1.0，一次脉冲 | 360ms | `easeSinInOut` |

**节奏规则**

- 动画时长必须短于停留时间：`updateMs ≤ dwellMs × 0.45`。
- 1x 下每步停留约 900–1100ms；倍速时动画与停留一起按倍率缩放。
- 跳步/连续步进时，先 `interrupt()` 当前过渡，再从**当前插值位置**继续，不能闪回起点。
- 同一帧内不要同时做“移动 + 变色 + 缩放 + 箭头生长”四种强动效；最多两种。

---

## 4. 状态配色与图例

### 4.1 固定语义色板（禁止紫色）

| 状态 | 含义 | 填充 | 文字 | 描边 |
| --- | --- | --- | --- | --- |
| `idle` | 未处理 | `#dde9e6` | `#0f1f1b` | `#31554d` |
| `current` | 当前焦点 | `#2f9e7d` | `#ffffff` | `#18765a` |
| `compare` | 正在比较 | `#e8b04b` | `#3a2a00` | `#b07a12` |
| `visited` | 已访问/已排除 | `#9ad3c2` | `#0f1f1b` | `#4f8d7b` |
| `done` | 已确认结果 | `#18765a` | `#ffffff` | `#0f4f3d` |
| `path` | 最终路径/答案 | `#0f6b56` | `#ffffff` | `#0a4a3b` |
| `error` | 非法/冲突 | `#c94a4a` | `#ffffff` | `#8f2f2f` |

规则：

- **同屏高饱和色不超过 3 种**；其余用中性色与透明度分层。
- 颜色不是唯一信号：`current` 可加外圈光晕，`done` 可加对勾或加粗描边，照顾色觉差异。
- 图例固定在画布内、始终可见；默认展示 `current/compare/visited/done`，用到 `path/error` 时追加。
- 图例顺序固定，不随步骤增减而重排。

### 4.2 状态转移的“留痕”原则

- 焦点离开后，元素转 `visited`，不要立刻恢复 `idle`——观众需要看到搜索/扫描的轨迹。
- 最终答案相关元素转 `done` 或 `path`，并保持到结束。
- 每帧最多一个 `current`；`compare` 最多两个（双指针/比较排序）。
- 未参与的节点保持 `idle`，不要用低对比度“消失”，否则观众会以为数据被删了。

---

## 5. 布局稳定性

### 5.1 坐标体系

- 逻辑画布固定 `1200 × 720`，用 `viewBox` 自适应容器。
- 元素坐标由**结构自身规则**计算，不依赖“上一步的位置 + 随机偏移”。
- 数组/链表沿水平主轴排列：`x = originX + index * pitch`，`y` 固定。
- 树按层：`y = top + depth * levelGap`，同层均分 `x`。
- 图使用固定坐标或一次性力导向布局后缓存坐标，**不要每步重新跑力导向**。
- 网格：`x = left + col * cell`，`y = top + row * cell`。

### 5.2 防重叠

- 节点圆心最小间距 ≥ `2 * radius + 16`。
- 标签优先放上方；与已有标签/箭头冲突时依次尝试下、左、右。
- 长文本用 `badge`（短）而不是完整句子；完整解释放 `narration`。
- 辅助结构（哈希/栈/队列）放右侧独立泳道，与主结构之间留 ≥ 80px。

### 5.3 摄像机

- 默认缩放到“全部元素可见”，不要一上来就放大局部。
- 只在结构规模超过视口时启用自动跟随；用户手动缩放/平移后，本次播放内不再自动改变镜头。
- 切换步骤不重置缩放和平移——镜头跳变比动画缺失更让人迷失。
- 初始 `translate(80, 40) scale(1)` 仅作为空画布默认值。

---

## 6. D3 实现骨架

### 6.1 分层与 data join

```ts
// 只创建一次的分层，不要每步 remove 全部
const layer = d3.select(zoomLayerEl);
const containerLayer = layer.select<SVGGElement>('.layer-containers'); // 栈/队列容器在最底层
const nodeLayer = layer.select<SVGGElement>('.layer-nodes');
const edgeLayer = layer.select<SVGGElement>('.layer-edges');
const arrowLayer = layer.select<SVGGElement>('.layer-arrows');
const labelLayer = layer.select<SVGGElement>('.layer-labels'); // 标注最上层，不被遮挡

const nodes = nodeLayer
  .selectAll<SVGGElement, CanvasNode>('g.canvas-node')
  .data(step.frame.nodes, (d) => d.id)
  .join(
    (enter) => enter.append('g')
      .attr('class', 'canvas-node')
      .attr('data-node-id', (d) => d.id)
      .attr('transform', (d) => `translate(${d.x},${d.y})`)
      .attr('opacity', 0)
      .call((g) => g.append('circle'))
      .call((g) => g.append('text').attr('class', 'node-label')),
    (update) => update,
    (exit) => fadeOutAndRemove(exit, timing)
  );
```

关键点：

- `key = d.id`，没有稳定 ID 就没有平滑移动。
- `interrupt()` 在每次新步骤开始时对三个选择集调用，防止过渡排队。
- `enter` 与 `update` 合并后统一做位置过渡；只对 `enter` 做缩放/透明度入场。
- 不要用 `selectAll('*').remove()` 重建；它会销毁过渡、导致闪烁和缩放跳动。
- 退场不要直接 `transition().remove()`：同一元素上若还有 `move/fade/label` 等命名过渡，d3 的 remove 会因 `__transition` 里仍有别的 id 而静默跳过，快速切帧/切解法后会残留透明元素。统一用 `render/common.ts` 的 `fadeOutAndRemove`（在 `end` 回调里自行 `remove()`）；元素在退场途中又重新出现时，先 `interrupt('exit')`。

### 6.2 节点的状态与更新

```ts
nodes
  .attr('data-status', (d) => normalizeNodeStatus(d))
  .classed('is-null', (d) => d.kind === 'null');

nodes.transition('move')
  .duration(updateMs)
  .ease(d3.easeCubicOut)
  .attr('transform', (d) => `translate(${d.x},${d.y})`)
  .attr('opacity', 1);

nodes.select('circle')
  .transition('radius')
  .duration(updateMs)
  .attr('r', (d) => d.radius ?? 24);
```

- 颜色交给 CSS 类（`.node--current` 等），D3 只切类名；这样 reduced-motion 可以在 CSS 层整体关闭过渡。
- 文本标签用 `.text()` 更新，位置随父级 `g` 自动移动。
- 节点文字必须留在圆内：用 `fitNodeLabel(text, radius)`（`features/animation/layout.ts`）先 12px → 9px 缩小，仍超宽再截断加 `…`；完整文字写进 SVG `<title>` 和 `aria-label`，截断不丢信息。
- 入场是 0.6 → 1.0 的半径缩放（220ms），退场是 1.0 → 0.6 + 淡出（180ms）；已在画布上的节点只做 `updateMs` 半径更新，两类过渡用不同 transition 名，避免互相抢占。

### 6.3 边的更新

```ts
const nodeById = new Map(step.frame.nodes.map((n) => [n.id, n]));

// trimSegment：从圆心连线裁到两个节点的外沿，并留 2px 间隙。
const geometry = trimSegment(from, to, nodeRadius(from), nodeRadius(to));

edges.select('line')
  .transition('edge')
  .duration(updateMs)
  .attr('x1', geometry.from.x)
  .attr('y1', geometry.from.y)
  .attr('x2', geometry.to.x)
  .attr('y2', geometry.to.y);
```

- 端点缺失的边直接过滤掉，不要画到 `(0,0)`。
- 线的两端要裁到节点外沿（`features/animation/layout.ts` 的 `trimSegment`），不要从圆心画到圆心：否则线头和箭头会被节点圆盖住，看起来像“穿模”。
- 两节点相切或重叠时 `trimSegment` 返回 `null`，该边不渲染；不要硬画一条零长度线。
- 有向边用 `marker-end`；无向边不加箭头。
- 边标签位置取裁剪后线段的中点，并在节点移动时同步过渡。

### 6.4 箭头“生长”动画与文字

箭头统一用 `<path>`，配 `pathLength=1`，这样无论直线、曲线都能用同一套 dash 生长动画：

```ts
function arrowPath(arrow: CanvasArrow): string {
  const { from, to, curve = 0 } = arrow;
  if (Math.abs(curve) < 0.5) return `M${from.x},${from.y} L${to.x},${to.y}`;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  // curve 为正负时向两侧弯，控制点偏移 curve * 2，视觉弯曲量约等于 curve
  const cx = (from.x + to.x) / 2 + (-dy / len) * curve * 2;
  const cy = (from.y + to.y) / 2 + (dx / len) * curve * 2;
  return `M${from.x},${from.y} Q${cx},${cy} ${to.x},${to.y}`;
}

const path = enter.append('path')
  .attr('class', 'arrow-line')
  .attr('fill', 'none')
  .attr('pathLength', 1);

if (!reducedMotion) {
  path
    .attr('stroke-dasharray', '1 1')
    .attr('stroke-dashoffset', 1)
    .transition('draw')
    .duration(arrowMs)
    .ease(d3.easeCubicOut)
    .attr('stroke-dashoffset', 0);
}
```

箭头文字不是可选装饰。每条箭头至少满足其一：

- 有 `text`：写清“动作 + 对象”，例如 `push 4`、`dequeue A`、`返回 9`；
- 有明确 `kind: 'pointer'`：纯指针箭头（如 `next`、`parent`）。

文字贴着曲线定位，可用 `labelPosition`（0=起点，1=终点）与 `labelOffset` 微调，避免压住节点：

```ts
function arrowLabelPoint(arrow: CanvasArrow): { x: number; y: number } {
  const t = clamp(arrow.labelPosition ?? 0.5, 0, 1);
  // 直线取线性插值；曲线用二次贝塞尔公式，保证文字落在弧线上
}
```

CSS 用 `paint-order: stroke` + 与背景同色的粗描边给文字做光晕，跨过网格/线条时仍可读。

更新同 ID 箭头时只过渡 `d`，不要重复生长；坐标变化大时（换了布局）才重新播放生长。

### 6.5 标注（CanvasLabel）：解释“这是什么/下一步做什么”

标注是教学层，不是装饰。约定：

- `text` 一行讲清对象（`栈顶`、`当前和`、`窗口 [l, r]`）；
- `detail` 第二行讲动作或原因（`下一步弹出`、`保存累计结果`）；
- `variant: 'pointer'` 时画引导线指向目标节点；`callout` 只做带底色的说明卡；
- `tone` 只用 `neutral / accent / warning`，不要引入新色系。

偏移必须按**标签实际尺寸 + 节点半径 + 间距**计算，不能写死 60/80px。模板已提供 `placeLabels()`（`features/animation/layout.ts`），不要在每个解法里手写偏移：

```ts
const placements = placeLabels(
  step.frame.labels,
  new Map(step.frame.nodes.map((node) => [node.id, node])),
  { containers: step.frame.containers ?? [] }
);
// placements.get(label.id) → { x, y, width, height, position, leader }
```

布局规则（顺序固定，保证同一帧重复渲染结果一致）：

1. 先按 `label.position` 计算候选；
2. 若与已放标签、任何节点圆、容器框冲突，依次尝试 `top → bottom → left → right`；
3. 找到零重叠候选立即采用；全部冲突时选重叠面积最小的，标签不能被丢弃；
4. 标签框钳制在逻辑画布 `1200×720` 的安全区内（边距 8px），避免贴边被裁；
5. 引导线沿“标签中心 → 节点中心”方向，从标签框边缘连到节点外沿；标签被换向或钳制后仍然正确，不要按 `position` 写死上下端点。

标签层必须位于节点、箭头之上。同一目标不要同时放容器指针（如“队首”）和重复语义的标注，选一种表达。

### 6.6 栈/队列容器

容器是数据结构可视化的一等公民，禁止用“一排圆点”冒充栈或队列。使用 `features/animation/structures.ts`：

```ts
const stack = createStack({
  id: 'stack',
  x: 150,
  y: 330,
  capacity: 5,               // 固定容量，槽位不随元素数量跳动
  title: '单调栈',
  items: [                   // 顺序：栈底 → 栈顶
    { id: 's0', label: '1', status: 'done' },
    { id: 's1', label: '4', status: 'current', sublabel: '待比较' }
  ]
});
// stack.nodes 交给 renderNodes，stack.containers 交给 renderContainers
```

规则：

- 栈按**栈底→栈顶**（`items[0]` 在底部），队列按**队首→队尾**（`items[0]` 在左侧）传 `items`；
- 节点 ID 跨步骤稳定：出栈只移除末尾节点，出队后其余节点左移但 ID 不变，才能看到平移过渡；
- 固定容量：`capacity` 至少 4，空容器仍要画出槽位，并显示 `空栈` / `空队列`；
- 容器必须带标题、占用计数 `n/capacity`、槽位序号；
- 栈画 `栈顶`/`栈底` 指针；非空队列画 `队首`/`队尾` 指针，空队列不画指针；
- 队列指针必须指向**占用槽位**：`队首` 指第一个占用槽位，`队尾` 指下一个可入队槽位（满队时指最后一个槽位），不能简单指向容器左右边框，否则部分占用时指针语义错误；指针从标题区垂直指向槽位，避免横穿空槽；
- 入栈/入队从容器外侧飞入，出栈/出队向容器外飞出，用 `CanvasArrow` 标出动作方向，不要凭空消失；
- 坏数据防御：实际 `items.length` 超过 `capacity` 时，渲染层自动扩槽到 `max(capacity, items.length)`，计数保持 `n/capacity` 自洽，节点不会画到容器外。

### 6.7 reduced motion

```ts
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const updateMs = reduced ? 0 : 360;
```

- JS 侧所有过渡时长置 0；CSS 侧同时用 `@media (prefers-reduced-motion: reduce)` 关闭 `transition/animation`。
- 关闭动画后，状态仍要正确切换、解说仍要更新——reduced motion 不是 reduced information。

---

## 7. 教学层：让观众“看懂”而不只是“看到”

### 7.1 步骤解说公式

每步的解说按这个模板写：

```text
[动作] + [对象] + [原因/结果]
```

示例：

- ✅ “比较 `nums[2]=7` 与目标 9，差值 2 已出现在哈希表中，因此返回下标 `[0,2]`。”
- ❌ “处理元素。”
- ❌ “i 从 1 变成 2。”（只描述变量，没有解释意义）

解说控制在 1–2 句、约 40–80 个汉字；超过 120 字拆成两步或移到 `notes`。

### 7.2 代码同步

- 每步必须至少绑定一个 `anchorIds`，高亮当前执行行。
- 多语言使用同一组 anchor，禁止按行号硬编码。
- 代码高亮行会变化时，观众视线会从画布移到代码；此时画布只保留一个焦点，避免双重吸引。
- 变量旁注只展示 2–4 个关键变量，格式 `name = value`，不要把所有局部变量倒上去。

### 7.3 指标与徽标

- `operation` 徽标固定显示在画布标题右侧，如“比较”“入栈”。
- `metrics` 建议 2–3 个：已访问数、当前索引、累计值、队列长度。
- 指标值必须来自快照，不能根据当前时间/动画进度计算。
- 节点 `badge` 用于索引、指针名、深度等短标记（≤ 3 字符）。

### 7.4 信息层级（从上到下）

1. 步骤标题：我在哪一步
2. 操作徽标：这一步在做什么
3. 画布：数据长什么样、发生了什么
4. 解说：为什么这样做
5. 图例/指标：怎么读这张图
6. 代码/变量：对应哪一行、哪些值

同一层级不要放两个竞争焦点的元素。

---

## 8. 各数据结构配方

### 8.1 数组 / 双指针

- 主轴水平，索引从左到右；`badge` 写 `0..n-1`。
- 指针用画布下方的三角形或 `badge`，移动时只做水平平移。
- 比较：两个元素 `compare`；淘汰：转 `visited`；命中：转 `done`。
- 交换：两个节点沿圆弧换位（路径中点抬高 40–60px），不要瞬移。
- 滑动窗口：用半透明矩形覆盖窗口区间，随 `left/right` 过渡。

### 8.2 链表

- 节点水平排列，节点间用有向边。
- 改指针：旧边淡出，新边生长；不要同时保留两条同向边。
- `prev/curr/next` 用三个 badge 跟随节点，不另建节点。
- 反转：每次只动一条 `next` 指针，一步一条，观众才跟得上。
- null 节点用虚线空心圆，标签写 `null`。

### 8.3 栈 / 队列

- 一律用容器：`createStack/createQueue` 生成 `nodes + containers`，由 `renderContainers` 画外框、槽位、计数与指针（见 6.6）。
- 栈：垂直容器，底部固定，`push` 从上方落入，`pop` 向上浮出；栈顶/栈底指针始终可见。
- 队列：水平容器，`enqueue` 从右进，`dequeue` 从左出，其余元素平移补位；非空时队首/队尾指针始终可见。
- 容器边框与槽位固定，不随元素数量跳动；空容器保留槽位并写“空栈/空队列”。
- 容量、指针、计数三件事必须在同一帧里同时正确；不要用一排裸节点 + 文字说明替代。
- 每步箭头必须写动作（`push 4` / `pop 6` / `enqueue A` / `dequeue B`），不要只画一根无字箭头。

### 8.4 哈希表

- 右侧独立泳道，键值对为两列小卡片。
- 插入：卡片从主结构飞入并落到桶位；命中：对应卡片 `done` 并脉冲。
- 冲突：同一桶纵向堆叠，链地址法用短连线。
- 不要每步重排所有键；只移动新增/删除的卡片。

### 8.5 二叉树

- 层序布局：根在顶部居中，子节点左右展开。
- 进入节点：`current`；访问完成：`visited`；回溯：`current` 回到父节点。
- 递归栈单独放右侧，每层一个矩形，`recurse` 入栈、`return` 出栈。
- 节点较多时缩小半径/字号，但保持最小点击与可读尺寸（半径 ≥ 14）。

### 8.6 图

- 固定坐标优先；必须自动布局时只布局一次并缓存。
- 访问：节点 `visited`，出边 `active`，入边保持 `idle`。
- BFS/DFS 队列/栈与图分列，当前扩展节点与队首同时高亮。
- 最短路：最终边转 `path` 并加粗，节点转 `done`。
- 边权标签放在边的中点偏移处，避免与节点重叠。

### 8.7 网格 / DP

- 单元格为圆角矩形，行列标题固定。
- 当前格 `current`，依赖格 `compare`，已填格 `visited`，答案格 `done`。
- 转移箭头从依赖格指向当前格，一步一条或一组（同构转移可合并）。
- 网格较大时只显示当前窗口，并保持行列对齐。

### 8.8 递归 / 回溯

- 递归栈作为主视觉之一，每层显示函数名 + 关键参数。
- 进入：新帧从上方落下（`recurse`）；返回：帧上浮淡出（`return`）。
- 当前帧 `current`，已完成帧 `visited`，剪枝帧 `error` 或 `visited`。
- 回溯撤销时，数据结构的恢复也要有动画（反向播放插入/交换），不能瞬间复原。

---

## 9. 反模式清单（出现即返工）

| 反模式 | 后果 | 正确做法 |
| --- | --- | --- |
| 每步 `selectAll('*').remove()` 重建 | 闪烁、缩放跳动、无法过渡 | 分层 + keyed join |
| 节点没有稳定 ID | 无法判断谁移动，动画错位 | 用语义 ID（`a0`、`node-3`） |
| 每步重新计算随机/力导向坐标 | 布局抖动，观众无法追踪 | 固定坐标/一次布局缓存 |
| 一帧同时改 5 个以上元素 | 视觉噪声，抓不住重点 | 一步一焦点，必要时拆步 |
| 焦点离开立即恢复 idle | 丢失搜索轨迹 | 转 `visited` 留痕 |
| 动画时长 > 停留时间 | 下一步打断上一步，永远播不完 | 时长 ≤ 停留 × 0.45 |
| 用颜色作为唯一状态信号 | 色觉障碍不可读 | 加形状/描边/徽标 |
| 解说复述变量 | 观众不知道“为什么” | 动作 + 对象 + 原因/结果 |
| 图例随步骤增减 | 观众反复重新学习 | 全解法固定图例 |
| 忽略 reduced motion | 眩晕/无障碍不合格 | JS + CSS 双关闭 |
| 代码与画布不同步 | 无法建立“代码→画面”映射 | 每步绑定 anchor |
| 栈/队列只画一排裸节点 | 看不出 LIFO/FIFO、边界与容量 | 用容器 + 槽位 + 指针 |
| 箭头没有文字或指向不明 | 观众不知道发生了什么 | `text` 写动作 + 对象 |
| 标签固定偏移、压住节点/箭头 | 信息互相遮挡 | `placeLabels` 计算尺寸、避让并钳制边界 |
| 边从圆心画到圆心 | 线头/箭头被节点盖住，像穿模 | `trimSegment` 裁到节点外沿 |
| 队列指针永远指向容器左右边框 | 部分占用时队尾位置错误 | 指向占用槽位/下一个入队槽位 |
| 长节点文字溢出圆外 | 与边、标签、相邻节点粘连 | `fitNodeLabel` 缩小/截断，完整文字进 `<title>` |
| 退场直接 `transition().remove()` | 快速切帧后残留透明元素/旧标签 | 统一 `fadeOutAndRemove` / 节点专用退场 |
| 标签与容器指针重复表达同一语义 | 画面拥挤且互相遮挡 | 同一目标只保留一种标注 |

---

## 10. 执行路径（Agent 按序执行）

### M1 步骤规划

1. 写出算法的可观察状态清单（主结构/辅助结构/标量/代码锚点）。
2. 按 §2.2 切步，确保每步一个 `operation`、一个焦点。
3. 为每步写 `title`、`description`、`narration`、`binding`。
4. 为同构步骤统一 ID 与坐标规则。
5. 先写 `solutionRegistry` 的结构单测：步骤数量、ID 唯一、frame 引用有效、operation 非空。

### M2 画布实现

1. 在 `docs/ANIMATION_SPEC.md` 填写：结构、焦点、步数、配色例外、布局图。
2. 扩展 types（若模板尚未包含）。
3. 使用 `features/animation/motion.ts` 的时间/状态/图例工具。
4. 按 §6 实现分层 join、enter/update/exit、箭头生长。模板已拆好渲染器：
   `features/animation/render/{containers,nodes,edges,arrows,labels}.ts` 各管一层，
   `renderFrame.ts` 统一计算时长并编排调用；画布组件只负责结构与教学层。
   新增结构时扩展对应渲染器，不要把全部 join 重新塞回组件。
5. 栈/队列用 `features/animation/structures.ts` 生成布局；空容器、满容量、出栈/出队后的指针都要实际渲染验证。
6. 每条箭头写语义文字；需要解释“是什么/下一步”时加 `CanvasLabel`（`text` + `detail`），并确认不遮挡。
7. 增加操作徽标、解说、图例、指标。
8. 接入 `prefers-reduced-motion`。

### M3 打磨

1. 以 1x 完整播放一遍，记录每步停留是否足够读完解说。
2. 以 3x 播放，检查是否出现过渡排队/闪回。
3. 随机跳步 10 次、快速切换解法 3 次，检查画面与 DOM 是否有残留元素。
4. 检查任意两节点/标签不重叠，标签不压箭头文字，箭头不穿过节点中心。
5. 栈/队列逐帧核对：占用计数、指针、空状态、出栈/出队后的补位。
6. 截图对比相邻 3 步，确认“唯一变化点”清晰。

### M4 验收

运行以下命令并留存证据：

```bash
npm run test:unit        # motion 工具与步骤结构
npm run test:coverage    # 覆盖率门槛
npm run test:e2e         # 15 条必过用例（含动效断言）
npm run qa:full
```

人工检查：

- [ ] 每步有 operation 徽标和一句解说。
- [ ] 图例始终可见，颜色与状态一致。
- [ ] 相邻步骤至少有 60% 元素位置保持不变。
- [ ] 焦点元素唯一，旧焦点转为 `visited`。
- [ ] `prefers-reduced-motion` 下无过渡但信息完整。
- [ ] 代码高亮行、变量旁注、画布、解说四者同步。
- [ ] 无紫色、无重叠、无闪烁、无跳步错帧。

---

## 11. 自动化验证建议

### 11.1 纯函数单测（必须）

- `normalizeNodeStatus`：`highlight → current`，显式 `status` 优先。
- `resolveLegend`：默认图例固定；显式图例原样返回；`path/error` 自动追加。
- `deriveMetrics`：显式指标优先；否则统计节点/进行中/已访问。
- `motionDuration`：reduced motion 返回 0；倍速缩放；下限保护。
- `solutionRegistry`：步骤 ID 唯一、所有 `edge.from/to`、`label.targetId` 指向存在的节点、`operation` 非空。

### 11.2 E2E 断言（复用 15 条必过集合）

- 首屏：`operation-badge`、`step-narration`、`canvas-legend` 可见。
- 步进：解说文本变化、`data-operation` 变化、存在 `[data-status="current"]` 节点。
- 缩放：缩放层 transform 变化，画布层次不被破坏。
- 跳步/重置：当前步、解说、徽标三者一致。

### 11.3 视觉审查

- 1x 录屏完整播放，检查节奏。
- 相邻步骤截图叠加，检查位置稳定性。
- 1920×1080 与 1366×768 各看一次，确认单屏与字号。

---

## 12. 开源参考与可借鉴点

| 项目 | 值得借鉴 |
| --- | --- |
| [algorithm-visualizer](https://github.com/algorithm-visualizer/algorithm-visualizer) | tracer 状态计数、按结构拆分渲染器、命令按延迟分块、指数级速度控制 |
| [Pathfinding-Visualizer](https://github.com/clementmihailescu/Pathfinding-Visualizer) | `current`/`visited` 双状态、速度档位、最短路径逐段绘制、图例 |
| [algo-visualizers](https://github.com/sadanandpai/algo-visualizers) | CSS FLIP 位移动画、async generator 控制执行、比较/交换计数 |
| [AlgorithmVisualizer (TamimEhsan)](https://github.com/TamimEhsan/AlgorithmVisualizer) | 复用 SVG 工作区、分阶段插入/删除动画 |
| [algorithms-visualization](https://github.com/IllegalCreed/algorithms-visualization) | 快照 + 播放器分离、四语言执行行映射、步骤解说、回退/循环/变量面板 |
| [LeetCodeAnimation](https://github.com/MisterBooo/LeetCodeAnimation) | 单步 + 回退 + 倍速 + 语音解说、关键帧预览 |
| [illustrated-algorithms](https://github.com/ovidiuch/illustrated-algorithms) | 同一份源码执行与展示、过渡中途暂停/回退、调用栈可视化 |
| [sound-of-sorting](https://github.com/bingmann/sound-of-sorting) | 即时操作着色、上一状态保留、比较/访问计数 |
| [manim](https://github.com/3b1b/manim) | 程序化缓动与镜头语言（质量参考，非 Web 实现） |

**共性结论**：优秀的算法可视化都不是“把数据画出来再刷新”，而是
**快照 + 语义步骤 + 稳定布局 + 单一焦点 + 教学解说 + 可回退播放**。
本 Skill 的模板与 AC-023 正是按这六点落地。
