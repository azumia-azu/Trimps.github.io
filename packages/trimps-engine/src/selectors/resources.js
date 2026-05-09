const { addNumberField, getOwnDataValue, toNullableNumber, toNumber } = require('./helpers');

function getResourceSnapshot(resource) {
  if (!resource) return { owned: 0, max: null };
  return {
    owned: toNumber(getOwnDataValue(resource, 'owned'), 0),
    max: toNullableNumber(getOwnDataValue(resource, 'max')),
  };
}

function getTrimpsSnapshot(trimps) {
  const snapshot = getResourceSnapshot(trimps);
  if (!trimps) return snapshot;

  addNumberField(snapshot, trimps, 'working');
  addNumberField(snapshot, trimps, 'soldiers');
  addNumberField(snapshot, trimps, 'maxSoldiers');
  addNumberField(snapshot, trimps, 'potency');
  addNumberField(snapshot, trimps, 'speed');
  addNumberField(snapshot, trimps, 'employed');
  return snapshot;
}

function getResourcesSnapshot(resources = {}) {
  return {
    food: getResourceSnapshot(resources.food),
    wood: getResourceSnapshot(resources.wood),
    metal: getResourceSnapshot(resources.metal),
    science: getResourceSnapshot(resources.science),
    trimps: getTrimpsSnapshot(resources.trimps),
  };
}

module.exports = {
  getResourceSnapshot,
  getResourcesSnapshot,
  getTrimpsSnapshot,
};
