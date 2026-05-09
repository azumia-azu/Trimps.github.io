const { LEGACY_SCRIPT_ORDER } = require('./legacy-loader');
const { cleanExportString, createTrimpsRuntime } = require('./runtime');

module.exports = {
  LEGACY_SCRIPT_ORDER,
  cleanExportString,
  createTrimpsRuntime,
};
