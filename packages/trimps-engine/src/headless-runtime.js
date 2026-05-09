const { LEGACY_SCRIPT_ORDER } = require('./legacy-loader');
const { cleanExportString, createTrimpsRuntime } = require('./runtime');
const { createManualClockPort, createSystemClockPort } = require('./ports/clock-port');
const { createFileStoragePort, createMemoryStoragePort } = require('./ports/storage-port');
const { createHeadlessPlatformPort } = require('./ports/platform-port');

module.exports = {
  LEGACY_SCRIPT_ORDER,
  cleanExportString,
  createFileStoragePort,
  createHeadlessPlatformPort,
  createManualClockPort,
  createMemoryStoragePort,
  createSystemClockPort,
  createTrimpsRuntime,
};
