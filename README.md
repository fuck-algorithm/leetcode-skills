# LeetCode 算法可视化 Skills

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

面向 **Claude Code** 的插件，提供 `algorithm-visualization` Skill：输入 LeetCode 题号或 slug，自动获取题目数据并生成一个可交互、可部署的算法可视化教学网站（TypeScript + React + D3.js，单屏应用）。

## 环境要求

- Claude Code（支持 Plugin / Skill）
- Node.js >= 20、npm
- Python 3（仅用于按需联网抓取题库；日常使用命中内置缓存，无需联网）

## 安装

### 从 Marketplace 安装（推荐）

```text
/plugin marketplace add fuck-algorithm/leetcode-skills
/plugin install leetcode-skills@leetcode-skills
```

安装后即可调用：

```text
/leetcode-skills:algorithm-visualization 帮我创建第 1 题两数之和的可视化
```

### 开发模式

```bash
git clone https://github.com/fuck-algorithm/leetcode-skills.git
cd leetcode-skills
claude --plugin-dir .
```

### 手动复制（兜底）

```bash
cp -r skills/algorithm-visualization /path/to/your/project/.claude/skills/
```

## 使用方式

直接描述题目与要求即可，Skill 会自动完成：

1. 自动获取题目数据：优先查本地缓存；首次可一键预下载约 1.7MB 全量题库（4280 道题，含中文描述与约束），未预取时按题联网抓取
2. 调用脚手架生成完整项目（不是手工复制模板）
3. 实现语义化分镜、稳定布局动效、代码高亮、变量旁注、步骤解说与播放控制
4. 跑通单元测试、覆盖率与 Playwright 验收后交付

示例：

```text
帮我为 LeetCode 第 206 题反转链表创建算法演示网站，
需要支持迭代和递归两种解法，并部署到 GitHub Pages。
```

题目信息不完整时，Skill 会先尝试从缓存/网络补全，只有确实拿不到时才向你确认。

## 生成的网站

- 单屏布局：输入、画布、代码、控制面板首屏可见
- 四种语言代码：Java / Python / Go / JavaScript，行号与当前行高亮
- 多解法独立分镜，切换时重置播放状态
- 播放/暂停、步进、快捷键、可拖拽进度条、速度记忆
- 输入校验、样例按钮、随机合法数据
- D3 画布平移缩放，节点/数组/哈希/栈队列等可视化
- 语义化动效：每步一个操作、唯一焦点、稳定 ID 过渡、状态留痕，不整屏重绘
- 教学层常驻：操作徽标、步骤解说、固定状态图例、访问/累计指标
- 支持 `prefers-reduced-motion` 降级，动画关闭后信息仍完整
- GitHub Star 徽标、算法思路弹窗、交流群二维码
- GitHub Actions 自动部署 Pages

生成项目的核心结构：

```text
leetcode-{题号}-{slug}-visualization/
├── App.tsx / main.tsx / index.css
├── features/                 # 解题、播放、输入等业务模块
├── components/               # 页面组件与可视化组件
├── services/                 # 存储、题库、GitHub API 等
├── tests/
│   ├── unit/                 # Vitest 单元测试
│   └── e2e/acceptance.spec.ts# Playwright 15 条验收用例
├── docs/                     # 质量门禁、测试计划、验收清单、动画规格
├── public/assets/            # 二维码等静态资源
├── scripts/check-quality-gates.mjs
└── .github/workflows/deploy.yml
```

## 生成项目的常用命令

```bash
npm install
npm run test:e2e:install   # 首次运行，安装 Chromium
npm run dev                # 随机高位端口（30000-65535）
npm run qa:guard           # 文档/配色/依赖/配置检查
npm run test:coverage      # Vitest + 覆盖率门槛 60/60/50
npm run test:e2e           # Playwright 15 条必过用例
npm run qa:full            # guard + lint + type-check + build + 覆盖率 + E2E
```

## 仓库结构

```text
.claude-plugin/
├── plugin.json               # 插件元数据
└── marketplace.json          # Marketplace 清单
skills/algorithm-visualization/
├── SKILL.md                  # Skill 执行规范
├── assets/leetcode-problems/ # 索引 + 缓存清单（题目数据由 Release 按需下载）
├── references/               # 8 份详细规范文档（08 = 动画与运动设计）
├── scripts/                  # 抓题、缓存构建、脚手架
│   ├── fetch-leetcode-problem.py
│   ├── build-problem-cache.py
│   ├── leetcode_text.py
│   └── scaffold-project.mjs
└── templates/                # 可直接跑通门禁的项目模板
scripts/
├── validate-skills.js        # 仓库结构校验
└── audit-skill.mjs           # 插件/Skill/模板/验收口径交叉自检
```

## 仓库维护

```bash
node scripts/validate-skills.js   # manifest 与目录结构
npm run audit                     # 插件、文档、模板、AC/E2E 一致性
python3 -m unittest discover -s skills/algorithm-visualization/scripts -p 'test_*.py'
npm run scaffold -- --out /tmp/demo --number 1 --title "两数之和" \
  --slug two-sum --repo https://github.com/example/demo
```

更新题库缓存（仅题库变化时需要）：

```bash
# 抓取全量题库到 ~/.cache/leetcode-skills/problems，并更新插件内索引
python3 skills/algorithm-visualization/scripts/build-problem-cache.py

# 打包确定性缓存包并更新 assets/leetcode-problems/cache-manifest.json
python3 skills/algorithm-visualization/scripts/pack-problem-cache.py \
  --out /tmp/leetcode-problems-v1.tar.gz

# 上传到 GitHub Release（清单中的 sha256 用于客户端校验）
gh release create problem-cache-v1 /tmp/leetcode-problems-v1.tar.gz
```

用户侧预下载（GitHub 慢时自动切换 jsDelivr 镜像，可用 `LEETCODE_SKILL_CACHE_URL` 指定源）：

```bash
python3 skills/algorithm-visualization/scripts/fetch-leetcode-problem.py --prefetch
```

## 常见问题

**安装后找不到 Skill？** 确认 Marketplace 已添加、插件名为 `leetcode-skills@leetcode-skills`，然后重启 Claude Code；用 `/leetcode-skills:algorithm-visualization` 显式调用排查。

**生成项目首次 `npm run test:e2e` 失败？** 先执行 `npm run test:e2e:install` 安装 Chromium。

**能否同时安装多个版本？** 不建议，Skill 名称需要唯一。

**如何自定义域名？** 在生成的 `vite.config.ts` 中配置 `base`，并在 GitHub Pages 设置中添加 `CNAME`。

## 相关链接

- [Claude Code Skills 文档](https://docs.anthropic.com/en/docs/claude-code/skills)
- [LeetCode Hot 100 可视化](https://fuck-algorithm.github.io/leetcode-hot-100/)
- [Issues & PRs](https://github.com/fuck-algorithm/leetcode-skills/issues)

## 许可证

MIT License，详见 [LICENSE](LICENSE)。
