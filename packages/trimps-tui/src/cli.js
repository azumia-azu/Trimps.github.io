#!/usr/bin/env node

const path = require('path');

function loadEngine() {
  try {
    return require('@trimps/engine');
  } catch (error) {
    if (!error || error.code !== 'MODULE_NOT_FOUND') throw error;
    return require('../../trimps-engine/src/headless-runtime');
  }
}

function usage() {
  return [
    'Usage:',
    '  bun packages/trimps-tui/src/cli.js run [--save <path>] [--seconds <n>] [--interval <ms>] [--frames <n>]',
    '  npm run trimps-tui -- run [--save <path>] [--seconds <n>] [--interval <ms>] [--frames <n>]',
    '',
    'Use --frames 0, the default, to keep the OpenTUI dashboard running until Ctrl+C.',
  ].join('\n');
}

function parseArgs(argv) {
  const [command, ...args] = argv;
  const options = { command, seconds: 0, intervalMs: 1000, frames: 0 };
  if (command === '--help' || command === '-h') options.help = true;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--save') options.savePath = args[++index];
    else if (arg === '--seconds') options.seconds = Number(args[++index]);
    else if (arg === '--interval') options.intervalMs = Number(args[++index]);
    else if (arg === '--frames') options.frames = Number(args[++index]);
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function validateOptions(options) {
  if (!Number.isFinite(options.seconds) || options.seconds < 0) throw new Error('--seconds must be a non-negative number.');
  if (!Number.isSafeInteger(options.intervalMs) || options.intervalMs < 0) throw new Error('--interval must be a non-negative integer.');
  if (!Number.isSafeInteger(options.frames) || options.frames < 0) throw new Error('--frames must be a non-negative integer.');
}

async function runDashboard(options) {
  validateOptions(options);

  const { createFileStoragePort, createSystemClockPort, createTrimpsRuntime, runRuntimeLoop } = loadEngine();
  const { createOpenTuiRenderer } = require('./opentui-renderer');
  const runtime = createTrimpsRuntime({ rootDir: path.resolve(__dirname, '../../..') });
  const fileStorage = createFileStoragePort({ baseDir: process.cwd() });
  if (options.savePath) {
    const saveString = fileStorage.readText(options.savePath);
    runtime.loadExport(saveString);
  }

  const renderer = await createOpenTuiRenderer();
  const deltaMs = options.seconds * 1000;

  try {
    await runRuntimeLoop({
      runtime,
      clockPort: createSystemClockPort(),
      initialDeltaMs: deltaMs,
      intervalMs: options.intervalMs,
      frames: options.frames,
      onSnapshot(snapshot) {
        return renderer.update(snapshot);
      },
    });
  } finally {
    await renderer.close();
  }
}

async function main(argv) {
  const options = parseArgs(argv);
  if (options.help || options.command !== 'run') {
    console.log(usage());
    return options.help ? 0 : 1;
  }

  await runDashboard(options);
  return 0;
}

if (require.main === module) {
  main(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode;
  }).catch((error) => {
    console.error(error && error.stack ? error.stack : String(error));
    process.exitCode = 1;
  });
}

module.exports = {
  main,
  parseArgs,
  runDashboard,
  usage,
};
