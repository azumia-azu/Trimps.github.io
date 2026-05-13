const GATHER_TARGETS = Object.freeze(['buildings', 'food', 'metal', 'science', 'trimps', 'wood']);

function availableCapability() {
  return { available: true, reason: null };
}

const GATHER_CAPABILITIES = Object.freeze(GATHER_TARGETS.reduce((capabilities, target) => {
  capabilities[target] = availableCapability();
  return capabilities;
}, {}));

function itemCapability(item) {
  if (!item) return { available: false, reason: 'missing' };
  if (item.locked) return { available: false, reason: 'locked' };
  if (!item.canAfford) return { available: false, reason: 'cannot afford' };
  return availableCapability();
}

function keyedCapabilities(items, options = {}) {
  if (!Array.isArray(items)) return {};
  return items.reduce((capabilities, item) => {
    if (item && item.name) {
      capabilities[item.name] = options.pauseGame
        ? { available: false, reason: 'game paused' }
        : options.disabledReason
          ? { available: false, reason: options.disabledReason }
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

function gatherCapability(snapshot, target) {
  if (snapshot.pauseGame) return { available: false, reason: 'game paused' };
  if (target === 'science' && snapshot.challenge === 'Scientist') {
    return { available: false, reason: 'blocked by Scientist challenge' };
  }
  if (target === 'metal' && snapshot.challenge === 'Transmute') {
    return { available: false, reason: 'blocked by Transmute challenge' };
  }
  return availableCapability();
}

function getGatherCapabilities(snapshot) {
  return GATHER_TARGETS.reduce((capabilities, target) => {
    capabilities[target] = gatherCapability(snapshot, target);
    return capabilities;
  }, {});
}

function getFightCapability(snapshot) {
  if (snapshot.pauseGame) return { available: false, reason: 'game paused' };
  const battle = findUpgrade(snapshot, 'Battle');
  if (!battle || !battle.done) {
    return { available: false, reason: 'Battle upgrade not unlocked' };
  }
  const gameTime = Number(snapshot.time);
  if (!Number.isFinite(gameTime) || gameTime < 1000) {
    return { available: false, reason: 'first second not elapsed' };
  }
  return availableCapability();
}

function getRunMapCapability(snapshot) {
  if (snapshot.pauseGame) return { available: false, reason: 'game paused' };
  if (!snapshot.mapsUnlocked) return { available: false, reason: 'maps not unlocked' };
  if (!Array.isArray(snapshot.ownedMaps) || snapshot.ownedMaps.length === 0) {
    return { available: false, reason: 'no owned maps' };
  }
  const mapologyCredits = Number(snapshot.mapologyCredits);
  if (snapshot.challenge === 'Mapology' && !snapshot.currentMapId && (!Number.isFinite(mapologyCredits) || mapologyCredits < 1)) {
    return { available: false, reason: 'no map credits' };
  }
  return availableCapability();
}

function getActionCapabilities(snapshot) {
  const safeSnapshot = snapshot || {};
  const pauseOptions = { pauseGame: Boolean(safeSnapshot.pauseGame) };
  const jobOptions = {
    pauseGame: Boolean(safeSnapshot.pauseGame),
    disabledReason: safeSnapshot.firing ? 'firing mode enabled' : null,
  };
  return {
    load: { available: true, reason: null },
    save: { available: true, reason: null },
    gather: getGatherCapabilities(safeSnapshot),
    buyBuilding: keyedCapabilities(safeSnapshot.buildings, pauseOptions),
    buyJob: keyedCapabilities(safeSnapshot.jobs, jobOptions),
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
  GATHER_TARGETS,
  getActionCapabilities,
};
