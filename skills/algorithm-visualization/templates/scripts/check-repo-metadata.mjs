#!/usr/bin/env node
/**
 * 校验 GitHub 仓库描述与 Topics（AC-024）。
 *
 * 用法：
 *   node scripts/check-repo-metadata.mjs                 # 从 git remote origin 解析仓库
 *   node scripts/check-repo-metadata.mjs owner/repo      # 显式指定仓库
 *
 * 依赖已登录的 gh CLI（本地 `gh auth login`，CI 用 GH_TOKEN）。
 * 仓库描述必须为英文且非空；Topics 至少 6 个，并包含动画演示仓库的必需标签。
 */

import { execFileSync } from 'node:child_process';

const REQUIRED_TOPICS = ['leetcode', 'algorithm', 'visualization', 'typescript', 'react', 'd3'];
const MIN_TOPICS = REQUIRED_TOPICS.length;
const MIN_DESCRIPTION_LENGTH = 20;
const CJK_PATTERN = /[㐀-䶿一-鿿豈-﫿]/;

let ok = true;

function fail(message) {
  console.error(`[FAIL] ${message}`);
  ok = false;
}

function normalizeRepo(value) {
  return String(value)
    .trim()
    .replace(/^https:\/\/github\.com\//, '')
    .replace(/^git@github\.com:/, '')
    .replace(/\.git$/, '')
    .replace(/\/$/, '');
}

function resolveRepo(arg) {
  if (arg) {
    return normalizeRepo(arg);
  }
  if (process.env.GH_REPO) {
    return normalizeRepo(process.env.GH_REPO);
  }
  try {
    const remote = execFileSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim();
    const match = remote.match(/github\.com[:/]+([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (match) {
      return `${match[1]}/${match[2]}`;
    }
  } catch {
    // 无 git remote 时继续走失败提示
  }
  return '';
}

function readMetadata(repo) {
  try {
    const raw = execFileSync('gh', ['repo', 'view', repo, '--json', 'description,repositoryTopics'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return JSON.parse(raw);
  } catch (error) {
    const detail = (error.stderr || '').toString().trim() || error.message;
    fail(
      `无法读取 ${repo} 的仓库元数据。请确认仓库已创建、gh CLI 已登录（或设置 GH_TOKEN），然后重试。\n      ${detail}`
    );
    return null;
  }
}

function validateDescription(description) {
  if (typeof description !== 'string' || description.trim() === '') {
    fail('GitHub 仓库描述为空：必须填写英文描述（AC-024）');
    return;
  }
  const trimmed = description.trim();
  if (CJK_PATTERN.test(trimmed)) {
    fail(`仓库描述必须为英文，当前包含中文字符：${trimmed}`);
  }
  if (trimmed.length < MIN_DESCRIPTION_LENGTH) {
    fail(`仓库描述过短（${trimmed.length} 字符）：至少 ${MIN_DESCRIPTION_LENGTH} 字符，说明题目与演示定位`);
  }
}

function validateTopics(topics) {
  const names = new Set(
    (Array.isArray(topics) ? topics : [])
      .map((topic) => (typeof topic === 'string' ? topic : topic?.name))
      .filter(Boolean)
      .map((name) => String(name).toLowerCase())
  );

  if (names.size < MIN_TOPICS) {
    fail(`GitHub Topics 不足：当前 ${names.size} 个，至少需要 ${MIN_TOPICS} 个（AC-024）`);
  }
  const missing = REQUIRED_TOPICS.filter((topic) => !names.has(topic));
  if (missing.length > 0) {
    fail(`GitHub Topics 缺少必需标签：${missing.join(', ')}`);
  }
  return [...names].sort();
}

function main() {
  const repo = resolveRepo(process.argv[2]);
  if (!repo || !/^[^/\s]+\/[^/\s]+$/.test(repo)) {
    fail('无法确定 GitHub 仓库，请传入 owner/repo，或配置 git remote origin / GH_REPO');
    process.exit(1);
  }

  const metadata = readMetadata(repo);
  if (!metadata) {
    process.exit(1);
  }

  validateDescription(metadata.description);
  const topics = validateTopics(metadata.repositoryTopics);

  console.log(`[repo] ${repo}`);
  console.log(`[repo] description: ${metadata.description ?? ''}`);
  console.log(`[repo] topics: ${topics.join(', ') || '(none)'}`);

  if (!ok) {
    process.exit(1);
  }
  console.log('[PASS] GitHub 仓库描述与 Topics 合规');
}

main();
