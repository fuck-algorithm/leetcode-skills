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
  'docs/QUALITY_GATE.md': ['最终判定模型', 'B1', 'B7', '失败闭环', 'AC-001~AC-024', 'qa:repo'],
  'docs/TEST_PLAN.md': ['失败分流与回归策略', 'AC-001~AC-024', 'B1-B7', 'test:coverage', 'qa:repo'],
  'docs/ACCEPTANCE_CHECKLIST.md': ['AC-001', 'AC-023', 'AC-024', '必过规则'],
  'docs/ACCEPTANCE_REPORT_TEMPLATE.md': [
    '最终判定模型（B1-B7）',
    '验收轮次记录',
    'AC-023',
    'AC-024',
    'PASS',
    'FAIL'
  ],
  'docs/PROGRESSIVE_DELIVERY.md': ['阶段与最终通过关系', 'B1-B7'],
  'docs/PLAYWRIGHT_CASES.md': ['E2E-001', 'E2E-015', '必过集合', 'AC-024'],
  'docs/ANIMATION_SPEC.md': [
    '运动语法',
    '状态图例',
    '稳定布局',
    'prefers-reduced-motion',
    '操作徽标',
    '辅助结构容器',
    '箭头与标注规范',
    '空间预算',
    '画布优先'
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

// 2.1 空间预算与布局基线（空间画布优先，AC-001）
if (fs.existsSync(cssPath)) {
  const css = read('index.css');
  const block = (selector) => {
    const start = css.indexOf(selector);
    if (start < 0) {
      return '';
    }
    const open = css.indexOf('{', start + selector.length);
    if (open < 0) {
      return '';
    }
    let depth = 0;
    for (let i = open; i < css.length; i += 1) {
      if (css[i] === '{') depth += 1;
      if (css[i] === '}') {
        depth -= 1;
        if (depth === 0) return css.slice(open + 1, i);
      }
    }
    return '';
  };

  for (const token of ['--space-1', '--space-2', '--space-3', '--header-height', '--code-panel-width']) {
    if (!css.includes(token)) {
      fail(`index.css 缺少布局 token: ${token}（画布优先与间距系统未落实）`);
    }
  }

  const headerHeight = css.match(/--header-height:\s*(\d+)px/);
  if (!headerHeight || Number(headerHeight[1]) > 52) {
    fail('--header-height 必须 ≤52px（顶部标题不得挤占画布）');
  }

  const codeWidth = css.match(/--code-panel-width:\s*clamp\((\d+)px,\s*[\d.]+vw,\s*(\d+)px\)/);
  if (!codeWidth || Number(codeWidth[1]) < 300 || Number(codeWidth[2]) > 420) {
    fail('--code-panel-width 必须为 clamp(320px, 24vw, 400px) 一类的受限宽度');
  }

  if (!block('.problem-header').includes('var(--header-height)')) {
    fail('.problem-header 必须使用 --header-height（固定紧凑头部）');
  }
  if (!/white-space:\s*nowrap/.test(block('.problem-title-link'))) {
    fail('.problem-title-link 必须单行省略（white-space: nowrap），禁止标题换行撑高');
  }
  if (!block('.workspace').includes('var(--code-panel-width)')) {
    fail('.workspace 必须用 --code-panel-width 限制代码栏宽度，保证画布 ≥68%');
  }
  if (!block('.workspace').includes('var(--space-2)')) {
    fail('.workspace 必须使用 var(--space-2) 的紧凑 padding/gap');
  }
  if (!block('.canvas-card').includes('height: 100%')) {
    fail('.canvas-card 必须 height: 100%，禁止写死画布高度');
  }
  if (!/grid-template-columns/.test(block('.playback-footer'))) {
    fail('.playback-footer 必须单行网格布局（按钮组 | 进度条 | 步数）');
  }

  for (const selector of ['.problem-header', '.data-input-bar', '.solution-tabs', '.workspace', '.playback-footer']) {
    for (const match of block(selector).matchAll(/(?:padding|gap)(?:-[\w-]+)?:\s*(\d+)px/g)) {
      if (Number(match[1]) > 16) {
        fail(`${selector} 出现 ${match[1]}px 的 padding/gap：外层间距不得超过 16px`);
      }
    }
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
const placeholderPattern = /\{(题号|中文标题|英文标题|slug|github_repo|github_username)\}/;
for (const rel of ['App.tsx', 'index.html', 'package.json', 'vite.config.ts', 'README.md', 'README.zh-CN.md']) {
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

// 10. README 双语且默认英文（AC-018）
const readmeEnFile = path.join(root, 'README.md');
const readmeZhFile = path.join(root, 'README.zh-CN.md');
const cjkPattern = /[㐀-䶿一-鿿豈-﫿]/;
if (!fs.existsSync(readmeEnFile)) {
  fail('缺少 README.md（默认英文 README，AC-018）');
}
if (!fs.existsSync(readmeZhFile)) {
  fail('缺少 README.zh-CN.md（简体中文 README，AC-018）');
}
if (fs.existsSync(readmeEnFile) && fs.existsSync(readmeZhFile)) {
  const en = read('README.md');
  const zh = read('README.zh-CN.md');
  if (!en.includes('README.zh-CN.md')) {
    fail('README.md 缺少切换到简体中文的链接（README.zh-CN.md）');
  }
  if (!zh.includes('README.md')) {
    fail('README.zh-CN.md 缺少切换回 English 的链接（README.md）');
  }
  // 语言切换行允许出现“简体中文”字样，其余正文必须为英文
  const enBody = en.replace(/^.*README\.zh-CN\.md.*$/gm, '');
  if (cjkPattern.test(enBody)) {
    fail('README.md 必须为英文（默认展示），除语言切换链接外不得包含中文字符；中文内容请写入 README.zh-CN.md');
  }
  if (!cjkPattern.test(zh)) {
    fail('README.zh-CN.md 必须为简体中文内容');
  }
  const sectionCount = (text) => [...text.matchAll(/^##\s+/gm)].length;
  if (sectionCount(en) !== sectionCount(zh)) {
    fail('README.md 与 README.zh-CN.md 的二级标题数量不一致，双语结构需保持同步');
  }
  for (const [name, text] of [['README.md', en], ['README.zh-CN.md', zh]]) {
    if (!text.includes('leetcode.cn/problems/')) {
      fail(`${name} 缺少题目链接`);
    }
    if (!text.includes('github.io/')) {
      fail(`${name} 缺少 Pages 在线演示链接`);
    }
  }
}

// 11. 仓库描述与 Topics 校验脚本（AC-024）
if (!fs.existsSync(path.join(root, 'scripts', 'check-repo-metadata.mjs'))) {
  fail('缺少 scripts/check-repo-metadata.mjs（GitHub 仓库描述与 Topics 校验，AC-024）');
}

if (!ok) {
  process.exit(1);
}

console.log('[PASS] quality gates check passed');
