const { LEGACY_SCRIPT_ORDER } = require('./legacy-loader');
const { cleanExportString, createTrimpsRuntime } = require('./runtime');
const { createCommandList } = require('./commands');
const { getActionCapabilities } = require('./capabilities');
const { formatClock, formatNumber, formatPercent, formatResource } = require('./formatter');
const { runRuntimeLoop } = require('./runner');
const { createManualClockPort, createSystemClockPort } = require('./ports/clock-port');
const { createFileStoragePort, createMemoryStoragePort } = require('./ports/storage-port');
const { createHeadlessPlatformPort } = require('./ports/platform-port');

module.exports = {
  LEGACY_SCRIPT_ORDER,
  cleanExportString,
  createFileStoragePort,
  createHeadlessPlatformPort,
  createCommandList,
  createManualClockPort,
  createMemoryStoragePort,
  createSystemClockPort,
  createTrimpsRuntime,
  formatClock,
  formatNumber,
  formatPercent,
  formatResource,
  getActionCapabilities,
  runRuntimeLoop,
};
