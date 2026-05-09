const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createBrowserContext } = require('./platform');

const LEGACY_SCRIPT_ORDER = [
  'Playfab/PlayFabSDK/PlayFabClientApi.js',
  'lz-string.js',
  'decimal.min.js',
  'config.js',
  'updates.js',
  'playerSpire.js',
  'objects.js',
  'main.js',
];

function loadLegacyScripts(context, rootDir) {
  for (const relativePath of LEGACY_SCRIPT_ORDER) {
    const scriptPath = path.join(rootDir, relativePath);
    const source = fs.readFileSync(scriptPath, 'utf8');
    const script = new vm.Script(source, { filename: scriptPath });
    script.runInContext(context);
  }
}

function createLegacyRuntimeContext(options = {}) {
  const rootDir = options.rootDir || path.resolve(__dirname, '../../..');
  const context = createBrowserContext(rootDir);
  loadLegacyScripts(context, rootDir);

  if (!context.game || !context.game.global) {
    throw new Error('Legacy Trimps runtime did not create a game object.');
  }

  return { context, rootDir };
}

module.exports = {
  LEGACY_SCRIPT_ORDER,
  createLegacyRuntimeContext,
  loadLegacyScripts,
};
