const { dispatchLegacyAction } = require('./actions');
const { createLegacyRuntimeContext } = require('./legacy-loader');
const { createSnapshot } = require('./snapshot');

function cleanExportString(saveString) {
  return String(saveString).replace(/(\r\n|\n|\r|\s)/gm, '');
}

function getRuntimeSpeed(context) {
  const speed = Number(context.game.settings && context.game.settings.speed);
  return Number.isFinite(speed) && speed > 0 ? speed : 10;
}

function runLegacyTick(context, now) {
  if (typeof context.runGameLoop === 'function') context.runGameLoop(true, now);
  else if (typeof context.gameLoop === 'function') context.gameLoop(true, now);
  else throw new Error('Legacy game loop is unavailable.');
}

function createTrimpsRuntime(options = {}) {
  const { context, platformPort, rootDir } = createLegacyRuntimeContext(options);
  const clockPort = options.clockPort || (platformPort && platformPort.clockPort);
  let pendingTickMs = 0;

  const runtime = {
    context,
    rootDir,
    loadExport(saveString) {
      if (!saveString) return false;
      if (typeof context.load !== 'function') throw new Error('Legacy load() is unavailable.');
      pendingTickMs = 0;
      return context.load(cleanExportString(saveString));
    },
    exportSave() {
      if (typeof context.save !== 'function') throw new Error('Legacy save() is unavailable.');
      return context.save(true);
    },
    tick(deltaMs = 0) {
      const numericDeltaMs = Number(deltaMs);
      if (!Number.isFinite(numericDeltaMs)) throw new Error('tick(deltaMs) requires a finite millisecond value.');
      if (numericDeltaMs <= 0) return 0;

      pendingTickMs += numericDeltaMs;
      const tickMs = 1000 / getRuntimeSpeed(context);
      const ticks = Math.floor(pendingTickMs / tickMs);
      if (ticks <= 0) return 0;

      pendingTickMs -= ticks * tickMs;
      const now = clockPort && typeof clockPort.now === 'function' ? clockPort.now() : Date.now();
      for (let index = 0; index < ticks; index += 1) {
        context.game.global.time += tickMs;
        runLegacyTick(context, now + index * tickMs);
      }
      return ticks;
    },
    dispatch(action) {
      return dispatchLegacyAction(context, runtime, action);
    },
    snapshot() {
      return createSnapshot(context.game);
    },
  };

  return runtime;
}

module.exports = {
  cleanExportString,
  createTrimpsRuntime,
};
