const { getPurchasableSnapshots } = require('./selectors/buildings');
const { getCombatSnapshot, getMode } = require('./selectors/combat');
const {
  deepFreeze,
  getOwnDataValue,
  toNumber,
  toStringOrNull,
} = require('./selectors/helpers');
const { getOwnedMapsSnapshot } = require('./selectors/maps');
const { getResourcesSnapshot, getResourceSnapshot } = require('./selectors/resources');
const { getUpgradesSnapshot } = require('./selectors/upgrades');

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

function createSnapshot(game) {
  const globalState = game.global || {};
  const mapologyChallenge = game.challenges && game.challenges.Mapology;
  const pauseGameOption = game.options && game.options.menu && game.options.menu.pauseGame;
  const purchasables = getPurchasableSnapshots(game);
  const combat = getCombatSnapshot(globalState);
  const snapshot = {
    world: globalState.world,
    time: toNumber(getOwnDataValue(globalState, 'time'), 0),
    lastClearedCell: globalState.lastClearedCell,
    lastClearedMapCell: toNumber(getOwnDataValue(globalState, 'lastClearedMapCell'), -1),
    currentMapId: toStringOrNull(getOwnDataValue(globalState, 'currentMapId')),
    lookingAtMap: toStringOrNull(getOwnDataValue(globalState, 'lookingAtMap')),
    playerGathering: toStringOrNull(getOwnDataValue(globalState, 'playerGathering')) || '',
    buyAmt: getOwnDataValue(globalState, 'buyAmt'),
    autoFight: Boolean(getOwnDataValue(globalState, 'autoBattle') || getOwnDataValue(globalState, 'autoFight')),
    mapsUnlocked: Boolean(getOwnDataValue(globalState, 'mapsUnlocked')),
    preMapsActive: Boolean(getOwnDataValue(globalState, 'preMapsActive')),
    pauseFight: Boolean(getOwnDataValue(globalState, 'pauseFight')),
    pauseGame: Boolean(pauseGameOption && pauseGameOption.enabled),
    mapsActive: Boolean(globalState.mapsActive),
    fighting: Boolean(globalState.fighting),
    mode: getMode(globalState),
    challenge: toStringOrNull(getOwnDataValue(globalState, 'challengeActive')),
    selectedChallenge: toStringOrNull(getOwnDataValue(globalState, 'selectedChallenge')),
    mapologyCredits: toNumber(getOwnDataValue(mapologyChallenge, 'credits'), 0),
    resources: getResourcesSnapshot(game.resources),
    buildings: purchasables.buildings,
    jobs: purchasables.jobs,
    equipment: purchasables.equipment,
    upgrades: getUpgradesSnapshot(game),
    ownedMaps: getOwnedMapsSnapshot(globalState),
    currentCell: combat.currentCell,
    currentEnemy: combat.currentEnemy,
    buildQueue: purchasables.buildQueue,
    messages: [],
    messagePreferences: getMessagePreferences(globalState.messages),
  };

  return deepFreeze(snapshot);
}

module.exports = {
  createSnapshot,
  getResourceSnapshot,
};
