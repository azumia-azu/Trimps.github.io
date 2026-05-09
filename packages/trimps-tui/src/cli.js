#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createTrimpsRuntime } = require('../../trimps-engine/src/runtime');
const { createOpenTuiRenderer } = require('./opentui-renderer');

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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runDashboard(options) {
  validateOptions(options);

  const runtime = createTrimpsRuntime({ rootDir: path.resolve(__dirname, '../../..') });
  if (options.savePath) {
    const saveString = fs.readFileSync(path.resolve(options.savePath), 'utf8');
    runtime.loadExport(saveString);
  }

  const renderer = await createOpenTuiRenderer();
  const deltaMs = options.seconds * 1000;

  try {
    if (options.frames === 0) {
      runtime.tick(deltaMs);
      await renderer.update(runtime.snapshot());
      while (true) {
        if (options.intervalMs > 0) await delay(options.intervalMs);
        runtime.tick(options.intervalMs);
        await renderer.update(runtime.snapshot());
      }
    }

    for (let frame = 0; frame < options.frames; frame += 1) {
      runtime.tick(frame === 0 ? deltaMs : options.intervalMs);
      await renderer.update(runtime.snapshot());
      if (options.intervalMs > 0) await delay(options.intervalMs);
    }
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
