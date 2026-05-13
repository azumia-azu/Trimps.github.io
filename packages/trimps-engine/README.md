# Trimps Engine

`@trimps/engine` is a headless wrapper around the legacy Trimps JavaScript runtime. It loads the existing browser-era rule code in a mocked platform context; it is not a rewrite of the game rules.

The public runtime entry is `src/headless-runtime.js`. TUI and other adapters should interact with the game through `createTrimpsRuntime()` and `runtime.dispatch(action)`, not by calling legacy global functions or reading the legacy `game` object directly.

## Runner

`runRuntimeLoop()` is the shared helper for adapter tick and snapshot loops. CLI and TUI adapters should use it instead of building their own `runtime.tick()` and `runtime.snapshot()` polling loops.

The runner accepts a runtime with `tick()` and `snapshot()`, calls `onSnapshot(snapshot)` after each frame, and waits through the injected `clockPort` between frames. `frames` defaults to `0`, which means continuous mode. In continuous mode, `intervalMs` must be greater than `0`.

Use `shouldContinue(snapshot, frameIndex)` to stop a continuous loop from the adapter side. The first snapshot uses `frameIndex` `0`; later snapshots increment by one after each interval.

```js
const { createTrimpsRuntime, runRuntimeLoop } = require('@trimps/engine');

const runtime = createTrimpsRuntime();

await runRuntimeLoop({
  runtime,
  frames: 0,
  intervalMs: 1000,
  onSnapshot(snapshot) {
    renderDashboard(snapshot);
  },
  shouldContinue(snapshot, frameIndex) {
    return frameIndex < 60 && !snapshot.pauseGame;
  },
});
```

## Ports

Headless runtime dependencies are isolated behind small ports:

- `createManualClockPort()` provides deterministic time for tests and controlled adapters.
- `createSystemClockPort()` provides normal wall-clock time and timers.
- `createMemoryStoragePort()` provides the localStorage-compatible storage used by the browser mock.
- `createFileStoragePort()` provides explicit save-file reads and writes for CLIs and adapters.
- `createHeadlessPlatformPort()` wires clock and storage ports into the legacy browser mock.

Adapters can inject these ports through `createTrimpsRuntime({ clockPort, storagePort, platformPort })`, and can pass `clockPort` to `runRuntimeLoop()` when the loop timing should use the same clock. This keeps the engine boundary testable and prevents TUI code from depending on browser DOM, `localStorage`, or the legacy global `game` object.

## Action Stability

Stable actions are suitable as the first TUI interaction surface:

- `load`
- `save`
- `gather`

Experimental actions bridge legacy behavior with more preconditions and sharper edges:

- `buyBuilding`
- `buyJob`
- `buyEquipment`
- `buyUpgrade`
- `fight`
- `pauseFight`
- `runMap`
- `setBuyAmount`
- `toggleAutoFight`

`src/actions.js` exports `STABLE_ACTION_TYPES`, `EXPERIMENTAL_ACTION_TYPES`, `SUPPORTED_ACTION_TYPES`, and `ACTION_METADATA` so CLI/TUI code and tests can reason about action status without duplicating lists.

`runtime.capabilities()` returns the current snapshot-aware availability for actions. Use `ACTION_METADATA` for static action positioning, such as stable versus experimental, and use `runtime.capabilities()` before enabling user commands that depend on current game state.

## Commands

`src/commands.js` exports `createCommandList(snapshot, capabilities, options)` as the shared command derivation layer for adapters. Commands are derived from a read-only snapshot, current action capabilities, and `ACTION_METADATA`; they do not call legacy functions directly and do not depend on OpenTUI, React, Bun, DOM APIs, or `localStorage`.

Use commands when binding keyboard shortcuts, rendering an action panel, or building a command palette. UI adapters should consume `command.id`, `command.key`, `command.label`, and `command.disabledReason`, then pass `command.action` to `runtime.dispatch(command.action)` when `command.enabled` is true.

```js
const { createCommandList, createTrimpsRuntime } = require('@trimps/engine');

const runtime = createTrimpsRuntime();
const snapshot = runtime.snapshot();
const capabilities = runtime.capabilities();

const commands = createCommandList(snapshot, capabilities, {
  keymap: {
    'gather.food': 'f',
    'gather.wood': 'w',
    'setBuyAmount.max': 'm',
  },
});

const command = commands.find((candidate) => candidate.id === 'gather.food');
if (command && command.enabled) {
  runtime.dispatch(command.action);
}
```

Command objects have this shape:

```js
{
  id: 'gather.food',
  label: 'Gather Food',
  description: 'Switch gathering to food.',
  key: 'f',
  action: { type: 'gather', resource: 'food' },
  enabled: true,
  disabledReason: null,
  stability: 'stable',
}
```

The first command batch covers gather resource switching, buy amount selection, `toggleAutoFight`, `pauseFight`, and `save`. Keep adapter-specific key event parsing outside the engine; only pure command derivation belongs here.

## Adding Actions

When adding a new action:

- Add it to either the stable or experimental action set.
- Add a matching `ACTION_METADATA` entry.
- Keep the public call shape as `runtime.dispatch(action)`.
- Add validation or smoke test coverage.
- Do not add browser DOM, OpenTUI, or direct `localStorage` dependencies to the engine.
