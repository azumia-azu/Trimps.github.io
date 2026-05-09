function assertFiniteMilliseconds(value, label) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) throw new Error(`${label} must be a finite millisecond value.`);
  return numericValue;
}

function createSystemClockPort() {
  const startedAt = Date.now();
  return {
    now() {
      return Date.now();
    },
    performanceNow() {
      return Date.now() - startedAt;
    },
    setTimeout(callback, delayMs, ...args) {
      return setTimeout(callback, delayMs, ...args);
    },
    clearTimeout(timerId) {
      clearTimeout(timerId);
    },
    setInterval(callback, delayMs, ...args) {
      return setInterval(callback, delayMs, ...args);
    },
    clearInterval(timerId) {
      clearInterval(timerId);
    },
  };
}

function createManualClockPort(startMs = 0) {
  let currentMs = assertFiniteMilliseconds(startMs, 'startMs');
  const startedAt = currentMs;
  return {
    now() {
      return currentMs;
    },
    performanceNow() {
      return currentMs - startedAt;
    },
    advance(deltaMs) {
      const normalizedDelta = assertFiniteMilliseconds(deltaMs, 'deltaMs');
      currentMs += normalizedDelta;
      return currentMs;
    },
    set(valueMs) {
      currentMs = assertFiniteMilliseconds(valueMs, 'valueMs');
      return currentMs;
    },
    setTimeout() {
      return 0;
    },
    clearTimeout() {},
    setInterval() {
      return 0;
    },
    clearInterval() {},
  };
}

module.exports = {
  createManualClockPort,
  createSystemClockPort,
};
