<div align="center">

# LeetCode Skills for Claude Code

**Turn any LeetCode problem into an interactive, animated algorithm visualization website.**

English | [简体中文](README.zh-CN.md)

[![CI](https://github.com/fuck-algorithm/leetcode-skills/actions/workflows/ci.yml/badge.svg)](https://github.com/fuck-algorithm/leetcode-skills/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-339933.svg)](https://nodejs.org/)

</div>

## Install in one prompt

Copy the prompt below into Claude Code. Claude will install the plugin and verify it for you:

```text
Install the leetcode-skills plugin for Claude Code:
1. Run `claude plugin marketplace add fuck-algorithm/leetcode-skills`
2. Run `claude plugin install leetcode-skills@leetcode-skills`
3. Run `claude plugin list` and confirm `leetcode-skills` is installed.
If any command fails, stop and show me the exact error.
```

Restart Claude Code if it asks you to. Prefer doing it manually?

```text
/plugin marketplace add fuck-algorithm/leetcode-skills
/plugin install leetcode-skills@leetcode-skills
```

Then create your first visualization:

```text
/leetcode-skills:algorithm-visualization Create an interactive visualization for LeetCode 206, Reverse Linked List.
```

## What it does

`leetcode-skills` is a Claude Code plugin. Its `algorithm-visualization` skill takes a LeetCode number or slug, fetches the problem statement from leetcode.cn, scaffolds a complete Vite + React + TypeScript + D3.js project, and implements an animated teaching site — then runs lint, type checks, coverage, and Playwright acceptance tests before handing it over.

It is built for one job: **make the execution of an algorithm understandable step by step**, not just display code and data.

## What you get

- **Single-screen, canvas-first layout** — the visualization owns the viewport; title, input, and controls stay compact at both 1366×768 and 1080p.
- **Semantic animation** — one operation and one narration per step, stable node IDs and positions, keyed D3 transitions, no full-canvas redraws.
- **Readable state** — fixed color legend (`current / compare / visited / done / path / error`), focus rings, visited traces, and cursor/metric annotations.
- **Stacks and queues as real containers** — fixed slots, capacity count, direction pointers, and explicit empty states.
- **Four languages** — Java, Python, Go, and JavaScript with line highlighting and a live variable watch panel.
- **Multiple solutions** — each solution gets its own steps, code, and canvas state.
- **Full playback control** — play/pause, previous/next, draggable timeline, speed presets with memory, and keyboard shortcuts.
- **Accessible motion** — respects `prefers-reduced-motion` without hiding any state or explanation.
- **Production-ready output** — quality gates, unit tests with coverage thresholds, 15 Playwright acceptance checks, and a GitHub Pages deployment workflow.

Live example: [LeetCode Hot 100 visualizations](https://fuck-algorithm.github.io/leetcode-hot-100/)

## Requirements

- Claude Code with plugin support
- Node.js 20+ and npm (for generated projects)
- Python 3 (only for fetching problem data; cached data is downloaded automatically)

Problem data is not stored in this repository. The first use downloads a ~1.7 MB cache from a GitHub Release, with jsDelivr mirrors as fallback, so slow or restricted networks still work.

## Generated project

```text
leetcode-{number}-{slug}-visualization/
├── App.tsx / main.tsx / index.css
├── components/                 # header, input, canvas, code, controls
├── features/                   # solutions, playback, animation renderers
├── services/                   # storage, problem fetching
├── tests/
│   ├── unit/                   # Vitest
│   └── e2e/acceptance.spec.ts  # 15 Playwright checks
├── docs/                       # quality gate, test plan, animation spec
├── public/assets/              # community QR code
├── scripts/check-quality-gates.mjs
└── .github/workflows/deploy.yml
```

Common commands inside a generated project:

```bash
npm install
npm run dev                # random high port (30000-65535)
npm run qa:guard           # docs, color, layout, animation checks
npm run test:coverage      # Vitest with 60/60/50 thresholds
npm run test:e2e:install   # first Playwright run: install Chromium
npm run test:e2e           # 15 acceptance checks
npm run qa:full            # guard + lint + type-check + build + coverage + e2e
```

## Repository layout

```text
.claude-plugin/               # plugin and marketplace manifests
skills/algorithm-visualization/
├── SKILL.md                  # execution spec and blocking constraints
├── assets/leetcode-problems/ # slim problem index + cache manifest
├── references/               # 9 design and acceptance guides
├── scripts/                  # fetch, cache, scaffold
└── templates/                # runnable project baseline
scripts/                      # repository validation and audit
```

## Development

```bash
# Validate plugin manifests, docs, templates, and acceptance rules
npm run validate

# Python cache/normalization tests
python3 -m unittest discover -s skills/algorithm-visualization/scripts -p 'test_*.py'

# Scaffold a project from the templates
npm run scaffold -- --out /tmp/demo --number 1 --title "两数之和" \
  --slug two-sum --repo https://github.com/example/demo

# Load the plugin locally while developing
claude --plugin-dir .
```

The full problem cache lives in the `problem-cache-v1` GitHub Release and a same-named mirror branch. Maintenance steps are documented in [`references/07-leetcode-data-source.md`](skills/algorithm-visualization/references/07-leetcode-data-source.md).

## FAQ

**The skill doesn't show up after installation.**
Restart Claude Code, then run `claude plugin list` and confirm `leetcode-skills` is installed. Invoke it explicitly with `/leetcode-skills:algorithm-visualization`.

**Marketplace installation timed out.**
The repository is kept small (under 1 MB) so the shallow clone stays fast. If GitHub is unreachable from your machine, add the repository as a local marketplace or use a mirror.

**`npm run test:e2e` fails on the first run.**
Install the browser once with `npm run test:e2e:install`.

**Can generated sites be deployed?**
Yes. Every generated project includes a GitHub Actions workflow that deploys to GitHub Pages.

## License

MIT License. See [LICENSE](LICENSE).
