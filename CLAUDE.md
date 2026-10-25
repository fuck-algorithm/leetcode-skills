# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is the **leetcode-skills** repository, a collection of Claude Code Skills for creating interactive algorithm visualization websites for LeetCode problems. Each skill generates complete TypeScript/React projects with D3.js animations.

This repository is published as a **Claude Code Plugin**. Users add the marketplace with `/plugin marketplace add fuck-algorithm/leetcode-skills`, install with `/plugin install leetcode-skills@leetcode-skills`, and invoke skills via `/leetcode-skills:algorithm-visualization`.

## Plugin Development

### Testing the Plugin Locally

```bash
# Load plugin in development mode
claude --plugin-dir .

# In Claude Code, test the skill
/leetcode-skills:algorithm-visualization 帮我创建两数之和的可视化
```

### Plugin Manifests
- `.claude-plugin/plugin.json` defines the plugin identity (`name`: `leetcode-skills`); `repository` must be a string URL for `claude plugin validate`
- `.claude-plugin/marketplace.json` must register the same plugin name/version so `/plugin marketplace add` works
- Skills under `skills/` are automatically discovered by Claude Code
- In `SKILL.md` and reference docs, always use `${CLAUDE_SKILL_DIR}` for in-skill paths; repo-relative paths break after plugin installation

## Architecture

### Skills System

- **Skills Location**: `skills/<skill-name>/`
- **Entry Point**: Each skill must have a `SKILL.md` file with YAML frontmatter (name, description)
- **Manifest**: `skills-manifest.json` registers all skills with id, path, entry, description, tags
- **State Tracking**: Installation state tracked in `.skills-repo-state.json` in target projects

### Directory Structure

```
.claude-plugin/
├── plugin.json                 # Plugin manifest (name, version, metadata)
└── marketplace.json            # Marketplace manifest (install source)

skills/
└── algorithm-visualization/    # Main skill for LeetCode visualization
    ├── SKILL.md                # Skill definition and execution spec
    ├── assets/                 # slim problem index + cache manifest (problems fetched on demand from a GitHub Release)
    ├── references/             # 8 detailed reference docs (08 = motion design)
    ├── scripts/                # fetch/build-cache/leetcode_text/scaffold-project
    └── templates/              # Runnable project templates
        ├── App.tsx, main.tsx   # React app templates
        ├── components/         # React component templates
        ├── features/           # Feature module templates
        ├── services/           # Storage/fetch services
        ├── tests/              # Unit + E2E tests
        ├── features/animation/ # Motion tokens, structures.ts (stack/queue layout)
        │   └── render/         # nodes/edges/arrows/labels/containers layer renderers
        ├── docs/               # Required docs (incl. ANIMATION_SPEC.md)
        ├── public/assets/      # QR code and static assets (copied to dist)
        ├── scripts/            # check-quality-gates.mjs
        ├── .github/workflows/  # deploy.yml template
        ├── .gitignore
        └── *.config.ts, *.json # Build configs

scripts/
├── create-skill.js            # CLI to scaffold new skill
├── validate-skills.js         # Validate manifest and structure
├── audit-skill.mjs            # Cross-check plugin/docs/template/AC consistency
└── skill-repo.js              # Core skill management functions

install.js / install.sh        # Legacy development install scripts
```

## Common Commands

### Repository Maintenance

```bash
# Create a new skill
node scripts/create-skill.js <skill-id> -d "description"

# Validate skill repository structure
node scripts/validate-skills.js

# Cross-check plugin manifests, SKILL/reference paths, template gates and AC/E2E
npm run audit

# Scaffold a real project from templates (used by CI smoke test)
npm run scaffold -- --out /tmp/demo --number 1 --title "两数之和" \
  --slug two-sum --repo https://github.com/example/demo

# Development install to target project (legacy fallback)
node install.js [target-project-path]
./install.sh [target-project-path]

# Load plugin in development mode (preferred)
claude --plugin-dir .
```

`npm run validate` runs both `validate-skills.js` and `audit-skill.mjs`.

### Generated Projects (from algorithm-visualization)

Generated projects use Vite + React + TypeScript + D3.js:

```bash
# Development (uses random port 30000-65535)
npm run dev
npm run dev:random-port

# Build and type checking
npm run build          # Full build with type check
npm run type-check     # tsc --noEmit only

# Testing
npm run test:unit              # Vitest (required before submission)
npm run test:unit:watch        # Vitest watch mode
npm run test:coverage          # Vitest with coverage (thresholds: 60/60/50)
npm run test:e2e               # Playwright (blocking suite)
npm run test:e2e:headed        # Playwright with UI

# Linting
npm run lint           # ESLint . --ext ts,tsx --max-warnings 0

# Quality Gates (enforced)
npm run qa:guard       # Check docs, no purple, QR, workflow, animation gates, AC-023
npm run qa:full        # guard + lint + type-check + build + test:coverage + test:e2e
```

### LeetCode Data Cache

```bash
# Fetch single problem (cache-first; falls back to leetcode.cn)
python3 skills/algorithm-visualization/scripts/fetch-leetcode-problem.py <slug-or-number>

# Pre-download the full cache (~1.7MB) into ~/.cache/leetcode-skills/problems
python3 skills/algorithm-visualization/scripts/fetch-leetcode-problem.py --prefetch

# Rebuild the cache and bundled index - only needed when the problem set changes
python3 skills/algorithm-visualization/scripts/build-problem-cache.py

# Pack the cache into a deterministic release asset + update cache-manifest.json
python3 skills/algorithm-visualization/scripts/pack-problem-cache.py --out /tmp/leetcode-problems-v1.tar.gz
gh release create problem-cache-v1 /tmp/leetcode-problems-v1.tar.gz

# jsDelivr mirrors read from the same-named branch, not from release assets
git worktree add -B problem-cache-v1 /tmp/cache-branch HEAD
cp /tmp/leetcode-problems-v1.tar.gz /tmp/cache-branch/
git -C /tmp/cache-branch add -A && git -C /tmp/cache-branch commit -m "chore(cache): update archive"
git -C /tmp/cache-branch push origin problem-cache-v1

# Normalization/cache regression tests
python3 -m unittest discover -s skills/algorithm-visualization/scripts -p 'test_*.py'
```

**Why the cache is not in git:** `claude plugin marketplace add` shallow-clones the whole repo. Shipping ~4300 problem JSONs made the clone large enough to time out on slow networks. Only `assets/leetcode-problems/index.json` (~170KB, `byNumber` only) and `cache-manifest.json` stay in the repo; problem data lives in the `problem-cache-v1` GitHub Release and is downloaded on demand (`LEETCODE_SKILL_CACHE_DIR` / `LEETCODE_SKILL_CACHE_URL` override location and mirror). `_bmad/` and `.windsurf/` development tooling live on the `bmad-tooling` branch and are intentionally absent from `main` to keep marketplace clones small; restore them with `git checkout bmad-tooling -- _bmad .windsurf` when needed.

Cache reads are normalized by `scripts/leetcode_text.py`: HTML entities are decoded, Markdown emphasis stripped, constraints re-extracted when missing, and `10<sup>4</sup>`-style exponents repaired. Old cache files are not rewritten on read.

## Key Conventions

### Skill ID Format
- Only lowercase letters, numbers, and hyphens: `^[a-z0-9][a-z0-9-]*$`
- Examples: `algorithm-visualization`, `react-component-generator`

### Generated Project Requirements

1. **Technology Stack**: TypeScript + React + D3.js + Vite
2. **Single Screen**: No scrolling, all content in viewport
3. **TDD Required**: Unit tests before implementation (`tests/unit/`)
4. **Coverage Thresholds**: lines >= 60%, functions >= 60%, branches >= 50%
5. **Required Docs** (in `docs/`): QUALITY_GATE.md, TEST_PLAN.md, ACCEPTANCE_CHECKLIST.md, ACCEPTANCE_REPORT_TEMPLATE.md, PROGRESSIVE_DELIVERY.md, PLAYWRIGHT_CASES.md, ANIMATION_SPEC.md
6. **Animation Model**: semantic `AlgorithmStep.operation` + `narration`, stable node IDs, keyed D3 joins/transitions (no full redraw), fixed status legend, motion tokens in `features/animation/motion.ts`, reduced-motion fallback; enforced by AC-023 and `qa:guard`
7. **Deployment**: GitHub Actions at `.github/workflows/deploy.yml` running guard, lint, type-check, build, coverage, E2E, then deploy-pages; `VITE_APP_BASE` derives the repo subpath
8. **Color Constraint**: No purple (enforced by check-quality-gates.mjs)
9. **Port Range**: 30000-65535 for dev server

### Acceptance Model (B1-B7)

Projects are evaluated on B1-B7 criteria:
- B1: No veto items
- B2: lint/type-check/build/test:coverage/test:e2e all pass (exit 0)
- B3: Playwright blocking suite 100%
- B4: AC-001 ~ AC-023 all pass
- B5: No P0/P1 defects
- B6: Rubric score >= 80
- B7: Evidence complete

Final state: `PASS` or `FAIL` only. Any B failure means FAIL.

### File Size Limits
- TS/TSX files should stay under 250 lines
- Must split if exceeding 350 lines

## Important Files

- `skills-manifest.json` - Central registry of all skills
- `skills/algorithm-visualization/SKILL.md` - Main execution spec with 35 blocking constraints
- `skills/algorithm-visualization/references/08-animation-motion-design.md` - Motion grammar, per-structure recipes, D3 implementation path
- `skills/algorithm-visualization/references/` - 8 detailed specification documents
- `skills/algorithm-visualization/scripts/scaffold-project.mjs` - Deterministic template-to-project generator (mandatory flow)
- `skills/algorithm-visualization/assets/leetcode-problems/` - Slim problem index + cache manifest; full problem data is downloaded from the `problem-cache-v1` release
- `.github/workflows/ci.yml` - Validates manifests/vendor paths and smoke-tests a scaffolded project (guard/lint/type-check/build/coverage/15 E2E)
