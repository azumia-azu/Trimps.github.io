const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const { ACTION_METADATA, SUPPORTED_ACTION_TYPES } = require('../src/actions');
const { getActionCapabilities } = require('../src/capabilities');
const { createTrimpsRuntime } = require('../src/headless-runtime');

const rootDir = path.resolve(__dirname, '../../..');

function sortedValues(values) {
  return Array.from(values).sort();
}

test('capabilities stay aligned with supported action metadata', () => {
  const runtime = createTrimpsRuntime({ rootDir });
  const capabilities = runtime.capabilities();

  assert.deepEqual(Object.keys(capabilities).sort(), sortedValues(SUPPORTED_ACTION_TYPES));
  assert.deepEqual(Object.keys(ACTION_METADATA).sort(), sortedValues(SUPPORTED_ACTION_TYPES));
});

test('derives gather and purchase capabilities from a snapshot', () => {
  const runtime = createTrimpsRuntime({ rootDir });
  runtime.context.game.resources.food.owned = 100;
  runtime.context.game.resources.wood.owned = 100;
  runtime.context.game.buildings.Trap.locked = 0;

  const capabilities = getActionCapabilities(runtime.snapshot());

  assert.deepEqual(capabilities.gather, {
    buildings: { available: true, reason: null },
    food: { available: true, reason: null },
    metal: { available: true, reason: null },
    science: { available: true, reason: null },
    trimps: { available: true, reason: null },
    wood: { available: true, reason: null },
  });
  assert.deepEqual(capabilities.buyBuilding.Trap, { available: true, reason: null });
  assert.equal(capabilities.buyBuilding.Hut.available, false);
  assert.equal(capabilities.buyBuilding.Hut.reason, 'locked');
});

test('runtime exposes current action capabilities', () => {
  const runtime = createTrimpsRuntime({ rootDir });
  const capabilities = runtime.capabilities();

  assert.equal(capabilities.fight.available, false);
  assert.equal(capabilities.fight.reason, 'Battle upgrade not unlocked');
  assert.equal(capabilities.runMap.available, false);
  assert.equal(capabilities.runMap.reason, 'maps not unlocked');
});

test('capabilities mark fight and runMap available when prerequisites are visible', () => {
  const runtime = createTrimpsRuntime({ rootDir });
  runtime.context.game.upgrades.Battle.done = 1;
  runtime.context.game.global.time = 1000;
  runtime.context.game.global.mapsUnlocked = true;
  runtime.context.game.global.mapsOwnedArray.push({ id: 'map1', name: 'Map', level: 6 });

  const capabilities = runtime.capabilities();

  assert.deepEqual(capabilities.fight, { available: true, reason: null });
  assert.deepEqual(capabilities.runMap, { available: true, reason: null });
});

test('capabilities gate legacy-blocked actions while pauseGame is enabled', () => {
  const runtime = createTrimpsRuntime({ rootDir });
  runtime.context.game.options.menu.pauseGame.enabled = true;
  runtime.context.game.resources.food.owned = 100;
  runtime.context.game.resources.wood.owned = 100;
  runtime.context.game.buildings.Trap.locked = 0;
  runtime.context.game.jobs.Farmer.locked = 0;
  runtime.context.game.equipment.Shield.locked = 0;
  runtime.context.game.upgrades.Battle.done = 1;
  runtime.context.game.global.mapsUnlocked = true;
  runtime.context.game.global.mapsOwnedArray.push({ id: 'map1', name: 'Map', level: 6 });

  const snapshot = runtime.snapshot();
  const capabilities = getActionCapabilities(snapshot);

  assert.equal(snapshot.pauseGame, true);
  assert.deepEqual(capabilities.buyBuilding.Trap, { available: false, reason: 'game paused' });
  assert.deepEqual(capabilities.buyJob.Farmer, { available: false, reason: 'game paused' });
  assert.deepEqual(capabilities.buyEquipment.Shield, { available: false, reason: 'game paused' });
  assert.deepEqual(capabilities.buyUpgrade.Battle, { available: false, reason: 'game paused' });
  assert.deepEqual(capabilities.gather.food, { available: false, reason: 'game paused' });
  assert.deepEqual(capabilities.gather.buildings, { available: false, reason: 'game paused' });
  assert.deepEqual(capabilities.fight, { available: false, reason: 'game paused' });
  assert.deepEqual(capabilities.runMap, { available: false, reason: 'game paused' });
});

test('capabilities gate gather targets blocked by active challenges', () => {
  const runtime = createTrimpsRuntime({ rootDir });

  runtime.context.game.global.challengeActive = 'Scientist';
  const scientistCapabilities = runtime.capabilities();

  assert.deepEqual(scientistCapabilities.gather.science, {
    available: false,
    reason: 'blocked by Scientist challenge',
  });
  assert.deepEqual(scientistCapabilities.gather.metal, { available: true, reason: null });

  runtime.context.game.global.challengeActive = 'Transmute';
  const transmuteCapabilities = runtime.capabilities();

  assert.deepEqual(transmuteCapabilities.gather.metal, {
    available: false,
    reason: 'blocked by Transmute challenge',
  });
  assert.deepEqual(transmuteCapabilities.gather.science, { available: true, reason: null });
});

test('capabilities gate fight before the first second of game time', () => {
  const runtime = createTrimpsRuntime({ rootDir });
  runtime.context.game.upgrades.Battle.done = 1;
  runtime.context.game.global.time = 999;

  const earlyCapabilities = runtime.capabilities();
  assert.deepEqual(earlyCapabilities.fight, {
    available: false,
    reason: 'first second not elapsed',
  });

  runtime.context.game.global.time = 1000;

  const readyCapabilities = runtime.capabilities();
  assert.deepEqual(readyCapabilities.fight, { available: true, reason: null });
});

test('capabilities gate runMap when Mapology has no available credits', () => {
  const runtime = createTrimpsRuntime({ rootDir });
  runtime.context.game.global.challengeActive = 'Mapology';
  runtime.context.game.global.mapsUnlocked = true;
  runtime.context.game.challenges.Mapology.credits = 0;
  runtime.context.game.global.currentMapId = '';
  runtime.context.game.global.mapsOwnedArray.push({ id: 'map1', name: 'Map', level: 6 });

  const blockedCapabilities = runtime.capabilities();
  assert.deepEqual(blockedCapabilities.runMap, {
    available: false,
    reason: 'no map credits',
  });

  runtime.context.game.challenges.Mapology.credits = 1;

  const readyCapabilities = runtime.capabilities();
  assert.deepEqual(readyCapabilities.runMap, { available: true, reason: null });
});
