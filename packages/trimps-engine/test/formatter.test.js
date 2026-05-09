const assert = require('node:assert/strict');
const test = require('node:test');

const {
  formatClock,
  formatNumber,
  formatPercent,
  formatResource,
} = require('../src/formatter');

test('formats numbers for shared CLI and TUI display', () => {
  assert.equal(formatNumber(null), 'n/a');
  assert.equal(formatNumber(undefined), 'n/a');
  assert.equal(formatNumber(12), '12');
  assert.equal(formatNumber(12.34567), '12.346');
  assert.equal(formatNumber(1200), '1.20K');
  assert.equal(formatNumber(1200000), '1.20M');
  assert.equal(formatNumber(1200000000), '1.200e+9');
  assert.equal(formatNumber(0.0012), '1.200e-3');
  assert.equal(formatNumber(Number.POSITIVE_INFINITY), 'Infinity');
});

test('formats resources with safe defaults', () => {
  assert.equal(formatResource('Food', { owned: 12, max: 500 }), 'Food: 12 / 500');
  assert.equal(formatResource('Science', { owned: 1200, max: null }), 'Science: 1.20K');
  assert.equal(formatResource('Trimps', null), 'Trimps: 0');
});

test('formats resource percentages', () => {
  assert.equal(formatPercent(null), '0%');
  assert.equal(formatPercent({ owned: 25, max: 100 }), '25%');
  assert.equal(formatPercent({ owned: 125, max: 100 }), '100%');
  assert.equal(formatPercent({ owned: -5, max: 100 }), '0%');
});

test('formats clocks from seconds', () => {
  assert.equal(formatClock(null), 'n/a');
  assert.equal(formatClock(0), '00:00:00:00');
  assert.equal(formatClock(61.9), '00:00:01:01');
  assert.equal(formatClock(90061), '01:01:01:01');
});
