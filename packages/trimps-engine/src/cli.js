#!/usr/bin/env node

const path = require('path');
const { createTrimpsRuntime } = require('./headless-runtime');
const { createFileStoragePort } = require('./ports/storage-port');

function usage() {
  return [
    'Usage:',
    '  node packages/trimps-engine/src/cli.js run [--save <path>] [--seconds <n>] [--export <path>]',
    '  npm run trimps-headless -- run [--save <path>] [--seconds <n>] [--export <path>]',
  ].join('\n');
}

function parseArgs(argv) {
  const [command, ...args] = argv;
  const options = { command, seconds: 0 };
  if (command === '--help' || command === '-h') options.help = true;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--save') options.savePath = args[++index];
    else if (arg === '--seconds') options.seconds = Number(args[++index]);
    else if (arg === '--export') options.exportPath = args[++index];
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function formatNumber(value) {
  if (value === null || typeof value === 'undefined') return 'n/a';
  if (!Number.isFinite(value)) return String(value);
  if (Math.abs(value) >= 1000000 || (Math.abs(value) > 0 && Math.abs(value) < 0.01)) return value.toExponential(3);
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
}

function formatResource(label, resource) {
  const max = resource.max === null ? '' : ` / ${formatNumber(resource.max)}`;
  return `${label}: ${formatNumber(resource.owned)}${max}`;
}

function formatSnapshot(snapshot) {
  return [
    `Zone: ${snapshot.world}`,
    `Cell: ${snapshot.lastClearedCell + 1}`,
    formatResource('Food', snapshot.resources.food),
    formatResource('Wood', snapshot.resources.wood),
    formatResource('Metal', snapshot.resources.metal),
    formatResource('Science', snapshot.resources.science),
    formatResource('Trimps', snapshot.resources.trimps),
    `Mode: ${snapshot.mode}`,
    `Fighting: ${snapshot.fighting ? 'yes' : 'no'}`,
    `Maps Active: ${snapshot.mapsActive ? 'yes' : 'no'}`,
  ].join('\n');
}

function main(argv) {
  const options = parseArgs(argv);
  if (options.help || options.command !== 'run') {
    console.log(usage());
    return options.help ? 0 : 1;
  }
  if (!Number.isFinite(options.seconds) || options.seconds < 0) {
    throw new Error('--seconds must be a non-negative number.');
  }

  const runtime = createTrimpsRuntime({ rootDir: path.resolve(__dirname, '../../..') });
  const fileStorage = createFileStoragePort({ baseDir: process.cwd() });
  if (options.savePath) {
    const saveString = fileStorage.readText(options.savePath);
    runtime.loadExport(saveString);
  }
  runtime.tick(options.seconds * 1000);
  const snapshot = runtime.snapshot();
  console.log(formatSnapshot(snapshot));

  if (options.exportPath) {
    fileStorage.writeText(options.exportPath, runtime.exportSave());
  }
  return 0;
}

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(error && error.stack ? error.stack : String(error));
    process.exitCode = 1;
  }
}

module.exports = { formatSnapshot, main, parseArgs };
