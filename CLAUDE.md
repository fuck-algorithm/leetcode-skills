# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is the **leetcode-skills** repository, a collection of Claude Code Skills for creating interactive algorithm visualization websites for LeetCode problems. Each skill generates complete TypeScript/React projects with D3.js animations.

## Architecture

### Skills System

- **Skills Location**: `skills/<skill-name>/`
- **Entry Point**: Each skill must have a `SKILL.md` file with YAML frontmatter (name, description)
- **Manifest**: `skills-manifest.json` registers all skills with id, path, entry, description, tags
- **State Tracking**: Installation state tracked in `.skills-repo-state.json` in target projects

### Directory Structure

```
skills/
└── algorithm-visualization/    # Main skill for LeetCode visualization
    ├── SKILL.md                # Skill definition and execution spec
    ├── agents/                 # Claude Code agent metadata
    ├── assets/                 # Static assets (leetcode-problems cache)
    ├── references/             # 7 detailed reference docs
    ├── scripts/                # Helper scripts (fetch-leetcode-problem.py, check-quality-gates.mjs)
    └── templates/              # Project generation templates
        ├── App.tsx, main.tsx   # React app templates
        ├── components/         # React component templates
        ├── features/           # Feature module templates
        ├── tests/              # Test setup templates
        ├── docs/               # Required documentation templates
        ├── scripts/            # Template project scripts
        └── *.config.ts, *.json # Build configs

scripts/
├── create-skill.js            # CLI to scaffold new skill
├── validate-skills.js         # Validate manifest and structure
└── skill-repo.js              # Core skill management functions

install.js / install.sh        # Install skills to target project
```

## Common Commands

### Repository Maintenance

```bash
# Create a new skill
node scripts/create-skill.js <skill-id> -d "description"

# Validate skill repository structure
node scripts/validate-skills.js

# Install skills to target project (default: current dir)
node install.js [target-project-path]
./install.sh [target-project-path]
```

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
npm run qa:guard       # Check required docs, no purple in CSS, vitest dependency
npm run qa:full        # Full pipeline: guard + lint + type-check + build + test:unit + test:e2e
```

### LeetCode Data Cache

```bash
# Fetch single problem (uses local cache first)
python3 skills/algorithm-visualization/scripts/fetch-leetcode-problem.py <slug-or-number>

# Rebuild full cache (4280 problems) - only needed for updates
python3 skills/algorithm-visualization/scripts/build-problem-cache.py
```

## Key Conventions

### Skill ID Format
- Only lowercase letters, numbers, and hyphens: `^[a-z0-9][a-z0-9-]*$`
- Examples: `algorithm-visualization`, `react-component-generator`

### Generated Project Requirements

1. **Technology Stack**: TypeScript + React + D3.js + Vite
2. **Single Screen**: No scrolling, all content in viewport
3. **TDD Required**: Unit tests before implementation (`tests/unit/`)
4. **Coverage Thresholds**: lines >= 60%, functions >= 60%, branches >= 50%
5. **Required Docs** (in `docs/`): QUALITY_GATE.md, TEST_PLAN.md, ACCEPTANCE_CHECKLIST.md, ACCEPTANCE_REPORT_TEMPLATE.md, PROGRESSIVE_DELIVERY.md, PLAYWRIGHT_CASES.md
6. **Deployment**: GitHub Actions with lint, type-check, build, deploy-pages
7. **Color Constraint**: No purple (enforced by check-quality-gates.mjs)
8. **Port Range**: 30000-65535 for dev server

### Acceptance Model (B1-B7)

Projects are evaluated on B1-B7 criteria:
- B1: No veto items
- B2: lint/type-check/build/test:unit/test:e2e all pass (exit 0)
- B3: Playwright blocking suite 100%
- B4: AC-001 ~ AC-022 all pass
- B5: No P0/P1 defects
- B6: Rubric score >= 80
- B7: Evidence complete

Final state: `PASS` or `FAIL` only. Any B failure means FAIL.

### File Size Limits
- TS/TSX files should stay under 250 lines
- Must split if exceeding 350 lines

## Important Files

- `skills-manifest.json` - Central registry of all skills
- `skills/algorithm-visualization/SKILL.md` - Main execution spec with 23 blocking constraints
- `skills/algorithm-visualization/references/` - 7 detailed specification documents
- `skills/algorithm-visualization/assets/leetcode-problems/` - Cached LeetCode data (4280 problems + index.json)
