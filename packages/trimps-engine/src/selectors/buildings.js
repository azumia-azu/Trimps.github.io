const { canAffordCost, canAffordJob } = require('./affordability');
const { addNumberField, addStringField, getItemEntries, getOwnDataValue, toNumber } = require('./helpers');

function canAffordAntenna(game, purchased) {
  const highestRadonLevelCleared = toNumber(getOwnDataValue(game.global, 'highestRadonLevelCleared'), 0);
  return purchased + 1 <= Math.floor((highestRadonLevelCleared - 100) / 5);
}

function getBuildingSnapshot(game, name, building) {
  const snapshot = {
    name,
    locked: Boolean(toNumber(getOwnDataValue(building, 'locked'), 0)),
    owned: toNumber(getOwnDataValue(building, 'owned'), 0),
    purchased: toNumber(getOwnDataValue(building, 'purchased'), 0),
  };

  addNumberField(snapshot, building, 'craftTime');
  snapshot.canAfford = name !== 'Hub'
    && (name !== 'Antenna' || canAffordAntenna(game, snapshot.purchased))
    && canAffordCost(game, building, {
      buyAmt: game.global && game.global.buyAmt,
      countKey: 'purchased',
      itemType: 'building',
    });
  return snapshot;
}

function getJobSnapshot(game, name, job) {
  const snapshot = {
    name,
    locked: Boolean(toNumber(getOwnDataValue(job, 'locked'), 0)),
    owned: toNumber(getOwnDataValue(job, 'owned'), 0),
    modifier: toNumber(getOwnDataValue(job, 'modifier'), 0),
  };

  addNumberField(snapshot, job, 'max');
  addStringField(snapshot, job, 'increase');
  const challengeActive = game.global && game.global.challengeActive;
  snapshot.canAfford = name !== 'Amalgamator'
    && !(name === 'Scientist' && challengeActive === 'Scientist')
    && canAffordJob(game, job, game.global && game.global.buyAmt);
  return snapshot;
}

function getEquipmentSnapshot(game, name, equipment) {
  const snapshot = {
    name,
    locked: Boolean(toNumber(getOwnDataValue(equipment, 'locked'), 0)),
    level: toNumber(getOwnDataValue(equipment, 'level'), 0),
    modifier: toNumber(getOwnDataValue(equipment, 'modifier'), 0),
  };

  addNumberField(snapshot, equipment, 'prestige');
  addNumberField(snapshot, equipment, 'attack');
  addNumberField(snapshot, equipment, 'attackCalculated');
  addNumberField(snapshot, equipment, 'health');
  addNumberField(snapshot, equipment, 'healthCalculated');
  addNumberField(snapshot, equipment, 'block');
  addNumberField(snapshot, equipment, 'blockCalculated');
  snapshot.canAfford = canAffordCost(game, equipment, {
    buyAmt: game.global && game.global.buyAmt,
    countKey: 'level',
    itemType: 'equipment',
  });
  return snapshot;
}

function getBuildQueueSnapshot(buildingsQueue) {
  if (!Array.isArray(buildingsQueue)) return [];
  return Array.from(buildingsQueue).map((raw) => {
    const [item, remaining] = String(raw).split('.');
    return {
      item,
      remaining: toNumber(remaining, 0),
      raw: String(raw),
    };
  });
}

function getPurchasableSnapshots(game) {
  return {
    buildings: getItemEntries(game.buildings, (name, building) => getBuildingSnapshot(game, name, building)),
    jobs: getItemEntries(game.jobs, (name, job) => getJobSnapshot(game, name, job)),
    equipment: getItemEntries(game.equipment, (name, equipment) => getEquipmentSnapshot(game, name, equipment)),
    buildQueue: getBuildQueueSnapshot(game.global && game.global.buildingsQueue),
  };
}

module.exports = {
  canAffordAntenna,
  getBuildQueueSnapshot,
  getBuildingSnapshot,
  getEquipmentSnapshot,
  getJobSnapshot,
  getPurchasableSnapshots,
};
