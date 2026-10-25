import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
let ok = true;

function fail(message) {
  console.error(`[FAIL] ${message}`);
  ok = false;
}

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

// 1. 必需文档与关键内容
const requiredDocs = [
  'docs/QUALITY_GATE.md',
  'docs/TEST_PLAN.md',
  'docs/ACCEPTANCE_CHECKLIST.md',
  'docs/ACCEPTANCE_REPORT_TEMPLATE.md',
  'docs/PROGRESSIVE_DELIVERY.md',
  'docs/PLAYWRIGHT_CASES.md',
  'docs/ANIMATION_SPEC.md'
];

const docRequiredSnippets = {
  'docs/QUALITY_GATE.md': ['最终判定模型', 'B1', 'B7', '失败闭环', 'AC-001~AC-023'],
  'docs/TEST_PLAN.md': ['失败分流与回归策略', 'AC-001~AC-023', 'B1-B7', 'test:coverage'],
  'docs/ACCEPTANCE_CHECKLIST.md': ['AC-001', 'AC-023', '必过规则'],
  'docs/ACCEPTANCE_REPORT_TEMPLATE.md': [
    '最终判定模型（B1-B7）',
    '验收轮次记录',
    'AC-023',
    'PASS',
    'FAIL'
  ],
  'docs/PROGRESSIVE_DELIVERY.md': ['阶段与最终通过关系', 'B1-B7'],
  'docs/PLAYWRIGHT_CASES.md': ['E2E-001', 'E2E-015', '必过集合'],
  'docs/ANIMATION_SPEC.md': [
    '运动语法',
    '状态图例',
    '稳定布局',
    'prefers-reduced-motion',
    '操作徽标',
    '辅助结构容器',
    '箭头与标注规范'
  ]
};

for (const rel of requiredDocs) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    fail(`缺少必需文档: ${rel}`);
    continue;
  }

  const content = fs.readFileSync(full, 'utf8');
  for (const snippet of docRequiredSnippets[rel] ?? []) {
    if (!content.includes(snippet)) {
      fail(`文档缺少关键内容: ${rel} -> ${snippet}`);
    }
  }
}

// 2. 禁止紫色主题（模板为根目录布局，不再检查不存在的 src/）
const cssPath = path.join(root, 'index.css');
if (!fs.existsSync(cssPath)) {
  fail('缺少 index.css');
} else {
  const css = read('index.css').toLowerCase();
  if (css.includes('purple') || css.includes('#800080') || css.includes('#7e22ce')) {
    fail('index.css 中出现紫色系 token');
  }
}

// 3. 部署工作流必须真实存在
const workflowPath = path.join(root, '.github', 'workflows', 'deploy.yml');
if (!fs.existsSync(workflowPath)) {
  fail('缺少 .github/workflows/deploy.yml（GitHub Pages 部署不会生效）');
} else {
  const wf = fs.readFileSync(workflowPath, 'utf8');
  const requiredSnippets = [
    'npm ci',
    'npm run lint',
    'npm run type-check',
    'npm run build',
    'actions/configure-pages@v5',
    'actions/upload-pages-artifact@v3',
    'actions/deploy-pages@v4'
  ];
  for (const snippet of requiredSnippets) {
    if (!wf.includes(snippet)) {
      fail(`部署工作流缺少步骤: ${snippet}`);
    }
  }
}

// 4. TDD：存在业务代码就必须有单元测试
const hasBusinessCode = ['features', 'components', 'services'].some((dir) => {
  const dirPath = path.join(root, dir);
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
});

const unitTestDir = path.join(root, 'tests', 'unit');
let unitTestFiles = [];
if (hasBusinessCode) {
  if (!fs.existsSync(unitTestDir)) {
    fail('缺少 tests/unit 目录（TDD 要求）');
  } else {
    unitTestFiles = fs
      .readdirSync(unitTestDir, { recursive: true })
      .filter(
        (file) =>
          typeof file === 'string' &&
          (file.endsWith('.test.ts') ||
            file.endsWith('.test.tsx') ||
            file.endsWith('.spec.ts') ||
            file.endsWith('.spec.tsx'))
      );
    if (unitTestFiles.length === 0) {
      fail('tests/unit 中没有单元测试（TDD 要求）');
    }
  }
}

// 5. AC-022：每种解法的 validateInput 必须有单元测试
if (unitTestFiles.length > 0) {
  const allUnitTestContent = unitTestFiles
    .map((file) => fs.readFileSync(path.join(unitTestDir, file), 'utf8'))
    .join('\n');
  if (!allUnitTestContent.includes('validateInput')) {
    fail('单元测试中没有覆盖 validateInput（AC-022）');
  }
}

// 5.1 动效与教学层骨架（AC-023）
const canvasFile = path.join(root, 'components', 'canvas', 'VisualizationCanvas.tsx');
if (!fs.existsSync(canvasFile)) {
  fail('缺少 components/canvas/VisualizationCanvas.tsx（AC-023 动效骨架）');
} else {
  const canvas = fs.readFileSync(canvasFile, 'utf8');
  // 渲染器可以内联在画布组件，也可以拆分到 features/animation/render/ 下
  const renderDir = path.join(root, 'features', 'animation', 'render');
  const renderFiles = fs.existsSync(renderDir)
    ? fs.readdirSync(renderDir).filter((file) => file.endsWith('.ts')).map((file) => path.join(renderDir, file))
    : [];
  const renderSource = [canvas, ...renderFiles.map((file) => fs.readFileSync(file, 'utf8'))].join('\n');

  for (const token of [
    'data-status',
    'data-operation',
    'step-narration',
    'canvas-legend',
    '.layer-containers',
    '.layer-nodes',
    'data-container-kind',
    'fadeOutAndRemove'
  ]) {
    if (!renderSource.includes(token)) {
      fail(`动效渲染层缺少教学层/状态/容器标记: ${token}`);
    }
  }
  if (renderSource.includes("selectAll('*').remove()")) {
    fail('动效渲染层仍在每步清空画布（必须使用按 id 的 data join 与过渡）');
  }
}

// 5.2 栈/队列容器与标注能力（AC-023 配套）
const structuresFile = path.join(root, 'features', 'animation', 'structures.ts');
if (!fs.existsSync(structuresFile)) {
  fail('缺少 features/animation/structures.ts（栈/队列容器布局）');
} else {
  const structures = fs.readFileSync(structuresFile, 'utf8');
  for (const token of ['createStack', 'createQueue', 'CanvasContainer']) {
    if (!structures.includes(token)) {
      fail(`features/animation/structures.ts 缺少: ${token}`);
    }
  }
}

const containersFile = path.join(root, 'features', 'animation', 'render', 'containers.ts');
if (!fs.existsSync(containersFile)) {
  fail('缺少 features/animation/render/containers.ts（栈/队列容器渲染）');
} else {
  const containers = fs.readFileSync(containersFile, 'utf8');
  for (const token of ['container-slot', 'container-pointer', '容器']) {
    if (!containers.includes(token)) {
      fail(`render/containers.ts 缺少容器语言: ${token}`);
    }
  }
}

const motionFile = path.join(root, 'features', 'animation', 'motion.ts');
if (!fs.existsSync(motionFile)) {
  fail('缺少 features/animation/motion.ts（统一动效时间与状态语义）');
} else {
  const motion = fs.readFileSync(motionFile, 'utf8');
  for (const token of ['MOTION', 'normalizeNodeStatus', 'resolveLegend', 'prefersReducedMotion']) {
    if (!motion.includes(token)) {
      fail(`features/animation/motion.ts 缺少: ${token}`);
    }
  }
}

if (fs.existsSync(cssPath)) {
  const css = read('index.css');
  if (!css.includes('prefers-reduced-motion')) {
    fail('index.css 缺少 prefers-reduced-motion 适配（AC-023）');
  }
  for (const token of ['container-box', 'container-pointer', 'label-bg']) {
    if (!css.includes(token)) {
      fail(`index.css 缺少容器/标注样式: ${token}`);
    }
  }
}

// 6. package.json 脚本与依赖
const pkgPath = path.join(root, 'package.json');
if (!fs.existsSync(pkgPath)) {
  fail('缺少 package.json');
} else {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  for (const script of ['test:unit', 'test:coverage', 'test:e2e', 'qa:guard', 'qa:full']) {
    if (!pkg.scripts?.[script]) {
      fail(`package.json 缺少脚本: ${script}`);
    }
  }
  if (!pkg.devDependencies?.vitest) {
    fail('package.json 缺少 vitest devDependency');
  }
  if (!String(pkg.scripts?.['qa:full'] ?? '').includes('test:coverage')) {
    fail('qa:full 未包含 test:coverage，覆盖率阈值不会被执行');
  }
}

// 7. 生成项目不允许残留模板占位符
const placeholderPattern = /\{(题号|中文标题|slug|github_repo|github_username)\}/;
for (const rel of ['App.tsx', 'index.html', 'package.json', 'vite.config.ts', 'README.md']) {
  const full = path.join(root, rel);
  if (fs.existsSync(full) && placeholderPattern.test(fs.readFileSync(full, 'utf8'))) {
    fail(`${rel} 仍包含未替换的模板占位符（请使用 scaffold-project.mjs 生成项目）`);
  }
}

// 8. 交流群二维码必须真实存在，且会随构建进入 dist
const qrPath = path.join(root, 'public', 'assets', 'qrcode-community.png');
if (!fs.existsSync(qrPath)) {
  fail('缺少 public/assets/qrcode-community.png（交流群二维码）');
} else if (fs.statSync(qrPath).size < 1024) {
  fail('public/assets/qrcode-community.png 体积异常，可能不是有效图片');
}

// 9. 基础工程文件
if (!fs.existsSync(path.join(root, '.gitignore'))) {
  fail('缺少 .gitignore');
}

if (!ok) {
  process.exit(1);
}

console.log('[PASS] quality gates check passed');
