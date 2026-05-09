const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { cleanExportString, createTrimpsRuntime } = require('../src/headless-runtime');

const rootDir = path.resolve(__dirname, '../../..');
const defaultGoldenPath = path.join(__dirname, 'fixtures/default-snapshot.golden.json');

function createRuntime() {
  return createTrimpsRuntime({ rootDir });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function names(entries) {
  return entries.map((entry) => entry.name);
}

function getGoldenSnapshotShape(snapshot) {
  return {
    world: snapshot.world,
    lastClearedCell: snapshot.lastClearedCell,
    lastClearedMapCell: snapshot.lastClearedMapCell,
    mode: snapshot.mode,
    mapsActive: snapshot.mapsActive,
    fighting: snapshot.fighting,
    pauseFight: snapshot.pauseFight,
    challenge: snapshot.challenge,
    resources: snapshot.resources,
    buildingNames: names(snapshot.buildings),
    jobNames: names(snapshot.jobs),
    equipmentNames: names(snapshot.equipment),
    messagePreferences: snapshot.messagePreferences,
  };
}

test('creates a default headless runtime snapshot', () => {
  const runtime = createRuntime();
  const snapshot = runtime.snapshot();

  assert.equal(snapshot.world, 1);
  assert.equal(snapshot.mode, 'world');
  assert.equal(snapshot.resources.food.max, 500);
  assert.equal(snapshot.resources.trimps.max, 10);
  assert.ok(snapshot.buildings.length > 0);
  assert.ok(snapshot.jobs.length > 0);
  assert.ok(snapshot.equipment.length > 0);
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.resources.trimps), true);
});

test('matches default snapshot golden shape', () => {
  const runtime = createRuntime();
  const actual = getGoldenSnapshotShape(runtime.snapshot());
  const expected = readJson(defaultGoldenPath);

  assert.deepEqual(actual, expected);
});

test('ticks deterministically in runtime-speed increments', () => {
  const runtime = createRuntime();

  assert.equal(runtime.tick(50), 0);
  assert.equal(runtime.tick(50), 1);
  assert.equal(runtime.tick(1000), 10);
  assert.equal(runtime.context.game.global.time, 1100);
});

test('dispatches gather action and advances resource production', () => {
  const runtime = createRuntime();

  assert.equal(runtime.dispatch({ type: 'gather', resource: 'food' }), 'food');
  assert.equal(runtime.tick(1000), 10);

  const snapshot = runtime.snapshot();
  assert.ok(snapshot.resources.food.owned > 0.99);
  assert.ok(snapshot.resources.food.owned < 1.01);
});

test('exports and loads a default save without losing snapshot state', () => {
  const runtime = createRuntime();
  runtime.dispatch({ type: 'gather', resource: 'food' });
  runtime.tick(1000);

  const save = runtime.exportSave();
  assert.equal(typeof save, 'string');
  assert.ok(save.length > 1000);

  const reloaded = createRuntime();
  assert.equal(reloaded.loadExport(`\n ${save}\n`), true);

  assert.deepEqual(
    getGoldenSnapshotShape(reloaded.snapshot()),
    getGoldenSnapshotShape(runtime.snapshot()),
  );
});

test('cleanExportString strips whitespace from save payloads', () => {
  assert.equal(cleanExportString(' a\n b\t c\r\n'), 'abc');
});
