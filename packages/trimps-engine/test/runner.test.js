const assert = require('node:assert/strict');
const test = require('node:test');

const { createManualClockPort } = require('../src/ports/clock-port');
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

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
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

test('runtime runner can be driven by manual clock timers', async () => {
  const runtime = createRuntimeStub();
  const clockPort = createManualClockPort();
  const frames = [];
  const loop = runRuntimeLoop({
    runtime,
    clockPort,
    intervalMs: 250,
    frames: 3,
    onSnapshot(snapshot) {
      frames.push(snapshot.ticks[snapshot.ticks.length - 1]);
    },
  });

  await flushPromises();
  assert.deepEqual(runtime.ticks, [0]);

  clockPort.advance(250);
  await flushPromises();
  assert.deepEqual(runtime.ticks, [0, 250]);

  clockPort.advance(250);
  await loop;

  assert.deepEqual(runtime.ticks, [0, 250, 250]);
  assert.deepEqual(frames, [0, 250, 250]);
});

test('runtime runner can stop continuous mode through shouldContinue', async () => {
  const runtime = createRuntimeStub();
  const delays = [];
  const shouldContinueCalls = [];
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
    frames: 0,
    shouldContinue(snapshot, frameIndex) {
      shouldContinueCalls.push({ frameIndex, latestTick: snapshot.ticks[snapshot.ticks.length - 1] });
      return frameIndex < 2;
    },
  });

  assert.deepEqual(runtime.ticks, [1000, 250, 250]);
  assert.deepEqual(delays, [250, 250]);
  assert.deepEqual(shouldContinueCalls, [
    { frameIndex: 0, latestTick: 1000 },
    { frameIndex: 1, latestTick: 250 },
    { frameIndex: 2, latestTick: 250 },
  ]);
});

test('runtime runner rejects when onSnapshot throws', async () => {
  const runtime = createRuntimeStub();

  await assert.rejects(
    () => runRuntimeLoop({
      runtime,
      frames: 1,
      onSnapshot() {
        throw new Error('render failed');
      },
    }),
    /render failed/,
  );
  assert.deepEqual(runtime.ticks, [0]);
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
  await assert.rejects(
    () => runRuntimeLoop({
      runtime: createRuntimeStub(),
      frames: 0,
      intervalMs: 0,
      onSnapshot() {
        throw new Error('loop started despite zero interval');
      },
    }),
    /intervalMs must be greater than 0 when frames is 0/,
  );
});
