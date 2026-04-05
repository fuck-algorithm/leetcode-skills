const path = require("path");
const {
  getManifestSkills,
  installSkills,
  loadManifest,
  validateSkillRepository
} = require("./scripts/skill-repo");

function install(options = {}) {
  return installSkills({
    packageRoot: path.resolve(__dirname),
    targetProject: options.targetProject || process.cwd(),
    selectedSkillIds: options.selectedSkillIds || [],
    dryRun: Boolean(options.dryRun),
    logger: options.logger || console
  });
}

function list() {
  return getManifestSkills(path.resolve(__dirname));
}

function manifest() {
  return loadManifest(path.resolve(__dirname)).manifest;
}

function validate() {
  return validateSkillRepository(path.resolve(__dirname));
}

module.exports = {
  install,
  list,
  manifest,
  validate
};
