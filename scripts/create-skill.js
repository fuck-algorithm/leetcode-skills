#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const SKILL_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

function parseArgs(argv) {
  const parsed = {
    skillId: null,
    description: ""
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === "--description" || token === "-d") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("--description 需要传入内容");
      }
      parsed.description = value;
      i += 1;
      continue;
    }

    if (token.startsWith("-")) {
      throw new Error("未知参数: " + token);
    }

    if (!parsed.skillId) {
      parsed.skillId = token;
    } else {
      throw new Error("只允许传入一个 skill id");
    }
  }

  if (!parsed.skillId) {
    throw new Error("用法: node scripts/create-skill.js <skill-id> [-d 描述]");
  }

  return parsed;
}

function ensureManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) {
    const initial = {
      version: 1,
      defaultInstallPath: ".claude/skills",
      skills: []
    };
    fs.writeFileSync(manifestPath, JSON.stringify(initial, null, 2) + "\n", "utf8");
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const packageRoot = path.resolve(__dirname, "..");
  const skillId = args.skillId;

  if (!SKILL_ID_PATTERN.test(skillId)) {
    throw new Error("skill id 非法，仅允许小写字母、数字、短横线");
  }

  const skillDir = path.join(packageRoot, "skills", skillId);
  if (fs.existsSync(skillDir)) {
    throw new Error("skill 目录已存在: " + skillDir);
  }

  fs.mkdirSync(path.join(skillDir, "templates"), { recursive: true });
  fs.mkdirSync(path.join(skillDir, "scripts"), { recursive: true });
  fs.mkdirSync(path.join(skillDir, "references"), { recursive: true });
  fs.mkdirSync(path.join(skillDir, "assets"), { recursive: true });

  const skillDoc = [
    "---",
    "name: " + skillId,
    "description: " + (args.description || "请补充 skill 描述"),
    "---",
    "",
    "# " + skillId,
    "",
    "## 概述",
    "",
    "请描述这个 skill 的目标、输入和输出。",
    "",
    "## 工作流程",
    "",
    "1. 步骤 1",
    "2. 步骤 2",
    "",
    "## 兼容性约定",
    "",
    "- 模板放在 templates/",
    "- 脚本放在 scripts/",
    "- 参考资料放在 references/"
  ].join("\n");

  fs.writeFileSync(path.join(skillDir, "SKILL.md"), skillDoc + "\n", "utf8");

  const manifestPath = path.join(packageRoot, "skills-manifest.json");
  ensureManifest(manifestPath);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  manifest.skills = manifest.skills || [];
  manifest.skills.push({
    id: skillId,
    path: "skills/" + skillId,
    entry: "SKILL.md",
    description: args.description || "",
    tags: []
  });

  manifest.skills.sort((a, b) => a.id.localeCompare(b.id));
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  console.log("✅ skill 已创建: " + skillId);
  console.log("目录: " + skillDir);
  console.log("请继续编辑 SKILL.md 和 templates/ 下的内容。");
}

try {
  main();
} catch (error) {
  console.error("❌ " + error.message);
  process.exit(1);
}
