# Skill Marketplace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a Marketplace-like CLI tool for browsing, searching, and installing Claude Code Skills with interactive UI

**Architecture:** Build an interactive CLI marketplace tool that reads from skills-manifest.json and remote skill registries, presents skills in a browsable TUI (Terminal User Interface) with search, filtering by tags, and one-click installation to `.claude/skills/`

**Tech Stack:** Node.js, `ink` (React for CLI), `ink-select-input`, `ink-text-input`, `chalk`, `fuse.js` (fuzzy search)

---

## File Structure

```
marketplace/
├── cli.tsx                    # Main entry point - TUI app
├── components/
│   ├── SkillList.tsx          # Browse/search skills list
│   ├── SkillDetail.tsx        # Skill info panel
│   ├── SearchBox.tsx          # Fuzzy search input
│   ├── TagFilter.tsx          # Tag-based filtering
│   └── InstallConfirm.tsx     # Installation confirmation
├── lib/
│   ├── registry.ts            # Skill registry fetching/caching
│   ├── installer.ts           # Installation logic (wraps skill-repo.js)
│   └── search.ts              # Fuzzy search with fuse.js
├── types.ts                   # Marketplace types
└── index.ts                   # Programmatic API

scripts/
├── marketplace.js             # Legacy CLI wrapper (optional)

package.json                   # Add marketplace script
```

---

## Task 1: Setup Marketplace Package Structure

**Files:**
- Create: `marketplace/cli.tsx`
- Create: `marketplace/types.ts`
- Create: `marketplace/lib/registry.ts`
- Modify: `package.json`

- [ ] **Step 1: Create marketplace directory structure**

```bash
mkdir -p marketplace/components marketplace/lib
touch marketplace/types.ts marketplace/cli.tsx
```

- [ ] **Step 2: Define TypeScript types**

```typescript
// marketplace/types.ts
export interface SkillRegistry {
  version: number;
  skills: SkillMetadata[];
}

export interface SkillMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  tags: string[];
  entry: string;
  repository?: string;
  installed?: boolean;
  installPath?: string;
}

export interface InstallOptions {
  targetProject: string;
  skillId: string;
  version?: string;
}

export interface RegistrySource {
  name: string;
  url: string;
  type: 'local' | 'remote' | 'github';
}
```

- [ ] **Step 3: Add marketplace dependencies to package.json**

```json
{
  "scripts": {
    "marketplace": "tsx marketplace/cli.tsx",
    "marketplace:search": "tsx marketplace/cli.tsx --search"
  },
  "devDependencies": {
    "ink": "^4.4.1",
    "ink-select-input": "^5.0.0",
    "ink-text-input": "^5.0.0",
    "chalk": "^5.3.0",
    "fuse.js": "^7.0.0",
    "react": "^18.2.0",
    "@types/react": "^18.2.0",
    "tsx": "^4.7.0"
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add marketplace/ package.json
git commit -m "feat(marketplace): setup package structure and types"
```

---

## Task 2: Implement Registry Management

**Files:**
- Create: `marketplace/lib/registry.ts`
- Create: `marketplace/lib/cache.ts`

- [ ] **Step 1: Create registry fetching logic**

```typescript
// marketplace/lib/registry.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { SkillRegistry, SkillMetadata, RegistrySource } from '../types';

const CACHE_DIR = path.join(os.homedir(), '.claude', 'marketplace-cache');
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export class RegistryManager {
  private sources: RegistrySource[] = [
    { name: 'local', url: './skills-manifest.json', type: 'local' },
    { name: 'community', url: 'https://raw.githubusercontent.com/fuck-algorithm/claude-skills-registry/main/registry.json', type: 'remote' }
  ];

  async loadRegistry(sourceName: string = 'local'): Promise<SkillRegistry> {
    const source = this.sources.find(s => s.name === sourceName);
    if (!source) throw new Error(`Unknown registry: ${sourceName}`);

    // Check cache first
    const cached = this.getCachedRegistry(sourceName);
    if (cached) return cached;

    // Fetch fresh
    const registry = await this.fetchRegistry(source);
    this.cacheRegistry(sourceName, registry);
    return registry;
  }

  private async fetchRegistry(source: RegistrySource): Promise<SkillRegistry> {
    if (source.type === 'local') {
      const content = fs.readFileSync(source.url, 'utf8');
      return JSON.parse(content);
    }

    // Remote registry
    const response = await fetch(source.url);
    if (!response.ok) throw new Error(`Failed to fetch registry: ${response.statusText}`);
    return response.json();
  }

  private getCachedRegistry(sourceName: string): SkillRegistry | null {
    const cachePath = path.join(CACHE_DIR, `${sourceName}.json`);
    if (!fs.existsSync(cachePath)) return null;

    const stat = fs.statSync(cachePath);
    if (Date.now() - stat.mtimeMs > CACHE_TTL) return null;

    return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  }

  private cacheRegistry(sourceName: string, registry: SkillRegistry): void {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    const cachePath = path.join(CACHE_DIR, `${sourceName}.json`);
    fs.writeFileSync(cachePath, JSON.stringify(registry, null, 2));
  }

  async listInstalledSkills(targetProject: string): Promise<string[]> {
    const skillsDir = path.join(targetProject, '.claude', 'skills');
    if (!fs.existsSync(skillsDir)) return [];
    
    return fs.readdirSync(skillsDir)
      .filter(name => fs.statSync(path.join(skillsDir, name)).isDirectory());
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add marketplace/lib/registry.ts marketplace/lib/cache.ts
git commit -m "feat(marketplace): implement registry fetching and caching"
```

---

## Task 3: Implement Search and Filter

**Files:**
- Create: `marketplace/lib/search.ts`

- [ ] **Step 1: Create fuzzy search with Fuse.js**

```typescript
// marketplace/lib/search.ts
import Fuse from 'fuse.js';
import type { SkillMetadata } from '../types';

export interface SearchOptions {
  query?: string;
  tags?: string[];
  installed?: boolean;
}

export class SkillSearch {
  private fuse: Fuse<SkillMetadata>;

  constructor(skills: SkillMetadata[]) {
    this.fuse = new Fuse(skills, {
      keys: [
        { name: 'name', weight: 0.4 },
        { name: 'description', weight: 0.3 },
        { name: 'tags', weight: 0.2 },
        { name: 'id', weight: 0.1 }
      ],
      threshold: 0.4,
      includeScore: true
    });
  }

  search(options: SearchOptions): SkillMetadata[] {
    let results = this.fuse.list;

    // Text search
    if (options.query) {
      results = this.fuse.search(options.query).map(r => r.item);
    }

    // Tag filter
    if (options.tags && options.tags.length > 0) {
      results = results.filter(skill =>
        options.tags!.some(tag => skill.tags.includes(tag))
      );
    }

    // Installed filter
    if (options.installed !== undefined) {
      results = results.filter(skill =>
        options.installed ? skill.installed : !skill.installed
      );
    }

    return results;
  }

  getAllTags(): string[] {
    const tagSet = new Set<string>();
    this.fuse.list.forEach(skill => skill.tags.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add marketplace/lib/search.ts
git commit -m "feat(marketplace): implement fuzzy search and filtering"
```

---

## Task 4: Create TUI Components

**Files:**
- Create: `marketplace/components/SkillList.tsx`
- Create: `marketplace/components/SearchBox.tsx`
- Create: `marketplace/components/TagFilter.tsx`

- [ ] **Step 1: Create SkillList component**

```tsx
// marketplace/components/SkillList.tsx
import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import type { SkillMetadata } from '../types';

interface SkillListProps {
  skills: SkillMetadata[];
  onSelect: (skill: SkillMetadata) => void;
  highlightedTag?: string;
}

export const SkillList: React.FC<SkillListProps> = ({ skills, onSelect, highlightedTag }) => {
  const items = skills.map(skill => ({
    label: `${skill.installed ? '✓ ' : '  '}${skill.name}`,
    value: skill.id,
    skill
  }));

  return (
    <Box flexDirection="column">
      <Text bold>Available Skills ({skills.length})</Text>
      <Box marginTop={1}>
        <SelectInput
          items={items}
          onSelect={item => onSelect(item.skill)}
        />
      </Box>
    </Box>
  );
};
```

- [ ] **Step 2: Create SearchBox component**

```tsx
// marketplace/components/SearchBox.tsx
import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface SearchBoxProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export const SearchBox: React.FC<SearchBoxProps> = ({ onSearch, placeholder = "Search skills..." }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = () => {
    onSearch(query);
  };

  return (
    <Box>
      <Text color="cyan">🔍 </Text>
      <TextInput
        value={query}
        onChange={setQuery}
        onSubmit={handleSubmit}
        placeholder={placeholder}
      />
    </Box>
  );
};
```

- [ ] **Step 3: Create TagFilter component**

```tsx
// marketplace/components/TagFilter.tsx
import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';

interface TagFilterProps {
  tags: string[];
  selectedTags: string[];
  onToggle: (tag: string) => void;
}

export const TagFilter: React.FC<TagFilterProps> = ({ tags, selectedTags, onToggle }) => {
  const items = tags.map(tag => ({
    label: `${selectedTags.includes(tag) ? '[x]' : '[ ]'} ${tag}`,
    value: tag
  }));

  return (
    <Box flexDirection="column" marginRight={2}>
      <Text bold>Filter by Tag</Text>
      <Box marginTop={1}>
        <SelectInput
          items={items}
          onSelect={item => onToggle(item.value)}
        />
      </Box>
    </Box>
  );
};
```

- [ ] **Step 4: Commit**

```bash
git add marketplace/components/
git commit -m "feat(marketplace): add TUI components for skill browsing"
```

---

## Task 5: Create Main CLI Application

**Files:**
- Create: `marketplace/cli.tsx`
- Modify: `marketplace/lib/installer.ts`

- [ ] **Step 1: Create main CLI app with ink**

```tsx
#!/usr/bin/env tsx
// marketplace/cli.tsx
import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import { RegistryManager } from './lib/registry';
import { SkillSearch } from './lib/search';
import { SkillList } from './components/SkillList';
import { SearchBox } from './components/SearchBox';
import { TagFilter } from './components/TagFilter';
import type { SkillMetadata, SkillRegistry } from './types';

interface AppProps {
  targetProject: string;
}

const App: React.FC<AppProps> = ({ targetProject }) => {
  const { exit } = useApp();
  const [registry, setRegistry] = useState<SkillRegistry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<SkillMetadata | null>(null);
  const [mode, setMode] = useState<'browse' | 'detail' | 'installing'>('browse');

  useEffect(() => {
    const load = async () => {
      const manager = new RegistryManager();
      const reg = await manager.loadRegistry('local');
      
      // Mark installed skills
      const installed = await manager.listInstalledSkills(targetProject);
      reg.skills = reg.skills.map(s => ({
        ...s,
        installed: installed.includes(s.id)
      }));
      
      setRegistry(reg);
    };
    load();
  }, [targetProject]);

  const search = new SkillSearch(registry?.skills || []);
  const filteredSkills = search.search({
    query: searchQuery,
    tags: selectedTags
  });

  const allTags = search.getAllTags();

  const handleInstall = async (skill: SkillMetadata) => {
    setMode('installing');
    // Installation logic here
    console.log(`Installing ${skill.name}...`);
    // Call skill-repo.js installSkills
    exit();
  };

  useInput((input, key) => {
    if (key.escape) {
      if (mode === 'detail') setMode('browse');
      else exit();
    }
    if (input === 'q') exit();
  });

  if (!registry) {
    return <Text>Loading marketplace...</Text>;
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">🏪 Claude Code Skill Marketplace</Text>
      <Text dimColor>Press ESC to quit, Enter to select</Text>
      
      <Box marginTop={1}>
        <SearchBox onSearch={setSearchQuery} />
      </Box>

      <Box marginTop={1} flexDirection="row">
        <TagFilter
          tags={allTags}
          selectedTags={selectedTags}
          onToggle={tag => {
            setSelectedTags(prev =>
              prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
            );
          }}
        />
        <Box flexGrow={1}>
          <SkillList
            skills={filteredSkills}
            onSelect={skill => setSelectedSkill(skill)}
          />
        </Box>
      </Box>

      {selectedSkill && (
        <Box marginTop={1} borderStyle="single" padding={1}>
          <Text bold>{selectedSkill.name}</Text>
          <Text>{selectedSkill.description}</Text>
          <Text dimColor>Tags: {selectedSkill.tags.join(', ')}</Text>
          {selectedSkill.installed ? (
            <Text color="green">✓ Installed</Text>
          ) : (
            <Text color="yellow">Press Enter to install</Text>
          )}
        </Box>
      )}
    </Box>
  );
};

// Parse CLI args
const targetProject = process.argv[2] || process.cwd();

render(<App targetProject={targetProject} />);
```

- [ ] **Step 2: Create installer wrapper**

```typescript
// marketplace/lib/installer.ts
import { installSkills } from '../../scripts/skill-repo';
import type { InstallOptions } from '../types';

export async function installSkill(options: InstallOptions): Promise<void> {
  const summary = installSkills({
    packageRoot: process.cwd(),
    targetProject: options.targetProject,
    selectedSkillIds: [options.skillId],
    logger: console
  });

  console.log(`Installed ${summary.installedSkills.length} skill(s)`);
}
```

- [ ] **Step 3: Commit**

```bash
git add marketplace/cli.tsx marketplace/lib/installer.ts
git commit -m "feat(marketplace): create main TUI application"
```

---

## Task 6: Add CLI Commands and Documentation

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Create: `marketplace/README.md`

- [ ] **Step 1: Update package.json with marketplace scripts**

```json
{
  "scripts": {
    "marketplace": "tsx marketplace/cli.tsx",
    "marketplace:install": "tsx marketplace/cli.tsx --install",
    "marketplace:search": "tsx marketplace/cli.tsx --search",
    "marketplace:list": "tsx marketplace/cli.tsx --list"
  }
}
```

- [ ] **Step 2: Add marketplace section to main README**

```markdown
## Skill Marketplace

Browse and install skills interactively:

```bash
# Launch interactive marketplace
npm run marketplace

# Search for skills
npm run marketplace:search algorithm

# Install specific skill
npm run marketplace:install algorithm-visualization
```

### Marketplace Features

- 🔍 **Fuzzy search** - Find skills by name, description, or tags
- 🏷️ **Tag filtering** - Filter by categories like "algorithm", "react", "d3"
- ✓ **Install status** - See which skills are already installed
- 🎯 **One-click install** - Install skills directly from the TUI
```

- [ ] **Step 3: Commit**

```bash
git add package.json README.md marketplace/README.md
git commit -m "docs(marketplace): add marketplace documentation and npm scripts"
```

---

## Task 7: Testing and Quality Gates

**Files:**
- Create: `marketplace/tests/registry.test.ts`
- Create: `marketplace/tests/search.test.ts`

- [ ] **Step 1: Write tests for registry**

```typescript
// marketplace/tests/registry.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { RegistryManager } from '../lib/registry';

describe('RegistryManager', () => {
  const testDir = path.join(os.tmpdir(), 'marketplace-test-' + Date.now());
  
  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should load local registry', async () => {
    const manager = new RegistryManager();
    const registry = await manager.loadRegistry('local');
    
    expect(registry).toBeDefined();
    expect(registry.version).toBe(1);
    expect(Array.isArray(registry.skills)).toBe(true);
  });

  it('should list installed skills', async () => {
    // Create fake installed skill
    const skillsDir = path.join(testDir, '.claude', 'skills');
    fs.mkdirSync(skillsDir, { recursive: true });
    fs.mkdirSync(path.join(skillsDir, 'test-skill'));

    const manager = new RegistryManager();
    const installed = await manager.listInstalledSkills(testDir);
    
    expect(installed).toContain('test-skill');
  });
});
```

- [ ] **Step 2: Write tests for search**

```typescript
// marketplace/tests/search.test.ts
import { describe, it, expect } from 'vitest';
import { SkillSearch } from '../lib/search';
import type { SkillMetadata } from '../types';

const mockSkills: SkillMetadata[] = [
  { id: 'skill-a', name: 'Algorithm Visualizer', description: 'Visualize algorithms', tags: ['algorithm', 'react'] },
  { id: 'skill-b', name: 'React Component Gen', description: 'Generate React components', tags: ['react', 'component'] },
  { id: 'skill-c', name: 'D3 Charts', description: 'Create D3 charts', tags: ['d3', 'visualization'] }
];

describe('SkillSearch', () => {
  it('should search by name', () => {
    const search = new SkillSearch(mockSkills);
    const results = search.search({ query: 'algorithm' });
    
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('skill-a');
  });

  it('should filter by tags', () => {
    const search = new SkillSearch(mockSkills);
    const results = search.search({ tags: ['react'] });
    
    expect(results.length).toBe(2);
    expect(results.map(r => r.id)).toContain('skill-a');
    expect(results.map(r => r.id)).toContain('skill-b');
  });

  it('should get all unique tags', () => {
    const search = new SkillSearch(mockSkills);
    const tags = search.getAllTags();
    
    expect(tags).toContain('algorithm');
    expect(tags).toContain('react');
    expect(tags).toContain('d3');
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm install
npm run test:unit -- marketplace/tests/
```

Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add marketplace/tests/
git commit -m "test(marketplace): add unit tests for registry and search"
```

---

## Task 8: Final Integration and QA

- [ ] **Step 1: Run full QA pipeline**

```bash
npm run qa:full
```

Expected: All checks pass (guard, lint, type-check, build, test:unit, test:e2e)

- [ ] **Step 2: Test marketplace manually**

```bash
npm run marketplace
```

Expected: TUI opens, shows skills, search works, can navigate with arrow keys

- [ ] **Step 3: Final commit and push**

```bash
git add -A
git commit -m "feat(marketplace): complete skill marketplace with TUI

- Interactive CLI for browsing skills
- Fuzzy search and tag filtering
- One-click installation
- Full test coverage

Closes #marketplace-feature"

git push origin main
```

---

## Summary

**What was built:**
- Interactive TUI marketplace using React + Ink
- Fuzzy search with Fuse.js
- Tag-based filtering
- Registry caching for performance
- Integration with existing skill-repo.js

**Usage:**
```bash
npm run marketplace                    # Launch interactive TUI
npm run marketplace:search algorithm   # Search mode
npm run marketplace:list               # List all skills
```

**Files created:**
- `marketplace/cli.tsx` - Main TUI application
- `marketplace/types.ts` - TypeScript types
- `marketplace/lib/registry.ts` - Registry management
- `marketplace/lib/search.ts` - Fuzzy search
- `marketplace/lib/installer.ts` - Installation wrapper
- `marketplace/components/*.tsx` - UI components
- `marketplace/tests/*.test.ts` - Unit tests
