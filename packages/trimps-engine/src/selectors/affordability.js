const { getOwnDataValue, getValue, toNumber } = require('./helpers');

function normalizePurchaseAmount(buyAmt) {
  if (buyAmt === 'Max') return 1;
  const amount = Number(buyAmt);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : 1;
}

function getOwnedResource(game, resourceName) {
  const resource = game.resources && game.resources[resourceName];
  return toNumber(getOwnDataValue(resource, 'owned'), 0);
}

function getCostAmount(cost, currentCount, amount) {
  if (typeof cost === 'function') {
    const dynamicCost = Number(cost());
    return Number.isFinite(dynamicCost) ? dynamicCost : Infinity;
  }

  if (Array.isArray(cost)) {
    const base = Number(cost[0]);
    const scale = Number(cost[1]);
    if (!Number.isFinite(base)) return Infinity;
    if (!Number.isFinite(scale)) return base * amount;
    if (scale === 1) return base * amount;
    return Math.floor((base * Math.pow(scale, currentCount)) * ((Math.pow(scale, amount) - 1) / (scale - 1)));
  }

  const fixedCost = Number(cost);
  return Number.isFinite(fixedCost) ? fixedCost * amount : Infinity;
}

function getPerkLevel(game, name) {
  const perk = game.portal && game.portal[name];
  if (!perk) return 0;
  if (game.global && game.global.universe === 2) return toNumber(getOwnDataValue(perk, 'radLevel'), 0);
  return toNumber(getOwnDataValue(perk, 'level'), 0);
}

function getPerkMultiplier(game, name) {
  const perk = game.portal && game.portal[name];
  const level = getPerkLevel(game, name);
  const modifier = toNumber(getOwnDataValue(perk, 'modifier'), 0);
  return level > 0 ? Math.pow(1 - modifier, level) : 1;
}

function getPriceMultiplier(game, itemType) {
  if (itemType === 'building') return getPerkMultiplier(game, 'Resourceful');
  if (itemType === 'equipment') return getPerkMultiplier(game, 'Artisanistry');
  return 1;
}

function getLargestFireableWorkerPool(game) {
  const jobs = game.jobs || {};
  return ['Farmer', 'Lumberjack', 'Miner'].reduce((largest, jobName) => {
    const owned = toNumber(getOwnDataValue(jobs[jobName], 'owned'), 0);
    return owned > largest ? owned : largest;
  }, 0);
}

function canAutoFireForJob(game, job) {
  const menu = game.options && game.options.menu;
  const fireForJobs = menu && menu.fireForJobs;
  return Boolean(getOwnDataValue(fireForJobs, 'enabled')) && Boolean(getOwnDataValue(job, 'allowAutoFire'));
}

function canAffordCost(game, item, options = {}) {
  if (!item || item.locked) return false;
  const costs = item.cost && (item.cost.resources || item.cost);
  if (!costs || typeof costs !== 'object') return true;
  const amount = normalizePurchaseAmount(options.buyAmt);
  const countKey = options.countKey || 'purchased';
  const currentCount = toNumber(getOwnDataValue(item, countKey), 0);
  const priceMultiplier = getPriceMultiplier(game, options.itemType);

  return Object.keys(costs).every((resourceName) => {
    const price = Math.ceil(getCostAmount(costs[resourceName], currentCount, amount) * priceMultiplier);
    return Number.isFinite(price) && getOwnedResource(game, resourceName) >= price;
  });
}

function canAffordJob(game, job, buyAmt) {
  let amount = normalizePurchaseAmount(buyAmt);
  const trimps = game.resources && game.resources.trimps;
  const owned = toNumber(getOwnDataValue(trimps, 'owned'), 0);
  const employed = toNumber(getValue(trimps, 'employed'), 0);
  const max = toNumber(getOwnDataValue(job, 'max'), Infinity);
  const currentOwned = toNumber(getOwnDataValue(job, 'owned'), 0);
  const remainingJobs = max - currentOwned;
  if (remainingJobs <= 0) return false;
  amount = Math.min(amount, remainingJobs);

  const freeTrimps = owned - employed;
  const fireableWorkers = canAutoFireForJob(game, job) ? getLargestFireableWorkerPool(game) : 0;
  if (fireableWorkers > 0) {
    if (freeTrimps + fireableWorkers < amount) return false;
  } else {
    amount = Math.min(amount, freeTrimps);
  }

  const workspaces = toNumber(getValue(game, 'workspaces'), Infinity);
  if (fireableWorkers === 0 && Number.isFinite(workspaces) && workspaces >= 0) {
    amount = Math.min(amount, workspaces);
  }

  return amount > 0 && canAffordCost(game, job, { buyAmt: amount, countKey: 'owned' });
}

module.exports = {
  canAffordCost,
  canAffordJob,
  canAutoFireForJob,
  getLargestFireableWorkerPool,
  getCostAmount,
  getPerkLevel,
  normalizePurchaseAmount,
};
