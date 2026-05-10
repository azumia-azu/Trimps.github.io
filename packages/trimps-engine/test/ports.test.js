const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { createManualClockPort } = require('../src/ports/clock-port');
const { createFileStoragePort, createMemoryStoragePort } = require('../src/ports/storage-port');
const { createHeadlessPlatformPort } = require('../src/ports/platform-port');
const { createLegacyRuntimeContext } = require('../src/legacy-loader');
const { createTrimpsRuntime } = require('../src/headless-runtime');
const { createBrowserContext } = require('../src/platform');

const rootDir = path.resolve(__dirname, '../../..');

test('memory storage port follows localStorage string semantics', () => {
  const storage = createMemoryStoragePort({ existing: 12 });

  assert.equal(storage.length, 1);
  assert.equal(storage.getItem('existing'), '12');
  assert.equal(storage.getItem('missing'), null);

  storage.setItem('enabled', true);
  assert.equal(storage.getItem('enabled'), 'true');
  assert.equal(storage.key(0), 'existing');
  assert.equal(storage.key(1), 'enabled');

  storage.removeItem('existing');
  assert.equal(storage.getItem('existing'), null);
  storage.clear();
  assert.equal(storage.length, 0);
});

test('file storage port reads and writes text relative to a base directory', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trimps-port-'));
  const storage = createFileStoragePort({ baseDir: tempDir });

  storage.writeText('saves/export.txt', 'trimps-save');

  assert.equal(fs.readFileSync(path.join(tempDir, 'saves/export.txt'), 'utf8'), 'trimps-save');
  assert.equal(storage.readText('saves/export.txt'), 'trimps-save');
});

test('manual clock port drives runtime ticks without Date.now', () => {
  const clockPort = createManualClockPort(1000);
  const runtime = createTrimpsRuntime({ rootDir, clockPort });

  runtime.tick(100);
  assert.equal(runtime.context.game.global.time, 100);
  assert.equal(clockPort.now(), 1000);

  clockPort.advance(250);
  runtime.tick(100);
  assert.equal(runtime.context.game.global.time, 200);
  assert.equal(clockPort.now(), 1250);
});

test('manual clock port schedules timeout and interval callbacks on advance', () => {
  const clockPort = createManualClockPort(1000);
  const events = [];

  clockPort.setTimeout((label) => events.push(label), 100, 'timeout');
  const intervalId = clockPort.setInterval(() => events.push('interval'), 50);

  clockPort.advance(49);
  assert.deepEqual(events, []);

  clockPort.advance(1);
  assert.deepEqual(events, ['interval']);

  clockPort.advance(50);
  assert.deepEqual(events, ['interval', 'timeout', 'interval']);

  clockPort.clearInterval(intervalId);
  clockPort.advance(100);
  assert.deepEqual(events, ['interval', 'timeout', 'interval']);
});

test('browser context timers are routed through the injected clock port', () => {
  const clockPort = createManualClockPort(1000);
  const context = createBrowserContext(rootDir, { clockPort });
  const events = [];

  context.setTimeout((label) => events.push(label), 100, 'timeout');
  const intervalId = context.setInterval(() => events.push('interval'), 50);

  clockPort.advance(50);
  assert.deepEqual(events, ['interval']);

  clockPort.advance(50);
  assert.deepEqual(events, ['interval', 'timeout', 'interval']);

  context.clearInterval(intervalId);
  clockPort.advance(50);
  assert.deepEqual(events, ['interval', 'timeout', 'interval']);
});

test('legacy loader accepts an injected platform port', () => {
  const storagePort = createMemoryStoragePort({ trimpsSave: 'stored-save' });
  const clockPort = createManualClockPort(5000);
  const platformPort = createHeadlessPlatformPort({ clockPort, storagePort });

  const { context } = createLegacyRuntimeContext({ rootDir, platformPort });

  assert.equal(context.localStorage.getItem('trimpsSave'), 'stored-save');
  assert.equal(context.performance.now(), 0);
  clockPort.advance(123);
  assert.equal(context.performance.now(), 123);
});
