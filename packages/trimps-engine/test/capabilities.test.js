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
    buildings: true,
    food: true,
    metal: true,
    science: true,
    trimps: true,
    wood: true,
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
  runtime.context.game.global.mapsUnlocked = true;
  runtime.context.game.global.mapsOwnedArray.push({ id: 'map1', name: 'Map', level: 6 });

  const capabilities = runtime.capabilities();

  assert.deepEqual(capabilities.fight, { available: true, reason: null });
  assert.deepEqual(capabilities.runMap, { available: true, reason: null });
});
