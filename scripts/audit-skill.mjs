#!/usr/bin/env node
/**
 * 仓库级自检：插件打包、Skill 文档、模板基线与验收口径的交叉一致性。
 *
 * 与 scripts/validate-skills.js（结构校验）互补：
 * - validate-skills.js 检查 manifest/目录骨架
 * - audit-skill.mjs 检查“文档承诺”与“模板实际文件”是否对得上
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILL_ID = "algorithm-visualization";
const SKILL_DIR = path.join(ROOT, "skills", SKILL_ID);
const TEMPLATE_DIR = path.join(SKILL_DIR, "templates");

const errors = [];
const warnings = [];

function rel(file) {
  return path.relative(ROOT, file) || ".";
}

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function exists(file) {
  return fs.existsSync(file);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function readJson(file) {
  try {
    return JSON.parse(read(file));
  } catch (error) {
    fail(`${rel(file)} 不是合法 JSON：${error.message}`);
    return null;
  }
}

function requireFile(file, label = rel(file)) {
  if (!exists(file)) {
    fail(`缺少文件：${label}`);
    return false;
  }
  return true;
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const result = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!kv) continue;
    let value = kv[2].trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
        .filter(Boolean);
    } else {
      value = value.replace(/^['"]|['"]$/g, "");
    }
    result[kv[1]] = value;
  }
  return result;
}

function walkFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 1. 插件与 marketplace 清单
// ---------------------------------------------------------------------------
const pluginFile = path.join(ROOT, ".claude-plugin", "plugin.json");
const marketplaceFile = path.join(ROOT, ".claude-plugin", "marketplace.json");
const plugin = requireFile(pluginFile) ? readJson(pluginFile) : null;
const marketplace = requireFile(marketplaceFile) ? readJson(marketplaceFile) : null;

if (plugin) {
  if (plugin.name !== "leetcode-skills") fail(`plugin.json name 应为 leetcode-skills，实际 ${plugin.name}`);
  if (typeof plugin.repository !== "string" || !plugin.repository) {
    fail("plugin.json repository 必须是字符串 URL（claude plugin validate 要求）");
  }
  if (!plugin.version) fail("plugin.json 缺少 version");
  if (!plugin.description) fail("plugin.json 缺少 description");
}

const rootPackageFile = path.join(ROOT, "package.json");
const rootPackage = exists(rootPackageFile) ? readJson(rootPackageFile) : null;
if (rootPackage && plugin && rootPackage.version !== plugin.version) {
  fail(`package.json 版本(${rootPackage.version}) 与 plugin.json(${plugin.version}) 不一致`);
}

if (marketplace && plugin) {
  const entry = (marketplace.plugins || []).find((item) => item.name === plugin.name);
  if (!entry) {
    fail(`marketplace.json 未注册插件 ${plugin.name}`);
  } else {
    if (entry.version !== plugin.version) {
      fail(`marketplace.json 版本(${entry.version}) 与 plugin.json(${plugin.version}) 不一致`);
    }
    const source = typeof entry.source === "string" ? entry.source : entry.source?.source;
    if (!source || !exists(path.resolve(ROOT, source))) {
      fail(`marketplace.json source 无法解析：${JSON.stringify(entry.source)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 2. skills-manifest 与 SKILL.md 前置元数据
// ---------------------------------------------------------------------------
const manifestFile = path.join(ROOT, "skills-manifest.json");
const manifest = requireFile(manifestFile) ? readJson(manifestFile) : null;
const skillMdFile = path.join(SKILL_DIR, "SKILL.md");
const skillMd = requireFile(skillMdFile) ? read(skillMdFile) : "";
const frontmatter = skillMd ? parseFrontmatter(skillMd) : null;

if (skillMd && !frontmatter) fail("SKILL.md 缺少 YAML frontmatter");
if (frontmatter) {
  if (frontmatter.name !== SKILL_ID) fail(`SKILL.md name 应为 ${SKILL_ID}，实际 ${frontmatter.name}`);
  if (!frontmatter.description || frontmatter.description.length < 30) {
    fail("SKILL.md description 过短，需说明触发场景");
  }
  if (frontmatter["allowed-tools"] && !Array.isArray(frontmatter["allowed-tools"])) {
    fail("SKILL.md allowed-tools 应为数组");
  }
}

if (manifest) {
  const entry = (manifest.skills || []).find((item) => item.id === SKILL_ID);
  if (!entry) {
    fail(`skills-manifest.json 未注册 ${SKILL_ID}`);
  } else {
    const manifestSkillDir = path.join(ROOT, entry.path || "");
    if (!exists(path.join(manifestSkillDir, entry.entry || "SKILL.md"))) {
      fail(`manifest 中 ${SKILL_ID} 的入口不存在：${entry.path}/${entry.entry}`);
    }
    if (!entry.description) fail(`manifest 中 ${SKILL_ID} 缺少 description`);
  }
}

// ---------------------------------------------------------------------------
// 3. Skill 内部路径引用（插件安装后必须仍然有效）
// ---------------------------------------------------------------------------
const skillDocs = [skillMdFile, ...walkFiles(path.join(SKILL_DIR, "references")).filter((f) => f.endsWith(".md"))]
  .filter(exists)
  .map((file) => ({ file, text: read(file) }));

for (const { file, text } of skillDocs) {
  for (const match of text.matchAll(/\$\{CLAUDE_SKILL_DIR\}\/([A-Za-z0-9_./-]+)/g)) {
    const target = path.join(SKILL_DIR, match[1]);
    if (!exists(target)) fail(`${rel(file)} 引用了不存在的路径：\${CLAUDE_SKILL_DIR}/${match[1]}`);
  }
  for (const match of text.matchAll(/references\/([A-Za-z0-9_.-]+\.md)/g)) {
    const target = path.join(SKILL_DIR, "references", match[1]);
    if (!exists(target)) fail(`${rel(file)} 引用了不存在的参考文档：references/${match[1]}`);
  }
  const staleLines = text.split(/\r?\n/).filter((line) => /skills\/algorithm-visualization\//.test(line));
  for (const line of staleLines) {
    if (/不要|禁止|旧路径|stale/i.test(line)) continue;
    warn(`${rel(file)} 出现仓库相对路径 skills/algorithm-visualization/：${line.trim().slice(0, 80)}`);
  }
}

if (skillMd) {
  if (!skillMd.includes("${CLAUDE_SKILL_DIR}/scripts/fetch-leetcode-problem.py")) {
    fail("SKILL.md 必须通过 ${CLAUDE_SKILL_DIR}/scripts/fetch-leetcode-problem.py 调用抓取脚本");
  }
  if (!skillMd.includes("${CLAUDE_SKILL_DIR}/scripts/scaffold-project.mjs")) {
    fail("SKILL.md 必须通过 ${CLAUDE_SKILL_DIR}/scripts/scaffold-project.mjs 生成项目");
  }
  if (!/AC-001\s*[~-]\s*AC-023/.test(skillMd) || !skillMd.includes("AC-023")) {
    fail("SKILL.md 验收范围必须覆盖 AC-001 ~ AC-023");
  }
  if (!skillMd.includes("references/09-layout-visual-design.md")) {
    fail("SKILL.md 必须引用 references/09-layout-visual-design.md（空间预算与画布优先）");
  }
  if (!skillMd.includes("画布优先")) {
    fail("SKILL.md 必须写明画布优先的布局约束");
  }
}

// ---------------------------------------------------------------------------
// 4. 模板必备文件与门禁脚本
// ---------------------------------------------------------------------------
const requiredTemplateFiles = [
  "package.json",
  "index.html",
  "vite.config.ts",
  "vitest.config.ts",
  "playwright.config.ts",
  "eslint.config.mjs",
  "tsconfig.json",
  ".gitignore",
  ".github/workflows/deploy.yml",
  "public/assets/qrcode-community.png",
  "scripts/check-quality-gates.mjs",
  "tests/setup.ts",
  "tests/e2e/acceptance.spec.ts",
  "tests/unit/features/solutions/solutionRegistry.test.ts",
  "tests/unit/services/storage/indexedDbStore.test.ts",
  "tests/unit/components/code/CodePanel.test.tsx",
  "tests/unit/features/animation/motion.test.ts",
  "tests/unit/features/animation/renderFrame.test.ts",
  "tests/unit/features/animation/structures.test.ts",
  "tests/unit/features/animation/exitCleanup.test.ts",
  "features/animation/motion.ts",
  "features/animation/structures.ts",
  "features/animation/render/renderFrame.ts",
  "features/animation/render/common.ts",
  "features/animation/render/nodes.ts",
  "features/animation/render/edges.ts",
  "features/animation/render/arrows.ts",
  "features/animation/render/labels.ts",
  "features/animation/render/containers.ts",
  "docs/ANIMATION_SPEC.md",
  "docs/QUALITY_GATE.md",
  "docs/TEST_PLAN.md",
  "docs/ACCEPTANCE_CHECKLIST.md",
  "docs/ACCEPTANCE_REPORT_TEMPLATE.md",
  "docs/PROGRESSIVE_DELIVERY.md",
  "docs/PLAYWRIGHT_CASES.md",
];

for (const file of requiredTemplateFiles) {
  requireFile(path.join(TEMPLATE_DIR, file), `templates/${file}`);
}

for (const file of walkFiles(path.join(TEMPLATE_DIR, "tests")).filter((item) => /\.test\.(ts|tsx)$/.test(item))) {
  const text = read(file).trim();
  if (!text) {
    fail(`单元测试为空文件：${rel(file)}`);
  } else if (!/\b(?:describe|it|test)\s*\(/.test(text)) {
    fail(`单元测试不包含 describe/it/test：${rel(file)}`);
  }
}

const qrFile = path.join(TEMPLATE_DIR, "public/assets/qrcode-community.png");
if (exists(qrFile)) {
  const size = fs.statSync(qrFile).size;
  const header = fs.readFileSync(qrFile).subarray(0, 8);
  if (size < 1024) fail("二维码文件过小，可能不是有效图片");
  if (header.toString("hex") !== "89504e470d0a1a0a") fail("public/assets/qrcode-community.png 不是 PNG 文件");
}

const templatePkgFile = path.join(TEMPLATE_DIR, "package.json");
const templatePkg = exists(templatePkgFile) ? readJson(templatePkgFile) : null;
if (templatePkg) {
  const scripts = templatePkg.scripts || {};
  for (const name of ["qa:guard", "qa:full", "lint", "type-check", "build", "test:unit", "test:coverage", "test:e2e", "test:e2e:install"]) {
    if (!scripts[name]) fail(`templates/package.json 缺少脚本 ${name}`);
  }
  const qaFull = scripts["qa:full"] || "";
  for (const part of ["qa:guard", "lint", "type-check", "build", "test:coverage", "test:e2e"]) {
    if (!qaFull.includes(`npm run ${part}`)) fail(`qa:full 未包含 npm run ${part}`);
  }
  if (!(templatePkg.devDependencies || {})["fake-indexeddb"]) {
    fail("templates/package.json 缺少 fake-indexeddb（jsdom 下 IndexedDB 单测依赖）");
  }
}

const vitestConfigFile = path.join(TEMPLATE_DIR, "vitest.config.ts");
if (exists(vitestConfigFile)) {
  const config = read(vitestConfigFile);
  for (const [key, value] of [["lines", "60"], ["functions", "60"], ["branches", "50"]]) {
    if (!new RegExp(`${key}\\s*:\\s*${value}`).test(config)) {
      fail(`vitest.config.ts 中 ${key} 覆盖率阈值应为 ${value}`);
    }
  }
}

const gateFile = path.join(TEMPLATE_DIR, "scripts/check-quality-gates.mjs");
if (exists(gateFile)) {
  const gate = read(gateFile);
  for (const token of [
    "qrcode-community.png",
    ".github/workflows/deploy.yml",
    "AC-022",
    "AC-023",
    "test:coverage",
    "validateInput",
    "prefers-reduced-motion",
    "data-container-kind",
    "fadeOutAndRemove",
    "container-box",
    "--header-height",
    "--code-panel-width",
    "空间预算",
  ]) {
    if (!gate.includes(token)) fail(`check-quality-gates.mjs 未检查 ${token}`);
  }
}

const deployFile = path.join(TEMPLATE_DIR, ".github/workflows/deploy.yml");
if (exists(deployFile)) {
  const deploy = read(deployFile);
  for (const token of ["npm run lint", "npm run type-check", "npm run build", "test:coverage", "test:e2e", "VITE_APP_BASE", "actions/deploy-pages"]) {
    if (!deploy.includes(token)) fail(`deploy.yml 缺少：${token}`);
  }
}

// ---------------------------------------------------------------------------
// 5. 脚手架占位符与验收口径
// ---------------------------------------------------------------------------
for (const file of ["scripts/fetch-leetcode-problem.py", "scripts/build-problem-cache.py", "scripts/pack-problem-cache.py", "scripts/problem_cache.py", "scripts/leetcode_text.py", "scripts/test_leetcode_text.py", "scripts/test_problem_cache.py", "scripts/test_pack_problem_cache.py", "scripts/scaffold-project.mjs"]) {
  requireFile(path.join(SKILL_DIR, file), `skills/${SKILL_ID}/${file}`);
}

// 题库缓存必须留在 Release 里。仓库内只允许索引与清单两个 json，
// 否则 marketplace 浅克隆会重新变大，慢网络机器安装再次超时。
const assetDir = path.join(SKILL_DIR, "assets", "leetcode-problems");
const cacheManifestFile = path.join(assetDir, "cache-manifest.json");
const indexFile = path.join(assetDir, "index.json");
if (requireFile(indexFile, "assets/leetcode-problems/index.json")) {
  try {
    const index = JSON.parse(read(indexFile));
    if (!index.byNumber) fail("index.json 缺少 byNumber");
    if (index.bySlug) fail("index.json 不应包含 bySlug（会重新撑大 marketplace 克隆体积）");
    if (fs.statSync(indexFile).size > 512 * 1024) fail("index.json 超过 512KB，随插件分发的索引必须保持精简");
  } catch (error) {
    fail(`index.json 不是合法 JSON：${error.message}`);
  }
}
if (requireFile(cacheManifestFile, "assets/leetcode-problems/cache-manifest.json")) {
  try {
    const manifest = JSON.parse(read(cacheManifestFile));
    for (const key of ["version", "url", "sha256", "fileCount"]) {
      if (!manifest[key]) fail(`cache-manifest.json 缺少 ${key}`);
    }
    if (manifest.url && !/^https:\/\/github\.com\/.+\/releases\/download\//.test(manifest.url)) {
      fail("cache-manifest.json 的 url 必须指向 GitHub Release 资产");
    }
  } catch (error) {
    fail(`cache-manifest.json 不是合法 JSON：${error.message}`);
  }
}
if (exists(assetDir)) {
  const jsonFiles = fs.readdirSync(assetDir).filter((name) => name.endsWith(".json"));
  if (jsonFiles.length > 2) {
    fail(`assets/leetcode-problems 下不应提交题目缓存（发现 ${jsonFiles.length} 个 json，仅允许 index.json 与 cache-manifest.json）`);
  }
}

const scaffoldFile = path.join(SKILL_DIR, "scripts", "scaffold-project.mjs");
if (requireFile(scaffoldFile)) {
  const scaffold = read(scaffoldFile);
  for (const token of ["{题号}", "{中文标题}", "{slug}", "{github_repo}", "{github_username}"]) {
    if (!scaffold.includes(token)) fail(`scaffold-project.mjs 未处理占位符 ${token}`);
  }
}

const e2eFile = path.join(TEMPLATE_DIR, "tests/e2e/acceptance.spec.ts");
if (exists(e2eFile)) {
  const ids = new Set([...read(e2eFile).matchAll(/test\(\s*['"`](E2E-\d{3})/g)].map((m) => m[1]));
  if (ids.size !== 15) fail(`E2E 用例数应为 15，实际 ${ids.size}`);
  for (let i = 1; i <= 15; i += 1) {
    const id = `E2E-${String(i).padStart(3, "0")}`;
    if (!ids.has(id)) fail(`缺少 E2E 用例 ${id}`);
  }
  for (const banned of ["[1, 2, 3]", "[1,2,3]", "[5, 5, 5]", "[5,5,5]"]) {
    if (read(e2eFile).includes(banned)) fail(`E2E 用例硬编码了模板数据 ${banned}，应保持题目无关`);
  }
}

const matrixFile = path.join(SKILL_DIR, "references/06-playwright-acceptance-matrix.md");
if (exists(matrixFile)) {
  const matrix = read(matrixFile);
  for (let i = 1; i <= 15; i += 1) {
    const id = `E2E-${String(i).padStart(3, "0")}`;
    if (!matrix.includes(id)) fail(`验收矩阵缺少 ${id}`);
  }
  for (let i = 1; i <= 23; i += 1) {
    const id = `AC-${String(i).padStart(3, "0")}`;
    if (!matrix.includes(id)) fail(`验收矩阵缺少 ${id}`);
  }
}

const docsToCheck = [
  "docs/QUALITY_GATE.md",
  "docs/TEST_PLAN.md",
  "docs/PLAYWRIGHT_CASES.md",
  "docs/ACCEPTANCE_REPORT_TEMPLATE.md",
  "docs/ANIMATION_SPEC.md",
];
for (const doc of docsToCheck) {
  const file = path.join(TEMPLATE_DIR, doc);
  if (!exists(file)) continue;
  const text = read(file);
  if (!text.includes("AC-023")) fail(`${doc} 未覆盖 AC-023`);
}
for (const doc of ["docs/QUALITY_GATE.md", "docs/TEST_PLAN.md", "docs/ACCEPTANCE_REPORT_TEMPLATE.md"]) {
  const file = path.join(TEMPLATE_DIR, doc);
  if (exists(file) && !read(file).includes("test:coverage")) fail(`${doc} 未覆盖 test:coverage`);
}

// ---------------------------------------------------------------------------
// 6. README 安装说明
// ---------------------------------------------------------------------------
const readmeFile = path.join(ROOT, "README.md");
const readmeZhFile = path.join(ROOT, "README.zh-CN.md");
if (!exists(readmeZhFile)) {
  fail("缺少 README.zh-CN.md（简体中文 README）");
}
if (exists(readmeFile) && exists(readmeZhFile)) {
  const readmes = [
    ["README.md", read(readmeFile)],
    ["README.zh-CN.md", read(readmeZhFile)]
  ];
  for (const [name, text] of readmes) {
    if (!text.includes("/plugin marketplace add")) {
      fail(`${name} 未说明 /plugin marketplace add 安装方式`);
    }
    if (!text.includes("/plugin install leetcode-skills@leetcode-skills")) {
      fail(`${name} 未说明带 @marketplace 的安装命令`);
    }
    if (/\/plugin install leetcode-skills(?![@\w-])/.test(text)) {
      fail(`${name} 使用了无效的 /plugin install leetcode-skills，应带 @marketplace`);
    }
    if (!text.includes("claude plugin install leetcode-skills@leetcode-skills")) {
      fail(`${name} 缺少可直接复制给 Claude 执行的安装提示词`);
    }
    if (!/Install in one prompt|一键安装提示词/.test(text)) {
      fail(`${name} 缺少顶部一键安装提示词小节`);
    }
  }
  if (!readmes[0][1].includes("README.zh-CN.md")) {
    fail("README.md 缺少切换到简体中文的链接");
  }
  if (!readmes[1][1].includes("README.md")) {
    fail("README.zh-CN.md 缺少切换回 English 的链接");
  }
  const sectionCount = (text) => [...text.matchAll(/^##\s+/gm)].length;
  if (sectionCount(readmes[0][1]) !== sectionCount(readmes[1][1])) {
    fail("README.md 与 README.zh-CN.md 的二级标题数量不一致，内容结构需保持同步");
  }
}

// ---------------------------------------------------------------------------
// 输出
// ---------------------------------------------------------------------------
console.log("Skill audit");
console.log(`Root: ${ROOT}`);
console.log(`Errors: ${errors.length}, Warnings: ${warnings.length}`);

if (warnings.length) {
  console.log("\nWarnings:");
  for (const message of warnings) console.log(`  - ${message}`);
}
if (errors.length) {
  console.log("\nErrors:");
  for (const message of errors) console.log(`  - ${message}`);
  process.exit(1);
}

console.log("\n✅ 插件、Skill 文档、模板与验收口径一致。");
