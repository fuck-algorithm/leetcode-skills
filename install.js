#!/usr/bin/env node

/**
 * Development Installer for Claude Code Plugin
 *
 * This script is for development use only.
 * For production, use: claude --plugin-dir ./leetcode-skills
 * or install from marketplace: /plugin install leetcode-skills
 */

const fs = require('fs');
const path = require('path');

// Determine paths
const packageRoot = path.dirname(__filename);
const skillsSource = path.join(packageRoot, 'skills');

// Get target project path (default to current working directory)
const targetProject = process.argv[2] || process.cwd();
const targetSkillsDir = path.join(targetProject, '.claude', 'skills');

console.log('🚀 Installing Claude Code Plugin (Development Mode)...');
console.log(`   Source: ${skillsSource}`);
console.log(`   Target: ${targetSkillsDir}`);
console.log('');
console.log('💡 For production use:');
console.log('   /plugin install leetcode-skills');
console.log('   or: claude --plugin-dir ./leetcode-skills');
console.log('');

// Check if source exists
if (!fs.existsSync(skillsSource)) {
  console.error(`❌ Error: Skills source directory not found at ${skillsSource}`);
  process.exit(1);
}

// Create target directory if it doesn't exist
if (!fs.existsSync(targetSkillsDir)) {
  fs.mkdirSync(targetSkillsDir, { recursive: true });
}

// Get all skill directories
const skillDirs = fs.readdirSync(skillsSource, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

let installedCount = 0;

// Install each skill
for (const skillName of skillDirs) {
  const sourceSkillDir = path.join(skillsSource, skillName);
  const targetSkillDir = path.join(targetSkillsDir, skillName);
  
  // Check if skill has SKILL.md
  const skillMdPath = path.join(sourceSkillDir, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) {
    console.log(`⚠️  Warning: ${skillName} missing SKILL.md, skipping...`);
    continue;
  }
  
  // Remove existing skill if present
  if (fs.existsSync(targetSkillDir)) {
    console.log(`📝 Updating: ${skillName}`);
    fs.rmSync(targetSkillDir, { recursive: true, force: true });
  } else {
    console.log(`📦 Installing: ${skillName}`);
  }
  
  // Copy skill files recursively
  copyRecursive(sourceSkillDir, targetSkillDir);
  installedCount++;
}

console.log('');
console.log(`✅ Successfully installed ${installedCount} skill(s)!`);
console.log('');
console.log('Installed skills:');
const installedSkills = fs.readdirSync(targetSkillsDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => `   - ${dirent.name}`);
installedSkills.forEach(skill => console.log(skill));
console.log('');
console.log('💡 You can now use these skills in Claude Code by:');
console.log('   1. Using /leetcode-skills:algorithm-visualization');
console.log('   2. Or letting Claude auto-detect based on your request');

/**
 * Recursively copy directory contents
 */
function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      const srcPath = path.join(src, entry);
      const destPath = path.join(dest, entry);
      copyRecursive(srcPath, destPath);
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}
