#!/usr/bin/env node

const path = require("path");
const { validateSkillRepository } = require("./skill-repo");

function main() {
  const packageRoot = path.resolve(__dirname, "..");
  const result = validateSkillRepository(packageRoot);

  console.log("Skill repository validation");
  console.log("Manifest fallback: " + (result.fromFallback ? "yes" : "no"));
  console.log("Registered skills: " + (result.manifest.skills || []).length);

  if (result.warnings.length > 0) {
    console.log("");
    console.log("Warnings:");
    for (const warning of result.warnings) {
      console.log("  - " + warning);
    }
  }

  if (result.errors.length > 0) {
    console.log("");
    console.log("Errors:");
    for (const error of result.errors) {
      console.log("  - " + error);
    }
    process.exit(1);
  }

  console.log("");
  console.log("✅ Skill repository structure is valid.");
}

main();
