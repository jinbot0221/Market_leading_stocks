const DEFAULT_INTERVAL = 60_000;

function getKstClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

function isRecordingHours(now = new Date()) {
  const { hour, minute } = getKstClock(now);
  return hour >= 8 && (hour < 20 || (hour === 20 && minute === 0));
}

function createMarketRecorder({ store, fetchPrices, symbols, intervalMs = DEFAULT_INTERVAL }) {
  let timer;
  let running = false;
  const status = { state: 'waiting', lastRecordedAt: null, lastError: null, intervalMs };

  async function tick(now = new Date()) {
    if (running) return;
    if (!isRecordingHours(now)) {
      status.state = 'outside-hours';
      return;
    }
    running = true;
    status.state = 'recording';
    try {
      const data = await fetchPrices(symbols);
      if (data.mode !== 'live') {
        status.state = 'credentials-required';
        return;
      }
      const clock = getKstClock(now);
      store.save({ date: clock.date, time: clock.time, capturedAt: new Date().toISOString(), prices: data.result });
      status.lastRecordedAt = new Date().toISOString();
      status.lastError = null;
    } catch (error) {
      status.state = 'error';
      status.lastError = error.message;
    } finally {
      running = false;
    }
  }

  function start() {
    tick();
    timer = setInterval(tick, intervalMs);
    timer.unref?.();
  }

  function stop() {
    clearInterval(timer);
  }

  return { start, stop, tick, getStatus: () => ({ ...status, activeHours: '08:00-20:00 KST' }) };
}

module.exports = { createMarketRecorder, getKstClock, isRecordingHours };
