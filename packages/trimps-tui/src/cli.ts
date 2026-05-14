#!/usr/bin/env bun

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEngine } from './engine-loader';
import { createOpenTuiRenderer } from './opentui-renderer';
import type { GameSnapshot } from './types/trimps-engine';

type CliOptions = {
  command?: string;
  seconds: number;
  intervalMs: number;
  frames: number;
  savePath?: string;
  help?: boolean;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function usage(): string {
  return [
    'Usage:',
    '  bun packages/trimps-tui/src/cli.ts run [--save <path>] [--seconds <n>] [--interval <ms>] [--frames <n>]',
    '  npm run trimps-tui -- run [--save <path>] [--seconds <n>] [--interval <ms>] [--frames <n>]',
    '',
    'Use --frames 0, the default, to keep the OpenTUI dashboard running until Ctrl+C.',
  ].join('\n');
}

export function parseArgs(argv: string[]): CliOptions {
  const [command, ...args] = argv;
  const options: CliOptions = { command, seconds: 0, intervalMs: 1000, frames: 0 };
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

function validateOptions(options: CliOptions): void {
  if (!Number.isFinite(options.seconds) || options.seconds < 0) throw new Error('--seconds must be a non-negative number.');
  if (!Number.isSafeInteger(options.intervalMs) || options.intervalMs < 0) throw new Error('--interval must be a non-negative integer.');
  if (!Number.isSafeInteger(options.frames) || options.frames < 0) throw new Error('--frames must be a non-negative integer.');
}

export async function runDashboard(options: CliOptions): Promise<void> {
  validateOptions(options);

  const { createCommandList, createFileStoragePort, createSystemClockPort, createTrimpsRuntime, runRuntimeLoop } = loadEngine();
  if (typeof createCommandList !== 'function') throw new Error('@trimps/engine createCommandList() is unavailable.');
  const runtime = createTrimpsRuntime({ rootDir: path.resolve(__dirname, '../../..') });
  const fileStorage = createFileStoragePort({ baseDir: process.cwd() });
  if (options.savePath) {
    const saveString = fileStorage.readText(options.savePath);
    runtime.loadExport(saveString);
  }

  const renderer = await createOpenTuiRenderer({ runtime, createCommandList });
  const deltaMs = options.seconds * 1000;

  try {
    await runRuntimeLoop({
      runtime,
      clockPort: createSystemClockPort(),
      initialDeltaMs: deltaMs,
      intervalMs: options.intervalMs,
      frames: options.frames,
      onSnapshot(snapshot: GameSnapshot) {
        return renderer.update(snapshot);
      },
      shouldContinue() {
        return !renderer.isClosed();
      },
    });
  } finally {
    await renderer.close();
  }
}

export async function main(argv: string[]): Promise<number> {
  const options = parseArgs(argv);
  if (options.help || options.command !== 'run') {
    console.log(usage());
    return options.help ? 0 : 1;
  }

  await runDashboard(options);
  return 0;
}

if (import.meta.main) {
  main(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode;
  }).catch((error: unknown) => {
    console.error(error && typeof error === 'object' && 'stack' in error ? error.stack : String(error));
    process.exitCode = 1;
  });
}
