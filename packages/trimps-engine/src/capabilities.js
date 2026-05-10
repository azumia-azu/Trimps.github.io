const GATHER_CAPABILITIES = Object.freeze({
  buildings: true,
  food: true,
  metal: true,
  science: true,
  trimps: true,
  wood: true,
});

function itemCapability(item) {
  if (!item) return { available: false, reason: 'missing' };
  if (item.locked) return { available: false, reason: 'locked' };
  if (!item.canAfford) return { available: false, reason: 'cannot afford' };
  return { available: true, reason: null };
}

function keyedCapabilities(items, options = {}) {
  if (!Array.isArray(items)) return {};
  return items.reduce((capabilities, item) => {
    if (item && item.name) {
      capabilities[item.name] = options.pauseGame
        ? { available: false, reason: 'game paused' }
        : itemCapability(item);
    }
    return capabilities;
  }, {});
}

function findUpgrade(snapshot, name) {
  return Array.isArray(snapshot.upgrades)
    ? snapshot.upgrades.find((upgrade) => upgrade && upgrade.name === name)
    : null;
}

function getFightCapability(snapshot) {
  if (snapshot.pauseGame) return { available: false, reason: 'game paused' };
  const battle = findUpgrade(snapshot, 'Battle');
  if (!battle || !battle.done) {
    return { available: false, reason: 'Battle upgrade not unlocked' };
  }
  return { available: true, reason: null };
}

function getRunMapCapability(snapshot) {
  if (snapshot.pauseGame) return { available: false, reason: 'game paused' };
  if (!snapshot.mapsUnlocked) return { available: false, reason: 'maps not unlocked' };
  if (!Array.isArray(snapshot.ownedMaps) || snapshot.ownedMaps.length === 0) {
    return { available: false, reason: 'no owned maps' };
  }
  return { available: true, reason: null };
}

function getActionCapabilities(snapshot) {
  const safeSnapshot = snapshot || {};
  const pauseOptions = { pauseGame: Boolean(safeSnapshot.pauseGame) };
  return {
    load: { available: true, reason: null },
    save: { available: true, reason: null },
    gather: Object.assign({}, GATHER_CAPABILITIES),
    buyBuilding: keyedCapabilities(safeSnapshot.buildings, pauseOptions),
    buyJob: keyedCapabilities(safeSnapshot.jobs, pauseOptions),
    buyEquipment: keyedCapabilities(safeSnapshot.equipment, pauseOptions),
    buyUpgrade: keyedCapabilities(safeSnapshot.upgrades, pauseOptions),
    fight: getFightCapability(safeSnapshot),
    runMap: getRunMapCapability(safeSnapshot),
    setBuyAmount: { available: true, reason: null },
    toggleAutoFight: { available: true, reason: null },
    pauseFight: { available: true, reason: null },
  };
}

module.exports = {
  GATHER_CAPABILITIES,
  getActionCapabilities,
};
