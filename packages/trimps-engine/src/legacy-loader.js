const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createHeadlessPlatformPort } = require('./ports/platform-port');

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
  const platformPort = options.platformPort || createHeadlessPlatformPort(options);
  const context = platformPort.createContext(rootDir);
  loadLegacyScripts(context, rootDir);
  if (typeof context.__trimpsClearBrowserTimers === 'function') context.__trimpsClearBrowserTimers();

  if (!context.game || !context.game.global) {
    throw new Error('Legacy Trimps runtime did not create a game object.');
  }

  return { context, platformPort, rootDir };
}

module.exports = {
  LEGACY_SCRIPT_ORDER,
  createLegacyRuntimeContext,
  loadLegacyScripts,
};
