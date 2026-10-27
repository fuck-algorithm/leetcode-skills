<div align="center">

# LeetCode Skills for Claude Code

**把任意 LeetCode 题目变成可交互、带动画的算法可视化网站。**

[English](README.md) | 简体中文

[![CI](https://github.com/fuck-algorithm/leetcode-skills/actions/workflows/ci.yml/badge.svg)](https://github.com/fuck-algorithm/leetcode-skills/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-339933.svg)](https://nodejs.org/)

</div>

## 一键安装提示词

把下面这段提示词复制给 Claude Code，它会自动安装并确认插件状态：

```text
帮我为 Claude Code 安装 leetcode-skills 插件：
1. 运行 `claude plugin marketplace add fuck-algorithm/leetcode-skills`
2. 运行 `claude plugin install leetcode-skills@leetcode-skills`
3. 运行 `claude plugin list`，确认 `leetcode-skills` 已经安装。
如果任何命令失败，停下来并把完整报错发给我。
```

如果 Claude Code 提示需要重启，重启即可。也可以手动执行：

```text
/plugin marketplace add fuck-algorithm/leetcode-skills
/plugin install leetcode-skills@leetcode-skills
```

然后创建第一个可视化：

```text
/leetcode-skills:algorithm-visualization 帮我为 LeetCode 第 206 题反转链表创建一个交互式可视化。
```

## 它是什么

`leetcode-skills` 是一个 Claude Code 插件。其中的 `algorithm-visualization` Skill 会接收题号或 slug，抓取 leetcode.cn 的题目描述，生成完整的 Vite + React + TypeScript + D3.js 项目，并实现单屏动画教学网站——交付前还会跑通 lint、类型检查、覆盖率和 Playwright 验收。

它只专注一件事：**让算法的执行过程一步一步看得懂**，而不是把代码和数据摆出来。

## 你会得到什么

- **单屏、画布优先布局**——画布占据视口主体，标题、输入和控制栏保持紧凑；1366×768 与 1080p 都无需滚动。
- **语义化动画**——每步只有一个操作和一句解说，节点 ID 与位置稳定，使用 D3 keyed 过渡，不整屏重绘。
- **状态可读**——固定颜色图例（`current / compare / visited / done / path / error`）、焦点光环、访问轨迹，以及指针和指标标注。
- **栈/队列是真正的容器**——固定槽位、容量计数、方向指针和明确的空状态。
- **四种语言**——Java、Python、Go、JavaScript，支持当前行高亮和变量实时旁注。
- **多解法隔离**——每种解法拥有独立的步骤、代码和画布状态。
- **完整播放控制**——播放/暂停、上一步/下一步、可拖拽进度条、速度记忆和键盘快捷键。
- **无障碍动效**——支持 `prefers-reduced-motion`，关闭动画后状态与解说仍然完整。
- **可发布的成品**——质量门禁、带覆盖率阈值的单元测试、15 条 Playwright 验收用例，以及 GitHub Pages 部署工作流。
- **可被发现的仓库**——英文默认的 `README.md` 与互链的 `README.zh-CN.md`，外加英文 GitHub 描述和必需 Topics，全部由质量门禁强制校验。

在线示例：[LeetCode Hot 100 可视化](https://fuck-algorithm.github.io/leetcode-hot-100/)

## 环境要求

- 支持插件机制的 Claude Code
- Node.js 20+ 与 npm（用于生成的项目）
- Python 3（仅用于抓取题目数据；缓存数据会自动下载）

题目数据不存放在本仓库。首次使用会从 GitHub Release 下载约 1.7 MB 的题库缓存，失败时自动切换 jsDelivr 镜像，慢网络或受限网络也能使用。

## 生成的项目

```text
leetcode-{题号}-{slug}-visualization/
├── App.tsx / main.tsx / index.css
├── components/                 # 头部、输入、画布、代码、控制栏
├── features/                   # 解法、播放、动画渲染
├── services/                   # 存储、题目抓取
├── tests/
│   ├── unit/                   # Vitest
│   └── e2e/acceptance.spec.ts  # 15 条 Playwright 验收用例
├── docs/                       # 质量门禁、测试计划、动画规格
├── public/assets/              # 交流群二维码
├── scripts/                    # 质量门禁 + GitHub 元数据校验
├── README.md                   # 英文（GitHub 默认展示）
├── README.zh-CN.md             # 简体中文
└── .github/workflows/deploy.yml
```

生成项目中的常用命令：

```bash
npm install
npm run dev                # 随机高位端口（30000-65535）
npm run qa:guard           # 文档、双语 README、配色、布局、动效检查
npm run qa:repo            # GitHub 描述与 Topics（需已登录 gh）
npm run test:coverage      # Vitest，覆盖率门槛 60/60/50
npm run test:e2e:install   # 首次运行 Playwright 前安装 Chromium
npm run test:e2e           # 15 条验收用例
npm run qa:full            # guard + lint + type-check + build + coverage + e2e
```

## 仓库结构

```text
.claude-plugin/               # 插件与 Marketplace 清单
skills/algorithm-visualization/
├── SKILL.md                  # 执行规范与强约束
├── assets/leetcode-problems/ # 精简题号索引 + 缓存清单
├── references/               # 9 份设计与验收规范
├── scripts/                  # 抓题、缓存、脚手架
└── templates/                # 可直接跑通的项目模板
scripts/                      # 仓库校验与审计
```

## 开发

```bash
# 校验插件清单、文档、模板与验收口径
npm run validate

# Python 缓存/归一化测试
python3 -m unittest discover -s skills/algorithm-visualization/scripts -p 'test_*.py'

# 从模板生成项目
npm run scaffold -- --out /tmp/demo --number 1 --title "两数之和" \
  --title-en "Two Sum" --slug two-sum --repo https://github.com/example/demo

# 本地加载插件进行开发
claude --plugin-dir .
```

完整题库缓存位于 `problem-cache-v1` GitHub Release 与同名镜像分支，维护流程见 [`references/07-leetcode-data-source.md`](skills/algorithm-visualization/references/07-leetcode-data-source.md)。

## 常见问题

**安装后找不到 Skill？**
重启 Claude Code，然后运行 `claude plugin list` 确认 `leetcode-skills` 已安装；用 `/leetcode-skills:algorithm-visualization` 显式调用排查。

**Marketplace 安装超时？**
仓库已控制在 1 MB 以内，浅克隆仍然很快。如果本机完全无法访问 GitHub，可把仓库添加为本地 Marketplace 或使用镜像。

**首次运行 `npm run test:e2e` 失败？**
先执行 `npm run test:e2e:install` 安装 Chromium。

**生成的网站可以部署吗？**
可以。每个生成项目都自带 GitHub Actions 工作流，可自动部署到 GitHub Pages。

## 许可证

MIT License，详见 [LICENSE](LICENSE)。
