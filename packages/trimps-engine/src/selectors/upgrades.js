const { canAffordCost } = require('./affordability');
const { getItemEntries, getOwnDataValue, toNumber } = require('./helpers');

function getUpgradeSnapshot(game, name, upgrade) {
  const locked = Boolean(toNumber(getOwnDataValue(upgrade, 'locked'), 0));
  const done = Boolean(toNumber(getOwnDataValue(upgrade, 'done'), 0));
  const allowed = toNumber(getOwnDataValue(upgrade, 'allowed'), 0);
  return {
    name,
    locked,
    unlocked: !locked,
    done,
    allowed,
    canAfford: canAffordCost(game, upgrade, { buyAmt: 1, countKey: 'done' }),
  };
}

function getUpgradesSnapshot(game) {
  return getItemEntries(game.upgrades, (name, upgrade) => getUpgradeSnapshot(game, name, upgrade));
}

module.exports = {
  getUpgradeSnapshot,
  getUpgradesSnapshot,
};
