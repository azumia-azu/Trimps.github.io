const { createSystemClockPort } = require('./clock-port');
const { createMemoryStoragePort } = require('./storage-port');
const { createBrowserContext } = require('../platform');

function createHeadlessPlatformPort(options = {}) {
  const clockPort = options.clockPort || createSystemClockPort();
  const storagePort = options.storagePort || createMemoryStoragePort();

  return {
    clockPort,
    storagePort,
    createContext(rootDir) {
      return createBrowserContext(rootDir, { clockPort, storagePort });
    },
  };
}

module.exports = {
  createHeadlessPlatformPort,
};
