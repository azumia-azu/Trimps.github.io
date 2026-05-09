const { getOwnDataValue, toNumber, toStringOrNull } = require('./helpers');

function getMode(globalState) {
  if (!globalState) return 'unknown';
  if (globalState.mapsActive) return 'map';
  return 'world';
}

function getCurrentCellIndex(globalState) {
  const key = globalState.mapsActive ? 'lastClearedMapCell' : 'lastClearedCell';
  return toNumber(getOwnDataValue(globalState, key), -1) + 1;
}

function getCellSnapshot(cell, index) {
  if (!cell) return null;
  const snapshot = {
    index,
    name: toStringOrNull(getOwnDataValue(cell, 'name')),
    level: toNumber(getOwnDataValue(cell, 'level'), 0),
    health: toNumber(getOwnDataValue(cell, 'health'), 0),
    maxHealth: toNumber(getOwnDataValue(cell, 'maxHealth'), 0),
    attack: toNumber(getOwnDataValue(cell, 'attack'), 0),
  };
  const mutation = toStringOrNull(getOwnDataValue(cell, 'mutation'));
  if (mutation) snapshot.mutation = mutation;
  const corrupted = toStringOrNull(getOwnDataValue(cell, 'corrupted'));
  if (corrupted) snapshot.corrupted = corrupted;
  return snapshot;
}

function getCurrentCellSnapshot(globalState) {
  const index = getCurrentCellIndex(globalState);
  const grid = globalState.mapsActive ? globalState.mapGridArray : globalState.gridArray;
  if (!Array.isArray(grid)) return null;
  return getCellSnapshot(grid[index], index);
}

function getCombatSnapshot(globalState) {
  const currentCell = getCurrentCellSnapshot(globalState);
  return {
    currentCell,
    currentEnemy: currentCell,
  };
}

module.exports = {
  getCellSnapshot,
  getCombatSnapshot,
  getCurrentCellSnapshot,
  getMode,
};
