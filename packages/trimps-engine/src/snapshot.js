function getResourceSnapshot(resource) {
  if (!resource) return { owned: 0, max: null };
  return {
    owned: Number(resource.owned || 0),
    max: typeof resource.max === 'undefined' || resource.max === -1 ? null : Number(resource.max || 0),
  };
}

function getMode(globalState) {
  if (globalState.mapsActive) return 'map';
  return 'world';
}

function createSnapshot(game) {
  const resources = game.resources || {};
  const snapshot = {
    world: game.global.world,
    lastClearedCell: game.global.lastClearedCell,
    mapsActive: Boolean(game.global.mapsActive),
    fighting: Boolean(game.global.fighting),
    mode: getMode(game.global),
    resources: {
      food: getResourceSnapshot(resources.food),
      wood: getResourceSnapshot(resources.wood),
      metal: getResourceSnapshot(resources.metal),
      science: getResourceSnapshot(resources.science),
      trimps: getResourceSnapshot(resources.trimps),
    },
  };

  if (game.global.challengeActive) snapshot.challenge = game.global.challengeActive;
  return snapshot;
}

module.exports = {
  createSnapshot,
  getResourceSnapshot,
};
