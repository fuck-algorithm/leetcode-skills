# Claude Code Skills for Algorithm Visualization

[![npm version](https://img.shields.io/npm/v/@fuck-algorithm/skills.svg)](https://www.npmjs.com/package/@fuck-algorithm/skills)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Marketplace](https://img.shields.io/badge/GitHub%20Marketplace-leetcode--skills-blue?logo=github)](https://github.com/marketplace/leetcode-skills)

专为 **Claude Code** 设计的 Skills 集合，用于创建交互式算法可视化教学网站。

> **目标**: 让任何人都能快速为 LeetCode 题目创建专业的算法演示网站

---

## 目录

- [快速开始](#快速开始)
- [包含的 Skills](#包含的-skills)
- [安装方法](#安装方法)
- [使用指南](#使用指南)
- [完整示例：创建两数之和演示](#完整示例创建两数之和演示)
- [进阶配置](#进阶配置)
- [开发新 Skill](#开发新-skill)
- [常见问题](#常见问题)

---

## 快速开始

### 方法 1：从 Claude Code Marketplace 安装（推荐）

在 Claude Code 中直接运行：

```
/plugin install leetcode-skills
```

然后使用：
```
/leetcode-skills:algorithm-visualization 帮我为 LeetCode 第 1 题两数之和创建算法演示网站
```

### 方法 2：开发模式

```bash
# 1. 克隆本仓库
git clone https://github.com/fuck-algorithm/leetcode-skills.git
cd leetcode-skills

# 2. 用开发模式加载插件
claude --plugin-dir .

# 3. 在 Claude Code 中直接使用 Skill
/leetcode-skills:algorithm-visualization 帮我为 LeetCode 第 1 题两数之和创建算法演示网站
```

---

## 包含的 Skills

### `algorithm-visualization`

创建 LeetCode 风格的算法演示教学网站，包含完整功能：

| 功能 | 描述 |
|------|------|
| **完整页面框架** | TypeScript + React + D3.js，单屏幕应用 |
| **响应式布局** | 紧凑设计，无滚动条，自适应不同屏幕 |
| **LeetCode 集成** | 标题可跳转题目页，返回 Hot 100 链接 |
| **GitHub 集成** | 徽标 + Star 数（API + IndexedDB 1小时缓存）|
| **算法思路** | 弹窗展示解题思路和复杂度分析 |
| **数据输入** | 自定义输入 + 3个内置样例 + 随机生成（带校验）|
| **代码展示** | Java/Python/Go/JS 四语言，语法高亮，变量值追踪 |
| **动画演示** | D3.js 画布，分步骤分镜，数据流动画 |
| **播放控制** | 播放/暂停/步进/可拖拽进度条/速度调节 |
| **交流群** | 微信群悬浮球，扫码加入算法交流 |

---

## 安装方法

### 方法 1: 从 Claude Code Marketplace 安装（推荐）

作为 Claude Code 官方插件安装：

```
/plugin install leetcode-skills
```

安装后即可使用 `/leetcode-skills:algorithm-visualization` 调用技能。

### 方法 2: 开发模式（本地测试）

```bash
# 克隆本仓库
git clone https://github.com/fuck-algorithm/leetcode-skills.git
cd leetcode-skills

# 用开发模式加载插件
claude --plugin-dir .

# 或者在另一个项目中引用本仓库
./install.sh /path/to/your/project
```

### 方法 3: 手动复制（兼容旧方式）

```bash
# 克隆仓库
git clone https://github.com/fuck-algorithm/leetcode-skills.git

# 复制 skill 到你的算法项目
cp -r skills/algorithm-visualization /path/to/your/project/.claude/skills/
```

---

## 使用指南

### 基本使用

安装完成后，在 Claude Code 中直接输入：

**方式 1: 自动调用**（推荐）
```
帮我为 LeetCode 第 206 题反转链表创建一个算法演示网站，
需要支持单链表和双指针两种解法，要有动画演示
```

**方式 2: 手动调用**（明确指定）
```
/leetcode-skills:algorithm-visualization 帮我创建第 3 题无重复字符的最长子串的演示
```

### 需要提供的信息

为了获得最佳效果，请准备以下信息：

1. **基本信息**
   - LeetCode 题号
   - 中文标题
   - 英文 slug（如 `two-sum`）
   - GitHub 仓库 URL

2. **题目内容**
   - 题目描述
   - 输入/输出格式
   - 数据约束条件

3. **解法信息**
   - 解法名称（如"暴力解法"、"哈希表优化"）
   - 每种解法的代码（Java/Python/Go/JavaScript）
   - 算法思路说明
   - 时间和空间复杂度

---

## 完整示例：创建"两数之和"演示

### 步骤 1: 安装 Skills

```bash
cd your-project
npm install --save-dev @fuck-algorithm/skills
```

### 步骤 2: 在 Claude Code 中使用

在 Claude Code 对话中输入：

```
/leetcode-skills:algorithm-visualization 帮我创建 LeetCode 第 1 题"两数之和"的算法演示网站

题目信息：
- 题号: 1
- 中文标题: 两数之和
- slug: two-sum
- GitHub 仓库: https://github.com/fuck-algorithm/leetcode-1-two-sum

题目描述：
给定一个整数数组 nums 和一个整数目标值 target，请你在该数组中找出和为目标值 target 的那两个整数，并返回它们的数组下标。

输入格式：
- nums: 整数数组，2 <= nums.length <= 10^4
- target: 目标整数，-10^9 <= target <= 10^9

解法 1: 暴力解法
时间复杂度: O(n²)，空间复杂度: O(1)
代码（Java）:
class Solution {
    public int[] twoSum(int[] nums, int target) {
        for (int i = 0; i < nums.length; i++) {
            for (int j = i + 1; j < nums.length; j++) {
                if (nums[i] + nums[j] == target) {
                    return new int[] { i, j };
                }
            }
        }
        return new int[] {};
    }
}

解法 2: 哈希表优化
时间复杂度: O(n)，空间复杂度: O(n)
代码（Java）:
class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[] {};
    }
}
```

### 步骤 3: Skill 将为你生成

1. **完整项目结构**
   ```
   leetcode-1-two-sum-visualization/
   ├── index.html
   ├── package.json
   ├── vite.config.ts
   ├── tsconfig.json
   ├── .github/workflows/deploy.yml
   ├── README.md
   └── src/
       ├── main.tsx
       ├── App.tsx
       ├── index.css
       ├── types/
       ├── utils/
       ├── hooks/
       ├── components/
       │   ├── Header.tsx
       │   ├── GitHubBadge.tsx
       │   ├── AlgorithmModal.tsx
       │   ├── DataInput.tsx
       │   ├── CodePanel.tsx
       │   ├── Canvas/
       │   ├── ControlPanel.tsx
       │   └── WeChatFloat.tsx
       └── algorithms/
           └── two-sum/
               ├── index.ts
               ├── steps.ts
               └── codes/
   ```

2. **所有组件代码**
   - Header: 带 LeetCode 链接的标题
   - GitHubBadge: 带 Star 数显示的徽标
   - DataInput: 数据输入和样例选择
   - CodePanel: 多语言代码展示
   - Canvas: D3.js 动画画布
   - ControlPanel: 播放控制面板

3. **动画步骤定义**
   - 为每种解法创建详细的动画步骤
   - 代码行与动画步骤绑定
   - 变量值变化追踪

4. **部署配置**
   - GitHub Actions 自动部署到 GitHub Pages

### 步骤 4: 本地预览

```bash
cd leetcode-1-two-sum-visualization
npm install
npm run dev
```

### 步骤 5: 部署

```bash
# 推送到 GitHub，自动触发部署
git add .
git commit -m "feat: 添加两数之和算法演示"
git push origin main
```

访问 `https://your-username.github.io/leetcode-1-two-sum-visualization/`

---

## 进阶配置

### 自定义配色

编辑 `src/index.css`，修改 CSS 变量：

```css
:root {
  --primary-color: #3b82f6;    /* 主色调 */
  --secondary-color: #10b981; /* 次要色 */
  --background-color: #f9fafb; /* 背景色 */
  /* 禁止使用紫色系 */
}
```

### 自定义动画速度

在 `ControlPanel.tsx` 中调整：

```typescript
const SPEEDS = [0.5, 1, 1.5, 2, 3]; // 可选播放速度
```

### 添加新的数据结构可视化

在 `src/components/Canvas/renderers/` 中添加新的渲染器：

```typescript
// renderers/graph.ts
export function renderGraph(svg, data, step, width, height) {
  // 实现图的可视化渲染
}
```

### 多解法切换

编辑 `src/App.tsx`，添加解法切换按钮：

```typescript
const [currentSolution, setCurrentSolution] = useState(0);
const solutions = [
  { name: '暴力解法', steps: bruteForceSteps },
  { name: '哈希表优化', steps: hashMapSteps }
];
```

---

## 开发新 Skill

如果你想为本仓库贡献新的 Skill：

### 步骤 1: 创建 Skill 目录

```bash
mkdir skills/your-skill-name
touch skills/your-skill-name/SKILL.md
```

### 步骤 2: 编写 SKILL.md

```markdown
---
name: your-skill-name
description: 描述这个 skill 的作用和使用场景
---

# Your Skill Name

## 概述
简要说明这个 skill 的作用。

## 使用流程
1. 步骤 1
2. 步骤 2
...

## 示例
提供使用示例
```

### 步骤 3: 添加模板文件（可选）

```bash
mkdir skills/your-skill-name/templates
touch skills/your-skill-name/templates/template-file.tsx
```

### 步骤 4: 测试

在开发模式下加载插件：

```bash
claude --plugin-dir .
```

### 步骤 5: 提交 PR

```bash
git add .
git commit -m "feat: 添加新的 skill - your-skill-name"
git push origin your-branch
```

---

## 目录结构

```
.claude-plugin/
└── plugin.json                  # 插件元数据（name, version, description）

skills/                          # Skills 源代码目录
└── algorithm-visualization/     # 算法可视化 Skill
    ├── SKILL.md                 # Skill 定义和使用指南
    ├── assets/                  # 本地缓存（LeetCode 题目数据）
    ├── references/              # 详细参考文档
    ├── scripts/                 # Skill 辅助脚本
    └── templates/               # 模板文件目录
        ├── App.tsx              # 主应用组件模板
        ├── main.tsx             # 入口文件模板
        ├── types.ts             # 类型定义模板
        ├── package.json         # 项目配置模板
        ├── vite.config.ts       # Vite 配置模板
        ├── index.css            # 全局样式模板
        ├── deploy.yml           # GitHub Actions 部署配置
        └── gitignore            # .gitignore 模板

install.sh                       # 开发模式安装脚本
install.js                       # Node.js 安装脚本
package.json                     # npm 包配置
README.md                        # 本文件
CLAUDE.md                        # Claude Code 开发指南
```

---

## 常见问题

### Q: 安装后 Claude Code 没有识别到 Skill？

**A**: 检查以下几点：
1. Skills 是否安装在 `.claude/skills/` 目录
2. `SKILL.md` 文件是否存在
3. 重启 Claude Code
4. 尝试手动调用: `/leetcode-skills:algorithm-visualization`

### Q: 如何更新已安装的 Skill？

**A**: 重新运行安装命令：
```bash
# 如果你使用 npm
npm update @fuck-algorithm/skills

# 如果你使用脚本
cd leetcode-skills
./install.sh /path/to/your/project
```

### Q: 能否同时安装多个版本的 Skill？

**A**: 不建议。Skill 名称必须唯一。如需不同版本，建议创建不同名称的 Skill（如 `algorithm-visualization-v2`）。

### Q: 如何调试 Skill 是否生效？

**A**: 在 Claude Code 中输入：
```
请列出当前可用的所有 skills
```

### Q: 生成的网站如何自定义域名？

**A**: 
1. 在 `vite.config.ts` 中修改 `base` 配置
2. 在 GitHub Pages 设置中配置自定义域名
3. 添加 `CNAME` 文件

### Q: 动画性能不佳怎么办？

**A**:
1. 减少同时动画的元素数量
2. 优化 D3.js 选择器
3. 使用 `requestAnimationFrame`
4. 考虑对大型数据集进行简化展示

---

## 最佳实践

### Skill 命名规范

- 使用小写字母和连字符
- 名称简洁明了
- 例如: `algorithm-visualization`, `react-component-generator`

### 描述字段编写

`description` 是 Claude Code 判断是否调用此 skill 的关键：

```yaml
---
name: algorithm-visualization
description: 创建 LeetCode 风格的算法演示网站，包含代码展示、动画演示、数据可视化功能，用于教学和学习算法
---
```

### 模板文件编写

- 使用占位符标记需要替换的内容，如 `{题号}`, `{slug}`, `{中文标题}`
- 提供完整的、可直接运行的代码
- 添加详细的中文注释

---

## 相关链接

- [Claude Code 官方文档](https://docs.anthropic.com/en/docs/claude-code/skills)
- [LeetCode Hot 100 可视化](https://fuck-algorithm.github.io/leetcode-hot-100/)
- [算法交流群](https://github.com/fuck-algorithm/.github/blob/main/profile/README.md)
- [Issues & PRs](https://github.com/fuck-algorithm/leetcode-skills/issues)

---

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 贡献

欢迎提交 Issue 和 PR！

### 贡献流程

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交你的更改 (`git commit -m 'feat: 添加某个功能'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开一个 Pull Request

### 代码规范

- 使用中文编写文档和注释
- 遵循现有 Skill 的结构和格式
- 提供完整的使用示例
- 更新 README 文档

---

**Happy Coding! **
