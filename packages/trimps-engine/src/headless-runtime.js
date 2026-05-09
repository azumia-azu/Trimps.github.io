const { LEGACY_SCRIPT_ORDER } = require('./legacy-loader');
const { createTrimpsRuntime } = require('./runtime');

module.exports = {
  LEGACY_SCRIPT_ORDER,
  createTrimpsRuntime,
};
