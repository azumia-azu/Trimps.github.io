const { createSystemClockPort } = require('./ports/clock-port');

function assertNonNegativeInteger(value, label) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
  return normalized;
}

function assertNonNegativeFinite(value, label) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new Error(`${label} must be a non-negative number.`);
  }
  return normalized;
}

function delay(clockPort, delayMs) {
  if (delayMs <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    clockPort.setTimeout(resolve, delayMs);
  });
}

async function renderFrame(runtime, deltaMs, onSnapshot) {
  runtime.tick(deltaMs);
  const snapshot = runtime.snapshot();
  if (onSnapshot) await onSnapshot(snapshot);
  return snapshot;
}

async function runRuntimeLoop(options = {}) {
  const {
    runtime,
    onSnapshot,
    shouldContinue,
  } = options;

  if (!runtime || typeof runtime.tick !== 'function' || typeof runtime.snapshot !== 'function') {
    throw new Error('runRuntimeLoop requires a runtime with tick() and snapshot().');
  }

  const clockPort = options.clockPort || createSystemClockPort();
  const intervalMs = assertNonNegativeInteger(
    typeof options.intervalMs === 'undefined' ? 1000 : options.intervalMs,
    'intervalMs',
  );
  const maxFrames = assertNonNegativeInteger(
    typeof options.frames === 'undefined' ? 0 : options.frames,
    'frames',
  );
  const continuous = maxFrames === 0;
  const initialDeltaMs = assertNonNegativeFinite(
    typeof options.initialDeltaMs === 'undefined' ? 0 : options.initialDeltaMs,
    'initialDeltaMs',
  );

  if (continuous && intervalMs === 0) {
    throw new Error('intervalMs must be greater than 0 when frames is 0.');
  }

  if (continuous) {
    let frameIndex = 0;
    let snapshot = await renderFrame(runtime, initialDeltaMs, onSnapshot);
    if (shouldContinue && !await shouldContinue(snapshot, frameIndex)) return;
    while (true) {
      await delay(clockPort, intervalMs);
      frameIndex += 1;
      snapshot = await renderFrame(runtime, intervalMs, onSnapshot);
      if (shouldContinue && !await shouldContinue(snapshot, frameIndex)) return;
    }
  }

  for (let frame = 0; frame < maxFrames; frame += 1) {
    await renderFrame(runtime, frame === 0 ? initialDeltaMs : intervalMs, onSnapshot);
    if (frame < maxFrames - 1) await delay(clockPort, intervalMs);
  }
}

module.exports = {
  runRuntimeLoop,
};
