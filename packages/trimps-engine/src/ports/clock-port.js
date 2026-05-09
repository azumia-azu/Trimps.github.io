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
  let nextTimerId = 1;
  const timers = new Map();

  function normalizeDelay(delayMs) {
    const normalized = Number(delayMs || 0);
    if (!Number.isFinite(normalized)) throw new Error('timer delay must be a finite millisecond value.');
    return Math.max(0, normalized);
  }

  function scheduleTimer(callback, delayMs, args, interval) {
    if (typeof callback !== 'function') throw new Error('timer callback must be a function.');
    const delay = normalizeDelay(delayMs);
    const timerId = nextTimerId;
    nextTimerId += 1;
    timers.set(timerId, {
      args,
      callback,
      dueAt: currentMs + delay,
      interval,
      intervalMs: interval ? Math.max(1, delay) : 0,
    });
    return timerId;
  }

  function runDueTimers() {
    while (true) {
      const dueTimers = Array.from(timers.entries())
        .filter(([, timer]) => timer.dueAt <= currentMs)
        .sort(([, left], [, right]) => left.dueAt - right.dueAt);
      if (dueTimers.length === 0) return;

      for (const [timerId, timer] of dueTimers) {
        if (!timers.has(timerId)) continue;
        if (timer.interval) {
          timer.dueAt += timer.intervalMs;
        } else {
          timers.delete(timerId);
        }
        timer.callback(...timer.args);
      }
    }
  }

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
      runDueTimers();
      return currentMs;
    },
    set(valueMs) {
      currentMs = assertFiniteMilliseconds(valueMs, 'valueMs');
      runDueTimers();
      return currentMs;
    },
    setTimeout(callback, delayMs, ...args) {
      return scheduleTimer(callback, delayMs, args, false);
    },
    clearTimeout(timerId) {
      timers.delete(timerId);
    },
    setInterval(callback, delayMs, ...args) {
      return scheduleTimer(callback, delayMs, args, true);
    },
    clearInterval(timerId) {
      timers.delete(timerId);
    },
  };
}

module.exports = {
  createManualClockPort,
  createSystemClockPort,
};
