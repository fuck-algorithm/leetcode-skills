const fs = require("fs");
const path = require("path");

const MANIFEST_FILE_NAME = "skills-manifest.json";
const STATE_FILE_NAME = ".skills-repo-state.json";
const REQUIRED_ENTRY_FILE = "SKILL.md";
const DEFAULT_INSTALL_PATH = ".windsurf/skills";
const SKILL_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function isSafeRelativePath(value) {
  if (!value || typeof value !== "string") {
    return false;
  }
  if (path.isAbsolute(value)) {
    return false;
  }
  const normalized = value.replace(/\\/g, "/");
  if (normalized.startsWith("../") || normalized.includes("/../") || normalized === "..") {
    return false;
  }
  return true;
}

function readJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function listLegacySkills(packageRoot) {
  const skillsRoot = path.join(packageRoot, "skills");
  if (!fs.existsSync(skillsRoot)) {
    return [];
  }

  const entries = fs.readdirSync(skillsRoot, { withFileTypes: true });
  const skills = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const skillDir = path.join(skillsRoot, entry.name);
    const skillEntry = path.join(skillDir, REQUIRED_ENTRY_FILE);
    if (!fs.existsSync(skillEntry)) {
      continue;
    }

    skills.push({
      id: entry.name,
      path: toPosixPath(path.relative(packageRoot, skillDir)),
      entry: REQUIRED_ENTRY_FILE,
      description: ""
    });
  }

  skills.sort((a, b) => a.id.localeCompare(b.id));
  return skills;
}

function loadManifest(packageRoot) {
  const manifestPath = path.join(packageRoot, MANIFEST_FILE_NAME);

  if (!fs.existsSync(manifestPath)) {
    return {
      manifestPath,
      fromFallback: true,
      manifest: {
        version: 1,
        defaultInstallPath: DEFAULT_INSTALL_PATH,
        skills: listLegacySkills(packageRoot)
      }
    };
  }

  return {
    manifestPath,
    fromFallback: false,
    manifest: readJsonFile(manifestPath)
  };
}

function validateManifest(manifest, packageRoot) {
  const errors = [];
  const warnings = [];

  if (!manifest || typeof manifest !== "object") {
    errors.push("skills-manifest.json 必须是一个 JSON 对象");
    return { errors, warnings };
  }

  if (!Array.isArray(manifest.skills)) {
    errors.push("skills-manifest.json 中 skills 字段必须是数组");
    return { errors, warnings };
  }

  if (!manifest.defaultInstallPath || typeof manifest.defaultInstallPath !== "string") {
    warnings.push("defaultInstallPath 缺失，已使用默认值: " + DEFAULT_INSTALL_PATH);
  } else if (!isSafeRelativePath(manifest.defaultInstallPath)) {
    errors.push("defaultInstallPath 非法，必须是仓库内安全相对路径: " + manifest.defaultInstallPath);
  }

  const idSet = new Set();

  for (const skill of manifest.skills) {
    if (!skill || typeof skill !== "object") {
      errors.push("skills 中每一项都必须是对象");
      continue;
    }

    const id = skill.id;
    const skillPath = skill.path;
    const entry = skill.entry;

    if (!id || typeof id !== "string") {
      errors.push("每个 skill 都必须有字符串类型的 id");
      continue;
    }

    if (!SKILL_ID_PATTERN.test(id)) {
      errors.push("skill id 非法: " + id + "，只允许小写字母、数字、短横线");
    }

    if (idSet.has(id)) {
      errors.push("skills-manifest.json 中发现重复 skill id: " + id);
    } else {
      idSet.add(id);
    }

    if (!skillPath || typeof skillPath !== "string") {
      errors.push("skill " + id + " 缺少 path");
      continue;
    }

    if (!isSafeRelativePath(skillPath)) {
      errors.push("skill " + id + " 的 path 非法: " + skillPath);
      continue;
    }

    const sourceDir = path.resolve(packageRoot, skillPath);
    if (!sourceDir.startsWith(path.resolve(packageRoot) + path.sep)) {
      errors.push("skill " + id + " 的 path 超出仓库范围: " + skillPath);
      continue;
    }

    if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
      errors.push("skill " + id + " 的目录不存在: " + skillPath);
      continue;
    }

    const entryFile = entry || REQUIRED_ENTRY_FILE;
    if (!isSafeRelativePath(entryFile)) {
      errors.push("skill " + id + " 的 entry 非法: " + entryFile);
      continue;
    }

    const entryPath = path.join(sourceDir, entryFile);
    if (!fs.existsSync(entryPath)) {
      errors.push(
        "skill " + id + " 缺少入口文件: " + toPosixPath(path.relative(packageRoot, entryPath))
      );
    }
  }

  return { errors, warnings };
}

function collectFilesRecursive(rootDir, relativeDir = "") {
  const currentDir = path.join(rootDir, relativeDir);
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  const files = [];

  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const entryRelative = relativeDir ? path.join(relativeDir, entry.name) : entry.name;
    const absolutePath = path.join(rootDir, entryRelative);

    if (entry.isDirectory()) {
      files.push(...collectFilesRecursive(rootDir, entryRelative));
      continue;
    }

    if (entry.isFile()) {
      files.push(toPosixPath(entryRelative));
      continue;
    }

    if (entry.isSymbolicLink()) {
      files.push(toPosixPath(entryRelative));
      continue;
    }

    const stats = fs.lstatSync(absolutePath);
    if (stats.isFile()) {
      files.push(toPosixPath(entryRelative));
    }
  }

  return files;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removeEmptyDirsUpward(startDir, stopDir) {
  let current = startDir;
  const stop = path.resolve(stopDir);

  while (current && path.resolve(current).startsWith(stop) && path.resolve(current) !== stop) {
    if (!fs.existsSync(current)) {
      current = path.dirname(current);
      continue;
    }

    const entries = fs.readdirSync(current);
    if (entries.length > 0) {
      break;
    }

    fs.rmdirSync(current);
    current = path.dirname(current);
  }
}

function removeManagedFiles(skillTargetDir, managedFiles, options = {}) {
  const dryRun = Boolean(options.dryRun);
  let removed = 0;

  for (const file of managedFiles) {
    if (!isSafeRelativePath(file)) {
      continue;
    }

    const targetPath = path.join(skillTargetDir, file);
    const targetResolved = path.resolve(targetPath);
    const baseResolved = path.resolve(skillTargetDir);

    if (!targetResolved.startsWith(baseResolved + path.sep)) {
      continue;
    }

    if (fs.existsSync(targetPath)) {
      removed += 1;
      if (!dryRun) {
        fs.rmSync(targetPath, { recursive: false, force: true });
      }
      removeEmptyDirsUpward(path.dirname(targetPath), skillTargetDir);
    }
  }

  if (!dryRun && fs.existsSync(skillTargetDir)) {
    const remain = fs.readdirSync(skillTargetDir);
    if (remain.length === 0) {
      fs.rmdirSync(skillTargetDir);
    }
  }

  return removed;
}

function readInstallState(targetSkillsDir) {
  const statePath = path.join(targetSkillsDir, STATE_FILE_NAME);
  if (!fs.existsSync(statePath)) {
    return { version: 1, skills: {} };
  }

  try {
    const parsed = readJsonFile(statePath);
    if (!parsed || typeof parsed !== "object") {
      return { version: 1, skills: {} };
    }
    if (!parsed.skills || typeof parsed.skills !== "object") {
      parsed.skills = {};
    }
    return parsed;
  } catch (error) {
    return { version: 1, skills: {} };
  }
}

function writeInstallState(targetSkillsDir, state) {
  ensureDir(targetSkillsDir);
  const statePath = path.join(targetSkillsDir, STATE_FILE_NAME);
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n", "utf8");
}

function installSkills(options) {
  const packageRoot = options.packageRoot;
  const targetProject = options.targetProject;
  const selectedSkillIds = options.selectedSkillIds || [];
  const dryRun = Boolean(options.dryRun);
  const logger = options.logger || console;

  const loaded = loadManifest(packageRoot);
  const manifest = loaded.manifest;
  const fromFallback = loaded.fromFallback;
  const validation = validateManifest(manifest, packageRoot);

  if (validation.errors.length > 0) {
    const lines = ["技能仓库结构校验失败："];
    for (const message of validation.errors) {
      lines.push("- " + message);
    }
    throw new Error(lines.join("\n"));
  }

  const selectedSet = new Set(selectedSkillIds.filter(Boolean));
  if (selectedSet.size > 0) {
    const known = new Set(manifest.skills.map((skill) => skill.id));
    const unknown = [...selectedSet].filter((id) => !known.has(id));
    if (unknown.length > 0) {
      throw new Error("不存在的 skill: " + unknown.join(", "));
    }
  }

  const installPath = manifest.defaultInstallPath || DEFAULT_INSTALL_PATH;
  const targetSkillsDir = path.resolve(targetProject, installPath);

  if (!dryRun) {
    ensureDir(targetSkillsDir);
  }

  const state = readInstallState(targetSkillsDir);
  const nextState = {
    version: 1,
    packageName: "@fuck-algorithm/skills",
    installedAt: new Date().toISOString(),
    skills: { ...state.skills }
  };

  const summary = {
    targetSkillsDir,
    usedManifestFallback: fromFallback,
    warnings: validation.warnings,
    installedSkills: [],
    retiredSkills: [],
    copiedFiles: 0,
    removedFiles: 0
  };

  const manifestSkillMap = new Map(manifest.skills.map((skill) => [skill.id, skill]));
  const skillsToInstall = selectedSet.size === 0
    ? manifest.skills
    : [...selectedSet].map((id) => manifestSkillMap.get(id));

  if (selectedSet.size === 0) {
    for (const oldSkillId of Object.keys(state.skills || {})) {
      if (manifestSkillMap.has(oldSkillId)) {
        continue;
      }

      const oldState = state.skills[oldSkillId] || {};
      const targetSkillDir = path.join(targetSkillsDir, oldSkillId);
      const oldFiles = Array.isArray(oldState.files) ? oldState.files : [];
      const removed = removeManagedFiles(targetSkillDir, oldFiles, { dryRun });
      summary.removedFiles += removed;
      summary.retiredSkills.push(oldSkillId);
      delete nextState.skills[oldSkillId];
    }
  }

  for (const skill of skillsToInstall) {
    const sourceDir = path.resolve(packageRoot, skill.path);
    const targetSkillDir = path.join(targetSkillsDir, skill.id);
    const sourceFiles = collectFilesRecursive(sourceDir);
    const prevFiles = Array.isArray(state.skills?.[skill.id]?.files) ? state.skills[skill.id].files : [];
    const sourceSet = new Set(sourceFiles);

    let copied = 0;
    let removed = 0;

    if (!dryRun) {
      ensureDir(targetSkillDir);
    }

    for (const relativeFile of sourceFiles) {
      const sourceFilePath = path.join(sourceDir, relativeFile);
      const targetFilePath = path.join(targetSkillDir, relativeFile);

      copied += 1;
      if (!dryRun) {
        ensureDir(path.dirname(targetFilePath));
        fs.copyFileSync(sourceFilePath, targetFilePath);
      }
    }

    const staleFiles = prevFiles.filter((oldFile) => !sourceSet.has(oldFile));
    removed += removeManagedFiles(targetSkillDir, staleFiles, { dryRun });

    summary.copiedFiles += copied;
    summary.removedFiles += removed;
    summary.installedSkills.push({
      id: skill.id,
      copiedFiles: copied,
      removedFiles: removed,
      sourcePath: skill.path
    });

    nextState.skills[skill.id] = {
      sourcePath: skill.path,
      entry: skill.entry || REQUIRED_ENTRY_FILE,
      files: sourceFiles,
      installedAt: new Date().toISOString()
    };
  }

  if (!dryRun) {
    writeInstallState(targetSkillsDir, nextState);
  }

  if (logger && typeof logger.log === "function") {
    logger.log("📁 Target skills directory: " + targetSkillsDir);
  }

  return summary;
}

function getManifestSkills(packageRoot) {
  const loaded = loadManifest(packageRoot);
  return loaded.manifest.skills || [];
}

function validateSkillRepository(packageRoot) {
  const loaded = loadManifest(packageRoot);
  const manifest = loaded.manifest;
  const fromFallback = loaded.fromFallback;
  const manifestPath = loaded.manifestPath;
  const validation = validateManifest(manifest, packageRoot);

  const legacySkills = listLegacySkills(packageRoot);
  const manifestPaths = new Set((manifest.skills || []).map((skill) => skill.path));
  for (const skill of legacySkills) {
    if (!manifestPaths.has(skill.path)) {
      validation.errors.push(
        "目录 " + skill.path + " 存在 SKILL.md，但未在 " + path.basename(manifestPath) + " 中注册"
      );
    }
  }

  return {
    errors: validation.errors,
    warnings: validation.warnings,
    manifest,
    fromFallback
  };
}

module.exports = {
  DEFAULT_INSTALL_PATH,
  MANIFEST_FILE_NAME,
  STATE_FILE_NAME,
  getManifestSkills,
  installSkills,
  loadManifest,
  validateManifest,
  validateSkillRepository
};
