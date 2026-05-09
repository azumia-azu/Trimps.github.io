const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const {
  ACTION_METADATA,
  EXPERIMENTAL_ACTION_TYPES,
  STABLE_ACTION_TYPES,
  SUPPORTED_ACTION_TYPES,
  getActionType,
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

test('validates early action payloads', () => {
  const runtime = createTrimpsRuntime({ rootDir });

  assert.throws(() => runtime.dispatch({ type: 'setBuyAmount', amount: 0 }), /positive integer or "Max"/);
  assert.throws(() => runtime.dispatch({ type: 'buyUpgrade', name: '' }), /exact upgrade name/);
  assert.throws(() => runtime.dispatch({ type: 'buyUpgrade', name: 'Battle' }), /locked/);
});
