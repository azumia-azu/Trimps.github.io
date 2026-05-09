function getOwnDataValue(source, key) {
  if (!source || !Object.prototype.hasOwnProperty.call(source, key)) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  return descriptor && Object.prototype.hasOwnProperty.call(descriptor, 'value') ? descriptor.value : undefined;
}

function toNumber(value, fallback) {
  if (typeof value === 'undefined' || value === null || value === '') return fallback;
  const numericValue = Number(value);
  return Number.isNaN(numericValue) ? fallback : numericValue;
}

function toNullableNumber(value) {
  if (typeof value === 'undefined' || value === null || value === -1) return null;
  return toNumber(value, null);
}

function toStringOrNull(value) {
  if (typeof value === 'undefined' || value === null || value === '') return null;
  return String(value);
}

function addNumberField(target, source, key) {
  const value = getOwnDataValue(source, key);
  if (typeof value !== 'undefined') target[key] = toNumber(value, 0);
}

function addStringField(target, source, key) {
  const value = getOwnDataValue(source, key);
  if (typeof value !== 'undefined' && value !== null && value !== '') target[key] = String(value);
}

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
  return snapshot;
}

function getMode(globalState) {
  if (!globalState) return 'unknown';
  if (globalState.mapsActive) return 'map';
  return 'world';
}

function getItemEntries(collection, createItemSnapshot) {
  if (!collection) return [];
  return Object.keys(collection).map((name) => createItemSnapshot(name, collection[name]));
}

function getBuildingSnapshot(name, building) {
  const snapshot = {
    name,
    locked: Boolean(toNumber(getOwnDataValue(building, 'locked'), 0)),
    owned: toNumber(getOwnDataValue(building, 'owned'), 0),
    purchased: toNumber(getOwnDataValue(building, 'purchased'), 0),
  };

  addNumberField(snapshot, building, 'craftTime');
  return snapshot;
}

function getJobSnapshot(name, job) {
  const snapshot = {
    name,
    locked: Boolean(toNumber(getOwnDataValue(job, 'locked'), 0)),
    owned: toNumber(getOwnDataValue(job, 'owned'), 0),
    modifier: toNumber(getOwnDataValue(job, 'modifier'), 0),
  };

  addNumberField(snapshot, job, 'max');
  addStringField(snapshot, job, 'increase');
  return snapshot;
}

function getEquipmentSnapshot(name, equipment) {
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
  return snapshot;
}

function getMessagePreferences(messages) {
  if (!messages) return {};
  return Object.keys(messages).reduce((preferences, channelName) => {
    const channel = messages[channelName];
    if (!channel || typeof channel !== 'object') return preferences;

    preferences[channelName] = Object.keys(channel).reduce((channelPreferences, preferenceName) => {
      const value = getOwnDataValue(channel, preferenceName);
      if (typeof value === 'boolean') channelPreferences[preferenceName] = value;
      else if (typeof value === 'number') channelPreferences[preferenceName] = value;
      else if (typeof value === 'string') channelPreferences[preferenceName] = value;
      else if (value === null) channelPreferences[preferenceName] = null;
      return channelPreferences;
    }, {});

    return preferences;
  }, {});
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.keys(value).forEach((key) => deepFreeze(value[key]));
  return value;
}

function createSnapshot(game) {
  const globalState = game.global || {};
  const resources = game.resources || {};
  const snapshot = {
    world: globalState.world,
    lastClearedCell: globalState.lastClearedCell,
    lastClearedMapCell: toNumber(getOwnDataValue(globalState, 'lastClearedMapCell'), -1),
    currentMapId: toStringOrNull(getOwnDataValue(globalState, 'currentMapId')),
    lookingAtMap: toStringOrNull(getOwnDataValue(globalState, 'lookingAtMap')),
    pauseFight: Boolean(getOwnDataValue(globalState, 'pauseFight')),
    mapsActive: Boolean(globalState.mapsActive),
    fighting: Boolean(globalState.fighting),
    mode: getMode(globalState),
    challenge: toStringOrNull(getOwnDataValue(globalState, 'challengeActive')),
    selectedChallenge: toStringOrNull(getOwnDataValue(globalState, 'selectedChallenge')),
    resources: {
      food: getResourceSnapshot(resources.food),
      wood: getResourceSnapshot(resources.wood),
      metal: getResourceSnapshot(resources.metal),
      science: getResourceSnapshot(resources.science),
      trimps: getTrimpsSnapshot(resources.trimps),
    },
    buildings: getItemEntries(game.buildings, getBuildingSnapshot),
    jobs: getItemEntries(game.jobs, getJobSnapshot),
    equipment: getItemEntries(game.equipment, getEquipmentSnapshot),
    messages: [],
    messagePreferences: getMessagePreferences(globalState.messages),
  };

  return deepFreeze(snapshot);
}

module.exports = {
  createSnapshot,
  getResourceSnapshot,
};
