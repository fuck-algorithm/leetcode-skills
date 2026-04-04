import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const requiredDocs = [
  'docs/QUALITY_GATE.md',
  'docs/TEST_PLAN.md',
  'docs/ACCEPTANCE_CHECKLIST.md',
  'docs/ACCEPTANCE_REPORT_TEMPLATE.md',
  'docs/PROGRESSIVE_DELIVERY.md',
  'docs/PLAYWRIGHT_CASES.md'
];

const docRequiredSnippets = {
  'docs/QUALITY_GATE.md': [
    '最终判定模型',
    'B1',
    'B7',
    '失败闭环'
  ],
  'docs/TEST_PLAN.md': [
    '失败分流与回归策略',
    'AC-001~AC-018',
    'B1-B7'
  ],
  'docs/ACCEPTANCE_CHECKLIST.md': [
    'AC-001',
    'AC-018',
    '必过规则'
  ],
  'docs/ACCEPTANCE_REPORT_TEMPLATE.md': [
    '最终判定模型（B1-B7）',
    '验收轮次记录',
    'PASS',
    'FAIL'
  ],
  'docs/PROGRESSIVE_DELIVERY.md': [
    '阶段与最终通过关系',
    'B1-B7'
  ],
  'docs/PLAYWRIGHT_CASES.md': [
    'E2E-001',
    'E2E-012',
    '必过集合'
  ]
};

let ok = true;

for (const rel of requiredDocs) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.error(`[FAIL] missing required doc: ${rel}`);
    ok = false;
    continue;
  }

  const content = fs.readFileSync(full, 'utf8');
  for (const snippet of docRequiredSnippets[rel] ?? []) {
    if (!content.includes(snippet)) {
      console.error(`[FAIL] doc missing snippet: ${rel} -> ${snippet}`);
      ok = false;
    }
  }
}

const cssPath = path.join(root, 'src', 'index.css');
if (fs.existsSync(cssPath)) {
  const css = fs.readFileSync(cssPath, 'utf8').toLowerCase();
  if (css.includes('purple') || css.includes('#800080') || css.includes('#7e22ce')) {
    console.error('[FAIL] purple-like tokens found in src/index.css');
    ok = false;
  }
}

const workflowPath = path.join(root, '.github', 'workflows', 'deploy.yml');
if (fs.existsSync(workflowPath)) {
  const wf = fs.readFileSync(workflowPath, 'utf8');
  const requiredSnippets = [
    'npm ci',
    'npm run lint',
    'npm run type-check',
    'npm run build',
    'actions/deploy-pages@v4'
  ];

  for (const snippet of requiredSnippets) {
    if (!wf.includes(snippet)) {
      console.error(`[FAIL] workflow missing snippet: ${snippet}`);
      ok = false;
    }
  }
}

// TDD enforcement: unit tests must exist if features/ components/ services/ exist
const srcDir = path.join(root, 'src');
const hasFeatureCode = ['features', 'components', 'services'].some((dir) => {
  const p = path.join(srcDir, dir);
  return fs.existsSync(p) && fs.statSync(p).isDirectory();
});

const unitTestDir = path.join(root, 'tests', 'unit');
if (hasFeatureCode) {
  if (!fs.existsSync(unitTestDir)) {
    console.error('[FAIL] missing tests/unit directory (TDD requirement)');
    ok = false;
  } else {
    const unitTests = fs.readdirSync(unitTestDir, { recursive: true })
      .filter((f) => typeof f === 'string' && (f.endsWith('.test.ts') || f.endsWith('.test.tsx') || f.endsWith('.spec.ts') || f.endsWith('.spec.tsx')));
    if (unitTests.length === 0) {
      console.error('[FAIL] no unit tests found in tests/unit (TDD requirement)');
      ok = false;
    }
  }
}

// package.json must contain test:unit script
const pkgPath = path.join(root, 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (!pkg.scripts?.['test:unit']) {
    console.error('[FAIL] package.json missing "test:unit" script');
    ok = false;
  }
  if (!pkg.devDependencies?.vitest) {
    console.error('[FAIL] package.json missing vitest devDependency');
    ok = false;
  }
}

if (!ok) {
  process.exit(1);
}

console.log('[PASS] quality gates check passed');
