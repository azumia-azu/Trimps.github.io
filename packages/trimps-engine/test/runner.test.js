const assert = require('node:assert/strict');
const test = require('node:test');

const { runRuntimeLoop } = require('../src/runner');

function createRuntimeStub() {
  const ticks = [];
  return {
    ticks,
    tick(deltaMs) {
      ticks.push(deltaMs);
      return ticks.length;
    },
    snapshot() {
      return { ticks: ticks.slice() };
    },
  };
}

test('runtime runner advances finite frames through the engine loop', async () => {
  const runtime = createRuntimeStub();
  const delays = [];
  const frames = [];
  const clockPort = {
    setTimeout(callback, delayMs) {
      delays.push(delayMs);
      callback();
      return delays.length;
    },
    clearTimeout() {},
  };

  await runRuntimeLoop({
    runtime,
    clockPort,
    initialDeltaMs: 1000,
    intervalMs: 250,
    frames: 3,
    onSnapshot(snapshot) {
      frames.push(snapshot.ticks[snapshot.ticks.length - 1]);
    },
  });

  assert.deepEqual(runtime.ticks, [1000, 250, 250]);
  assert.deepEqual(delays, [250, 250]);
  assert.deepEqual(frames, [1000, 250, 250]);
});

test('runtime runner validates loop options', async () => {
  await assert.rejects(
    () => runRuntimeLoop({ runtime: createRuntimeStub(), intervalMs: -1 }),
    /intervalMs must be a non-negative integer/,
  );
  await assert.rejects(
    () => runRuntimeLoop({ runtime: createRuntimeStub(), frames: -1 }),
    /frames must be a non-negative integer/,
  );
});
