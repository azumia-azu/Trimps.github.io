const { getOwnDataValue, toNumber, toStringOrNull } = require('./helpers');

function getOwnedMapSnapshot(globalState, map) {
  const id = toStringOrNull(getOwnDataValue(map, 'id'));
  return {
    id,
    name: toStringOrNull(getOwnDataValue(map, 'name')),
    location: toStringOrNull(getOwnDataValue(map, 'location')),
    level: toNumber(getOwnDataValue(map, 'level'), 0),
    size: toNumber(getOwnDataValue(map, 'size'), 0),
    difficulty: toNumber(getOwnDataValue(map, 'difficulty'), 0),
    loot: toNumber(getOwnDataValue(map, 'loot'), 0),
    clears: toNumber(getOwnDataValue(map, 'clears'), 0),
    noRecycle: Boolean(getOwnDataValue(map, 'noRecycle')),
    selected: Boolean(id && globalState.lookingAtMap === id),
    running: Boolean(id && globalState.currentMapId === id),
  };
}

function getOwnedMapsSnapshot(globalState) {
  if (!Array.isArray(globalState.mapsOwnedArray)) return [];
  return Array.from(globalState.mapsOwnedArray)
    .filter(Boolean)
    .map((map) => getOwnedMapSnapshot(globalState, map));
}

module.exports = {
  getOwnedMapSnapshot,
  getOwnedMapsSnapshot,
};
