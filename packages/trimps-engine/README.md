# Trimps Engine

`@trimps/engine` is a headless wrapper around the legacy Trimps JavaScript runtime. It loads the existing browser-era rule code in a mocked platform context; it is not a rewrite of the game rules.

The public runtime entry is `src/headless-runtime.js`. TUI and other adapters should interact with the game through `createTrimpsRuntime()` and `runtime.dispatch(action)`, not by calling legacy global functions or reading the legacy `game` object directly.

## Ports

Headless runtime dependencies are isolated behind small ports:

- `createManualClockPort()` and `createSystemClockPort()` provide runtime time sources.
- `createMemoryStoragePort()` provides the localStorage-compatible storage used by the browser mock.
- `createFileStoragePort()` provides explicit save-file reads and writes for CLIs and adapters.
- `createHeadlessPlatformPort()` wires clock and storage ports into the legacy browser mock.

Adapters can inject these ports through `createTrimpsRuntime({ clockPort, storagePort, platformPort })`. This keeps the engine boundary testable and prevents TUI code from depending on browser DOM or `localStorage`.

## Action Stability

Stable actions are suitable as the first TUI interaction surface:

- `load`
- `save`
- `gather`

Experimental actions bridge legacy behavior with more preconditions and sharper edges:

- `buyBuilding`
- `buyJob`
- `buyEquipment`
- `fight`
- `runMap`

`src/actions.js` exports `STABLE_ACTION_TYPES`, `EXPERIMENTAL_ACTION_TYPES`, `SUPPORTED_ACTION_TYPES`, and `ACTION_METADATA` so CLI/TUI code and tests can reason about action status without duplicating lists.

## Adding Actions

When adding a new action:

- Add it to either the stable or experimental action set.
- Add a matching `ACTION_METADATA` entry.
- Keep the public call shape as `runtime.dispatch(action)`.
- Add validation or smoke test coverage.
- Do not add browser DOM, OpenTUI, or direct `localStorage` dependencies to the engine.
