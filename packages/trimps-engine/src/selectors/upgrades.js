const { canAffordCost } = require('./affordability');
const { getItemEntries, getOwnDataValue, getValue, toNumber } = require('./helpers');

function canAffordCoordinationTrimps(game) {
  const trimps = game.resources && game.resources.trimps;
  if (!trimps) return false;

  if (game.global && game.global.challengeActive === 'Trappapalooza') {
    const owned = toNumber(getOwnDataValue(trimps, 'owned'), 0);
    const employed = toNumber(getValue(trimps, 'employed'), 0);
    const currentSend = typeof trimps.getCurrentSend === 'function'
      ? toNumber(trimps.getCurrentSend(), 0)
      : toNumber(getOwnDataValue(trimps, 'maxSoldiers'), 0);
    return owned - employed >= Math.ceil(currentSend * 0.25);
  }

  const realMax = typeof trimps.realMax === 'function'
    ? toNumber(trimps.realMax(), 0)
    : toNumber(getOwnDataValue(trimps, 'max'), 0);
  const currentSend = typeof trimps.getCurrentSend === 'function'
    ? toNumber(trimps.getCurrentSend(), 0)
    : toNumber(getOwnDataValue(trimps, 'maxSoldiers'), 0);
  return realMax >= currentSend * 3;
}

function passesSpecialFilter(upgrade) {
  if (!upgrade || typeof upgrade.specialFilter !== 'function') return true;
  return Boolean(upgrade.specialFilter());
}

function getUpgradeSnapshot(game, name, upgrade) {
  const locked = Boolean(toNumber(getOwnDataValue(upgrade, 'locked'), 0));
  const done = Boolean(toNumber(getOwnDataValue(upgrade, 'done'), 0));
  const allowed = toNumber(getOwnDataValue(upgrade, 'allowed'), 0);
  let canAfford = passesSpecialFilter(upgrade) && canAffordCost(game, upgrade, { buyAmt: 1, countKey: 'done' });
  if (name === 'Coordination') canAfford = canAfford && canAffordCoordinationTrimps(game);
  return {
    name,
    locked,
    unlocked: !locked,
    done,
    allowed,
    canAfford,
  };
}

function getUpgradesSnapshot(game) {
  return getItemEntries(game.upgrades, (name, upgrade) => getUpgradeSnapshot(game, name, upgrade));
}

module.exports = {
  canAffordCoordinationTrimps,
  getUpgradeSnapshot,
  getUpgradesSnapshot,
  passesSpecialFilter,
};
