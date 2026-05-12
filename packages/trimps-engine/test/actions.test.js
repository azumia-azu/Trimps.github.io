const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const {
  ACTION_METADATA,
  EXPERIMENTAL_ACTION_TYPES,
  STABLE_ACTION_TYPES,
  SUPPORTED_ACTION_TYPES,
  getActionType,
  normalizeBuyAmount,
  normalizeMapId,
  normalizePositiveInteger,
} = require('../src/actions');
const { createTrimpsRuntime } = require('../src/headless-runtime');

const rootDir = path.resolve(__dirname, '../../..');

function sortedValues(values) {
  return Array.from(values).sort();
}

test('action stability sets describe stable and experimental actions', () => {
  assert.deepEqual(sortedValues(STABLE_ACTION_TYPES), ['gather', 'load', 'save']);
  assert.deepEqual(sortedValues(EXPERIMENTAL_ACTION_TYPES), [
    'buyBuilding',
    'buyEquipment',
    'buyJob',
    'buyUpgrade',
    'fight',
    'pauseFight',
    'runMap',
    'setBuyAmount',
    'toggleAutoFight',
  ]);

  assert.deepEqual(
    sortedValues(SUPPORTED_ACTION_TYPES),
    sortedValues([...STABLE_ACTION_TYPES, ...EXPERIMENTAL_ACTION_TYPES]),
  );
});

test('action metadata covers all supported actions', () => {
  assert.deepEqual(Object.keys(ACTION_METADATA).sort(), sortedValues(SUPPORTED_ACTION_TYPES));

  for (const actionType of SUPPORTED_ACTION_TYPES) {
    const metadata = ACTION_METADATA[actionType];
    assert.ok(metadata.description);
    assert.match(metadata.description, /\S/);
    assert.ok(['stable', 'experimental'].includes(metadata.stability));

    if (STABLE_ACTION_TYPES.has(actionType)) assert.equal(metadata.stability, 'stable');
    if (EXPERIMENTAL_ACTION_TYPES.has(actionType)) assert.equal(metadata.stability, 'experimental');
  }
});

test('validates action type shape', () => {
  assert.throws(() => getActionType(null), /must be an object/);
  assert.throws(() => getActionType({}), /missing a type/);
  assert.equal(getActionType({ type: 'gather' }), 'gather');
});

test('normalizes positive integer action amounts', () => {
  assert.equal(normalizePositiveInteger(undefined), 1);
  assert.equal(normalizePositiveInteger(1), 1);
  assert.equal(normalizePositiveInteger(3, 2), 3);

  assert.throws(() => normalizePositiveInteger(0), /positive integer/);
  assert.throws(() => normalizePositiveInteger(-1), /positive integer/);
  assert.throws(() => normalizePositiveInteger(1.5), /positive integer/);
});

test('normalizes buy amounts for adapter controls', () => {
  assert.equal(normalizeBuyAmount(1), 1);
  assert.equal(normalizeBuyAmount('25'), 25);
  assert.equal(normalizeBuyAmount('Max'), 'Max');

  assert.throws(() => normalizeBuyAmount(0), /positive integer or "Max"/);
  assert.throws(() => normalizeBuyAmount('bad'), /positive integer or "Max"/);
});

test('normalizes map ids', () => {
  assert.equal(normalizeMapId('abc'), 'abc');

  assert.throws(() => normalizeMapId(''), /non-empty string id/);
  assert.throws(() => normalizeMapId(null), /non-empty string id/);
});

test('runtime dispatch smoke covers stable action path', () => {
  const runtime = createTrimpsRuntime({ rootDir });
  const snapshot = runtime.snapshot();

  assert.equal(snapshot.world, 1);
  assert.ok(snapshot.resources);
  assert.ok(snapshot.buildings.length > 0);
  assert.ok(snapshot.jobs.length > 0);
  assert.ok(snapshot.equipment.length > 0);

  assert.equal(runtime.dispatch({ type: 'gather', resource: 'food' }), 'food');
  assert.throws(
    () => runtime.dispatch({ type: 'gather', resource: 'not-real' }),
    /Unsupported gather resource/,
  );

  const save = runtime.dispatch({ type: 'save' });
  assert.equal(typeof save, 'string');
  assert.ok(save.length > 0);
});

test('dispatches early state actions for TUI controls', () => {
  const runtime = createTrimpsRuntime({ rootDir });

  assert.equal(runtime.dispatch({ type: 'setBuyAmount', amount: 10 }), 10);
  assert.equal(runtime.snapshot().buyAmt, 10);
  assert.equal(runtime.dispatch({ type: 'setBuyAmount', amount: 'Max' }), 'Max');

  assert.equal(runtime.dispatch({ type: 'toggleAutoFight', enabled: true }), true);
  assert.equal(runtime.snapshot().autoFight, true);
  assert.equal(runtime.dispatch({ type: 'toggleAutoFight' }), false);

  assert.equal(runtime.dispatch({ type: 'pauseFight', paused: false }), false);
  assert.equal(runtime.snapshot().pauseFight, false);
  assert.equal(runtime.dispatch({ type: 'pauseFight' }), true);
});

test('setBuyAmount only mutates legacy buyAmt', () => {
  const runtime = createTrimpsRuntime({ rootDir });

  assert.equal(runtime.dispatch({ type: 'setBuyAmount', amount: '25' }), 25);
  assert.equal(runtime.context.game.global.buyAmt, 25);
  assert.equal(runtime.snapshot().buyAmt, 25);
});

test('toggleAutoFight maps adapter autoFight to legacy autoBattle', () => {
  const runtime = createTrimpsRuntime({ rootDir });

  assert.equal(runtime.context.game.global.autoFight, undefined);
  assert.equal(runtime.dispatch({ type: 'toggleAutoFight', enabled: true }), true);
  assert.equal(runtime.context.game.global.autoBattle, true);
  assert.equal(runtime.context.game.global.autoFight, undefined);
  assert.equal(runtime.snapshot().autoFight, true);
});

test('pauseFight maps false to AutoFight On and true to AutoFight Off', () => {
  const runtime = createTrimpsRuntime({ rootDir });
  const button = runtime.context.document.getElementById('pauseFight');

  assert.equal(runtime.dispatch({ type: 'pauseFight', paused: false }), false);
  assert.equal(runtime.context.game.global.pauseFight, false);
  assert.equal(button.innerHTML, 'AutoFight On');

  assert.equal(runtime.dispatch({ type: 'pauseFight', paused: true }), true);
  assert.equal(runtime.context.game.global.pauseFight, true);
  assert.equal(button.innerHTML, 'AutoFight Off');
});

test('dispatches buyUpgrade through legacy upgrade flow', () => {
  const runtime = createTrimpsRuntime({ rootDir });
  const battle = runtime.context.game.upgrades.Battle;
  battle.locked = 0;
  battle.allowed = 1;
  runtime.context.game.resources.science.owned = 10;

  const result = runtime.dispatch({ type: 'buyUpgrade', name: 'Battle' });
  const snapshotBattle = runtime.snapshot().upgrades.find((upgrade) => upgrade.name === 'Battle');

  assert.equal(result, true);
  assert.equal(snapshotBattle.done, true);
  assert.equal(snapshotBattle.locked, true);
});

test('buyUpgrade reports false without mutating when resources are insufficient', () => {
  const runtime = createTrimpsRuntime({ rootDir });
  const battle = runtime.context.game.upgrades.Battle;
  battle.locked = 0;
  battle.allowed = 1;
  runtime.context.game.resources.science.owned = 0;

  assert.equal(runtime.dispatch({ type: 'buyUpgrade', name: 'Battle' }), false);
  assert.equal(battle.done, 0);
  assert.equal(battle.locked, 0);
});

test('buyJob dispatch rejects firing mode without mutating buyAmt or jobs', () => {
  const runtime = createTrimpsRuntime({ rootDir });

  runtime.context.game.jobs.Farmer.locked = 0;
  runtime.context.game.jobs.Farmer.owned = 10;
  runtime.context.game.global.buyAmt = 7;
  runtime.context.game.global.firing = true;

  assert.throws(
    () => runtime.dispatch({ type: 'buyJob', name: 'Farmer', amount: 2 }),
    /firing mode is enabled/,
  );
  assert.equal(runtime.context.game.global.buyAmt, 7);
  assert.equal(runtime.context.game.jobs.Farmer.owned, 10);
});

test('purchase actions default to the current buyAmt and still honor explicit amounts', () => {
  const runtime = createTrimpsRuntime({ rootDir });
  const calls = [];

  runtime.context.game.global.buyAmt = 7;
  runtime.context.game.buildings.Trap.locked = 0;
  runtime.context.game.equipment.Shield.locked = 0;
  runtime.context.game.jobs.Farmer.locked = 0;

  runtime.context.buyBuilding = (...args) => {
    calls.push(['buyBuilding', ...args]);
    return true;
  };
  runtime.context.buyEquipment = (...args) => {
    calls.push(['buyEquipment', ...args]);
    return true;
  };
  runtime.context.buyJob = (...args) => {
    calls.push(['buyJob', ...args, runtime.context.game.global.buyAmt]);
    return true;
  };

  assert.equal(runtime.dispatch({ type: 'buyBuilding', name: 'Trap' }), true);
  assert.equal(runtime.dispatch({ type: 'buyEquipment', name: 'Shield' }), true);
  assert.equal(runtime.dispatch({ type: 'buyJob', name: 'Farmer' }), true);
  assert.equal(runtime.dispatch({ type: 'buyBuilding', name: 'Trap', amount: 3 }), true);
  assert.equal(runtime.dispatch({ type: 'buyJob', name: 'Farmer', amount: 2 }), true);

  assert.deepEqual(calls[0], ['buyBuilding', 'Trap', true, true, 7]);
  assert.deepEqual(calls[1], ['buyEquipment', 'Shield', true, true, 7]);
  assert.deepEqual(calls[2], ['buyJob', 'Farmer', true, true, 7]);
  assert.deepEqual(calls[3], ['buyBuilding', 'Trap', true, true, 3]);
  assert.deepEqual(calls[4], ['buyJob', 'Farmer', true, true, 2]);
  assert.equal(runtime.context.game.global.buyAmt, 7);
});

test('purchase actions do not pass Max as a forced amount', () => {
  const runtime = createTrimpsRuntime({ rootDir });
  const buildingCalls = [];
  const equipmentCalls = [];
  const jobBuyAmts = [];

  runtime.context.game.global.buyAmt = 'Max';
  runtime.context.game.buildings.Trap.locked = 0;
  runtime.context.game.equipment.Shield.locked = 0;
  runtime.context.game.jobs.Farmer.locked = 0;

  runtime.context.buyBuilding = (...args) => {
    buildingCalls.push(args);
    return true;
  };
  runtime.context.buyEquipment = (...args) => {
    equipmentCalls.push(args);
    return true;
  };
  runtime.context.buyJob = () => {
    jobBuyAmts.push(runtime.context.game.global.buyAmt);
    return true;
  };

  assert.equal(runtime.dispatch({ type: 'buyBuilding', name: 'Trap' }), true);
  assert.equal(runtime.dispatch({ type: 'buyEquipment', name: 'Shield' }), true);
  assert.equal(runtime.dispatch({ type: 'buyJob', name: 'Farmer' }), true);

  assert.equal(buildingCalls[0].length, 3);
  assert.equal(equipmentCalls[0].length, 3);
  assert.equal(jobBuyAmts[0], 'Max');
  assert.equal(runtime.context.game.global.buyAmt, 'Max');
});

test('buyUpgrade validates unknown upgrade names', () => {
  const runtime = createTrimpsRuntime({ rootDir });

  assert.throws(
    () => runtime.dispatch({ type: 'buyUpgrade', name: 'NotARealUpgrade' }),
    /Unknown upgrades target/,
  );
});

test('validates early action payloads', () => {
  const runtime = createTrimpsRuntime({ rootDir });

  assert.throws(() => runtime.dispatch({ type: 'setBuyAmount', amount: 0 }), /positive integer or "Max"/);
  assert.throws(() => runtime.dispatch({ type: 'buyUpgrade', name: '' }), /exact upgrade name/);
  assert.throws(() => runtime.dispatch({ type: 'buyUpgrade', name: 'Battle' }), /locked/);
});
