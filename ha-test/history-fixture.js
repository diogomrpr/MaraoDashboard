// Safe synthetic Recorder-shaped series, shared by local chart/browser fixtures.
function historyFixtures(end = Date.parse('2026-10-18T12:00:00Z')) {
  const record = (seconds, state, unit = 'W') => ({ state: String(state), last_updated: new Date(end - seconds * 1000).toISOString(), attributes: {unit_of_measurement: unit, state_class: 'measurement'} });
  return {
    dense: Array.from({length: 12001}, (_, index) => record(12000-index, index === 6027 ? 9876.54321 : 15 + index % 7)),
    gap: [record(3600, 12), record(2400, 'unavailable'), record(1800, 'unknown'), record(1200, 28), record(0, 20)],
    single: [record(600, 21.12345)], empty: [],
    counter: [record(3600, 12, 'kWh'), record(2400, 15, 'kWh'), record(1200, 0, 'kWh'), record(0, 2, 'kWh')],
  };
}
module.exports = { historyFixtures };
