const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');

const { ACTION_METADATA } = require('../src/actions');
const { createCommandList: createCommandListFromRuntime, createTrimpsRuntime } = require('../src/headless-runtime');

const rootDir = path.resolve(__dirname, '../../..');

function loadCommandsModule() {
  return require('../src/commands');
}

function getCommandMap(commands) {
  return new Map(commands.map((command) => [command.id, command]));
}

test('creates the first command batch in stable order', () => {
  const runtime = createTrimpsRuntime({ rootDir });
  const { createCommandList } = loadCommandsModule();
  const commands = createCommandList(runtime.snapshot(), runtime.capabilities());

  assert.deepEqual(commands.map((command) => command.id), [
    'gather.food',
    'gather.wood',
    'gather.metal',
    'gather.science',
    'setBuyAmount.1',
    'setBuyAmount.10',
    'setBuyAmount.25',
    'setBuyAmount.100',
    'setBuyAmount.max',
    'toggleAutoFight',
    'pauseFight',
    'save',
  ]);

  assert.equal(new Set(commands.map((command) => command.id)).size, commands.length);
});

test('derives command stability from action metadata', () => {
  const runtime = createTrimpsRuntime({ rootDir });
  const { createCommandList } = loadCommandsModule();
  const commands = createCommandList(runtime.snapshot(), runtime.capabilities());

  for (const command of commands) {
    assert.equal(command.stability, ACTION_METADATA[command.action.type].stability);
  }
});

test('passes action objects directly to runtime.dispatch for enabled commands', () => {
  const runtime = createTrimpsRuntime({ rootDir });
  runtime.context.game.resources.food.owned = 1000;
  runtime.context.game.resources.wood.owned = 1000;
  runtime.context.game.resources.metal.owned = 1000;
  runtime.context.game.resources.science.owned = 1000;
  runtime.context.game.upgrades.Battle.done = 1;
  runtime.context.game.global.time = 1000;
  runtime.context.game.global.mapsUnlocked = true;
  runtime.context.game.global.mapsOwnedArray.push({ id: 'map1', name: 'Map', level: 6 });

  const { createCommandList } = loadCommandsModule();
  const commands = createCommandList(runtime.snapshot(), runtime.capabilities());

  for (const command of commands) {
    if (command.enabled) {
      assert.doesNotThrow(() => runtime.dispatch(command.action));
    }
  }
});

test('uses capability availability and disabled reasons', () => {
  const runtime = createTrimpsRuntime({ rootDir });
  runtime.context.game.global.challengeActive = 'Scientist';

  const { createCommandList } = loadCommandsModule();
  const commands = getCommandMap(createCommandList(runtime.snapshot(), runtime.capabilities()));

  assert.equal(commands.get('gather.science').enabled, false);
  assert.equal(commands.get('gather.science').disabledReason, 'blocked by Scientist challenge');
  assert.equal(commands.get('gather.food').enabled, true);
  assert.equal(commands.get('gather.food').disabledReason, null);
});

test('marks commands disabled when a provided capability path is missing', () => {
  const runtime = createTrimpsRuntime({ rootDir });
  const { createCommandList } = loadCommandsModule();
  const commands = getCommandMap(createCommandList(runtime.snapshot(), { gather: {} }));

  assert.equal(commands.get('gather.food').enabled, false);
  assert.equal(commands.get('gather.food').disabledReason, 'missing capability: gather.food');
  assert.equal(commands.get('save').enabled, false);
  assert.equal(commands.get('save').disabledReason, 'missing capability: save');
});

test('derives toggle command action targets from snapshot state', () => {
  const { createCommandList } = loadCommandsModule();

  const offCommands = getCommandMap(createCommandList({ autoFight: false, pauseFight: false }, null));
  assert.deepEqual(offCommands.get('toggleAutoFight').action, { type: 'toggleAutoFight', enabled: true });
  assert.deepEqual(offCommands.get('pauseFight').action, { type: 'pauseFight', paused: true });

  const onCommands = getCommandMap(createCommandList({ autoFight: true, pauseFight: true }, null));
  assert.deepEqual(onCommands.get('toggleAutoFight').action, { type: 'toggleAutoFight', enabled: false });
  assert.deepEqual(onCommands.get('pauseFight').action, { type: 'pauseFight', paused: false });
});

test('exports frozen default command definitions', () => {
  const { DEFAULT_COMMANDS } = loadCommandsModule();

  assert.equal(Object.isFrozen(DEFAULT_COMMANDS), true);
  assert.equal(Object.isFrozen(DEFAULT_COMMANDS[0]), true);
  assert.equal(Object.isFrozen(DEFAULT_COMMANDS[0].action), true);
  assert.equal(Object.isFrozen(DEFAULT_COMMANDS[0].capabilityPath), true);
});

test('supports custom keymap overrides by command id', () => {
  const runtime = createTrimpsRuntime({ rootDir });
  const { createCommandList } = loadCommandsModule();
  const commands = getCommandMap(
    createCommandList(runtime.snapshot(), runtime.capabilities(), {
      keymap: {
        'gather.food': '1',
        'setBuyAmount.max': 'm',
        save: 'Ctrl+S',
      },
    }),
  );

  assert.equal(commands.get('gather.food').key, '1');
  assert.equal(commands.get('setBuyAmount.max').key, 'm');
  assert.equal(commands.get('save').key, 'Ctrl+S');
  assert.equal(commands.get('gather.wood').key, 'w');
});

test('commands module has no OpenTUI React or Bun dependency', () => {
  const originalLoad = Module._load;
  const blocked = [];

  Module._load = function patchedLoad(request) {
    if (/react|bun|opentui/i.test(request)) {
      blocked.push(request);
      throw new Error(`Unexpected dependency: ${request}`);
    }
    return originalLoad.apply(this, arguments);
  };

  try {
    delete require.cache[require.resolve('../src/commands')];
    const { createCommandList } = require('../src/commands');
    assert.equal(typeof createCommandList, 'function');
    assert.deepEqual(blocked, []);
  } finally {
    Module._load = originalLoad;
  }
});

test('headless runtime re-exports the command derivation helper', () => {
  assert.equal(typeof createCommandListFromRuntime, 'function');
});
