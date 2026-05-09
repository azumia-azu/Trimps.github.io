function formatNumber(value) {
  if (value === null || typeof value === 'undefined') return 'n/a';
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value);
  const absolute = Math.abs(numericValue);
  if (absolute >= 1000000000) return numericValue.toExponential(3);
  if (absolute >= 1000000) return `${(numericValue / 1000000).toFixed(2)}M`;
  if (absolute >= 1000) return `${(numericValue / 1000).toFixed(2)}K`;
  if (absolute > 0 && absolute < 0.01) return numericValue.toExponential(3);
  return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(3);
}

function formatResource(label, resource) {
  const safeResource = resource || { owned: 0, max: null };
  const max = safeResource.max === null || typeof safeResource.max === 'undefined' ? '' : ` / ${formatNumber(safeResource.max)}`;
  return `${label}: ${formatNumber(safeResource.owned)}${max}`;
}

function formatPercent(resource) {
  if (!resource || !resource.max || resource.max <= 0) return '0%';
  const percent = Math.max(0, Math.min(100, (Number(resource.owned) / Number(resource.max)) * 100));
  return `${percent.toFixed(0)}%`;
}

function padClockPart(value) {
  const text = String(value);
  return text.length < 2 ? `0${text}` : text;
}

function formatClock(seconds) {
  if (seconds === null || typeof seconds === 'undefined') return 'n/a';
  const numericSeconds = Number(seconds);
  if (!Number.isFinite(numericSeconds)) return String(seconds);
  const wholeSeconds = Math.max(0, Math.floor(numericSeconds));
  const days = Math.floor(wholeSeconds / 86400);
  const hours = Math.floor(wholeSeconds / 3600) % 24;
  const minutes = Math.floor(wholeSeconds / 60) % 60;
  const remainingSeconds = wholeSeconds % 60;
  return [days, hours, minutes, remainingSeconds].map(padClockPart).join(':');
}

module.exports = {
  formatClock,
  formatNumber,
  formatPercent,
  formatResource,
};
