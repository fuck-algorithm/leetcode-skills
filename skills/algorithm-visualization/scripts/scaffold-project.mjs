#!/usr/bin/env node
/**
 * 从模板生成一个 LeetCode 算法可视化项目骨架。
 *
 * 用法：
 *   node scaffold-project.mjs \
 *     --out ./leetcode-1-two-sum-visualization \
 *     --number 1 \
 *     --title 两数之和 \
 *     --title-en "Two Sum" \
 *     --slug two-sum \
 *     --repo https://github.com/<owner>/leetcode-1-two-sum-visualization
 *
 * 只依赖 Node 内置模块。目标目录必须不存在或为空，避免误覆盖用户文件。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = path.resolve(SCRIPT_DIR, '..', 'templates');

const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.md', '.yml', '.yaml',
  '.html', '.css', '.txt', '.gitignore'
]);

const SKIP_DIRS = new Set(['node_modules', 'dist', 'dist-ssr', 'coverage', 'test-results', 'playwright-report', '.git']);

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) {
      throw new Error(`无法识别的参数: ${key}`);
    }
    const name = key.slice(2);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`参数 ${key} 缺少值`);
    }
    args[name] = value;
    i += 1;
  }
  return args;
}

function fail(message) {
  console.error(`[scaffold] ${message}`);
  process.exit(1);
}

function validate(args) {
  for (const required of ['out', 'number', 'title', 'slug', 'repo']) {
    if (!args[required]) {
      fail(`缺少必需参数 --${required}`);
    }
  }

  if (!/^\d+$/.test(args.number)) {
    fail(`--number 必须是纯数字题号，收到: ${args.number}`);
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(args.slug)) {
    fail(`--slug 只能包含字母、数字和短横线，收到: ${args.slug}`);
  }
  if (!/^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/.test(args.repo)) {
    fail(`--repo 必须是 GitHub 仓库 URL，例如 https://github.com/owner/repo，收到: ${args.repo}`);
  }
}

function deriveOwner(repoUrl) {
  const match = repoUrl.match(/^https:\/\/github\.com\/([^/]+)\/[^/]+\/?$/);
  return match ? match[1] : '';
}

function deriveRepoName(repoUrl) {
  const match = repoUrl.match(/^https:\/\/github\.com\/[^/]+\/([^/]+)\/?$/);
  return match ? match[1] : '';
}

// English README 与仓库描述需要英文标题；未显式提供时按 slug 生成确定性标题
function deriveEnglishTitle(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function ensureEmptyTarget(targetDir) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    return;
  }
  if (!fs.statSync(targetDir).isDirectory()) {
    fail(`目标路径已存在且不是目录: ${targetDir}`);
  }
  if (fs.readdirSync(targetDir).length > 0) {
    fail(`目标目录非空，为避免覆盖现有文件已中止: ${targetDir}\n请换一个空目录，或先手动备份并清理该目录。`);
  }
}

function replacePlaceholders(targetDir, values) {
  let changedFiles = 0;

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) {
          continue;
        }
        walk(absolute);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (!TEXT_EXTENSIONS.has(ext) && entry.name !== '.gitignore') {
        continue;
      }

      const original = fs.readFileSync(absolute, 'utf8');
      let updated = original;
      for (const [placeholder, value] of Object.entries(values)) {
        updated = updated.split(placeholder).join(value);
      }
      if (updated !== original) {
        fs.writeFileSync(absolute, updated, 'utf8');
        changedFiles += 1;
      }
    }
  }

  walk(targetDir);
  return changedFiles;
}

function assertNoUnreplacedPlaceholders(targetDir) {
  const codeFiles = ['App.tsx', 'index.html', 'package.json', 'vite.config.ts', 'README.md', 'README.zh-CN.md'];
  const pattern = /\{(题号|中文标题|英文标题|slug|github_repo|github_username)\}/;
  const leftovers = [];

  for (const relative of codeFiles) {
    const absolute = path.join(targetDir, relative);
    if (!fs.existsSync(absolute)) {
      continue;
    }
    if (pattern.test(fs.readFileSync(absolute, 'utf8'))) {
      leftovers.push(relative);
    }
  }

  if (leftovers.length > 0) {
    fail(`以下文件仍存在未替换的占位符: ${leftovers.join(', ')}`);
  }
}

function main() {
  if (!fs.existsSync(TEMPLATE_DIR)) {
    fail(`模板目录不存在: ${TEMPLATE_DIR}`);
  }

  const args = parseArgs(process.argv.slice(2));
  validate(args);

  const targetDir = path.resolve(args.out);
  ensureEmptyTarget(targetDir);

  fs.cpSync(TEMPLATE_DIR, targetDir, { recursive: true });

  const owner = deriveOwner(args.repo);
  const repoName = deriveRepoName(args.repo);
  const values = {
    '{题号}': args.number,
    '{中文标题}': args.title,
    '{英文标题}': args['title-en'] || deriveEnglishTitle(args.slug),
    '{slug}': args.slug,
    '{github_repo}': args.repo.replace(/\/$/, ''),
    '{github_username}': args.owner || owner
  };

  const changedFiles = replacePlaceholders(targetDir, values);
  assertNoUnreplacedPlaceholders(targetDir);

  const englishTitle = values['{英文标题}'];
  const description = `Interactive step-by-step algorithm visualization for LeetCode ${args.number}. ${englishTitle} — React + TypeScript + D3.js.`;
  console.log(`[scaffold] 已生成项目: ${targetDir}`);
  console.log(`[scaffold] 题目: LeetCode ${args.number}. ${args.title} (${args.slug})`);
  console.log(`[scaffold] English title: ${englishTitle}`);
  console.log(`[scaffold] 替换占位符的文件数: ${changedFiles}`);
  console.log('');
  console.log('下一步:');
  console.log(`  cd ${targetDir}`);
  console.log('  npm install');
  console.log('  # 编辑 features/solutions/solutionRegistry.ts，写入真实解法、代码与分镜');
  console.log('  # 同步更新 tests/e2e/acceptance.spec.ts 中与题目相关的断言');
  console.log('  npm run qa:full');
  console.log('');
  console.log('发布后配置 GitHub 仓库展示（AC-024）:');
  console.log(
    `  gh repo edit ${owner || '<owner>'}/${repoName || '<repo>'} --description "${description}" ` +
      '--add-topic leetcode --add-topic algorithm --add-topic visualization ' +
      '--add-topic typescript --add-topic react --add-topic d3'
  );
  console.log('  npm run qa:repo');
}

main();
