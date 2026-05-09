const GATHER_RESOURCES = new Set(['food', 'wood', 'metal', 'science', 'buildings', 'trimps']);

const ACTION_TARGETS = {
  buyBuilding: { collection: 'buildings', legacyFunction: 'buyBuilding' },
  buyEquipment: { collection: 'equipment', legacyFunction: 'buyEquipment' },
  buyJob: { collection: 'jobs', legacyFunction: 'buyJob' },
};

function getActionType(action) {
  if (!action || typeof action !== 'object') throw new Error('Runtime action must be an object.');
  if (!action.type) throw new Error('Runtime action is missing a type.');
  return action.type;
}

function normalizePositiveInteger(value, defaultValue = 1) {
  const rawValue = typeof value === 'undefined' || value === null ? defaultValue : value;
  const normalized = Number(rawValue);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new Error(`Action amount must be a positive integer; received ${String(value)}.`);
  }
  return normalized;
}

function lookupExactTarget(context, collectionName, targetName) {
  if (typeof targetName !== 'string' || targetName.length === 0) {
    throw new Error(`${collectionName} action requires an exact target name.`);
  }

  const collection = context.game && context.game[collectionName];
  if (!collection || typeof collection !== 'object') {
    throw new Error(`Legacy game.${collectionName} is unavailable.`);
  }
  if (!Object.prototype.hasOwnProperty.call(collection, targetName)) {
    throw new Error(`Unknown ${collectionName} target: ${targetName}`);
  }
  return collection[targetName];
}

function assertUnlocked(collectionName, targetName, target) {
  if (target && target.locked) {
    throw new Error(`${collectionName} target is locked and cannot be purchased: ${targetName}`);
  }
}

function getValidatedPurchase(context, action, actionType) {
  const config = ACTION_TARGETS[actionType];
  if (typeof context[config.legacyFunction] !== 'function') {
    throw new Error(`Legacy ${config.legacyFunction}() is unavailable.`);
  }

  const targetName = action.name;
  const target = lookupExactTarget(context, config.collection, targetName);
  assertUnlocked(config.collection, targetName, target);

  return {
    amount: normalizePositiveInteger(action.amount),
    targetName,
  };
}

function buyLegacyJob(context, targetName, amount) {
  const previousBuyAmt = context.game.global.buyAmt;
  context.game.global.buyAmt = amount;
  try {
    return context.buyJob(targetName, true, true);
  } finally {
    context.game.global.buyAmt = previousBuyAmt;
  }
}

function getLegacyGlobal(context) {
  if (!context.game || !context.game.global) throw new Error('Legacy game.global is unavailable.');
  return context.game.global;
}

function isPauseGameEnabled(context) {
  return Boolean(context.game && context.game.options && context.game.options.menu && context.game.options.menu.pauseGame && context.game.options.menu.pauseGame.enabled);
}

function assertLegacyFunction(context, functionName) {
  if (typeof context[functionName] !== 'function') throw new Error(`Legacy ${functionName}() is unavailable.`);
}

function dispatchFightAction(context) {
  assertLegacyFunction(context, 'fightManual');
  const global = getLegacyGlobal(context);
  const battleUpgrade = context.game.upgrades && context.game.upgrades.Battle;
  if (!battleUpgrade || !battleUpgrade.done) {
    throw new Error('fight action requires the Battle upgrade to be unlocked.');
  }
  if (isPauseGameEnabled(context)) {
    throw new Error('fight action cannot run while pauseGame is enabled.');
  }
  if (Number(global.time) < 1000) {
    throw new Error('fight action cannot run before the first second of game time has elapsed.');
  }

  ensureFightTargetExists(context);

  const wasFighting = Boolean(global.fighting);
  context.fightManual();
  return {
    wasFighting,
    fighting: Boolean(global.fighting),
    mapsActive: Boolean(global.mapsActive),
    preMapsActive: Boolean(global.preMapsActive),
    currentMapId: global.currentMapId || '',
    lastClearedCell: global.lastClearedCell,
  };
}

function ensureFightTargetExists(context) {
  const global = getLegacyGlobal(context);
  const cellIndex = global.mapsActive ? global.lastClearedMapCell + 1 : global.lastClearedCell + 1;
  const gridName = global.mapsActive ? 'mapGridArray' : 'gridArray';
  const grid = global[gridName];
  if (Array.isArray(grid) && grid[cellIndex]) return;

  if (global.mapsActive) {
    throw new Error(`fight action requires an initialized map cell at index ${cellIndex}.`);
  }

  assertLegacyFunction(context, 'buildGrid');
  context.buildGrid();
  if (typeof context.drawGrid === 'function') context.drawGrid();
  if (!global.gridArray || !global.gridArray[cellIndex]) {
    throw new Error(`fight action could not initialize world cell at index ${cellIndex}.`);
  }
}

function normalizeMapId(id) {
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('runMap action requires a non-empty string id.');
  }
  return id;
}

function lookupOwnedMapById(context, id) {
  const global = getLegacyGlobal(context);
  if (!Array.isArray(global.mapsOwnedArray)) throw new Error('Legacy game.global.mapsOwnedArray is unavailable.');
  const map = global.mapsOwnedArray.find((candidate) => candidate && candidate.id === id);
  if (!map) throw new Error(`Unknown owned map id: ${id}`);
  return map;
}

function dispatchRunMapAction(context, action) {
  const id = normalizeMapId(action.id);
  assertLegacyFunction(context, 'mapsClicked');
  assertLegacyFunction(context, 'selectMap');
  assertLegacyFunction(context, 'runMap');

  const global = getLegacyGlobal(context);
  if (!global.mapsUnlocked) throw new Error('runMap action requires maps to be unlocked.');
  if (isPauseGameEnabled(context)) {
    throw new Error('runMap action cannot run while pauseGame is enabled.');
  }
  lookupOwnedMapById(context, id);

  if (!global.preMapsActive) context.mapsClicked(true);
  if (!global.preMapsActive) {
    throw new Error('runMap action could not enter the map chamber through legacy mapsClicked().');
  }

  context.selectMap(id, true);
  if (global.lookingAtMap !== id) {
    throw new Error(`runMap action could not select owned map id: ${id}`);
  }

  context.runMap();
  return {
    currentMapId: global.currentMapId || '',
    mapsActive: Boolean(global.mapsActive),
    preMapsActive: Boolean(global.preMapsActive),
    lookingAtMap: global.lookingAtMap || '',
  };
}

function dispatchLegacyAction(context, runtime, action) {
  switch (getActionType(action)) {
    case 'load': {
      const payload = typeof action.payload === 'undefined' ? action.save : action.payload;
      if (typeof payload !== 'string') throw new Error('load action requires a string payload.');
      return runtime.loadExport(payload);
    }
    case 'save':
      return runtime.exportSave();
    case 'gather': {
      if (!GATHER_RESOURCES.has(action.resource)) {
        throw new Error(`Unsupported gather resource: ${String(action.resource)}`);
      }
      if (typeof context.setGather !== 'function') throw new Error('Legacy setGather() is unavailable.');
      context.setGather(action.resource);
      return context.game.global.playerGathering;
    }
    case 'buyBuilding': {
      const purchase = getValidatedPurchase(context, action, 'buyBuilding');
      return context.buyBuilding(purchase.targetName, true, true, purchase.amount);
    }
    case 'buyEquipment': {
      const purchase = getValidatedPurchase(context, action, 'buyEquipment');
      return context.buyEquipment(purchase.targetName, true, true, purchase.amount);
    }
    case 'buyJob': {
      const purchase = getValidatedPurchase(context, action, 'buyJob');
      return buyLegacyJob(context, purchase.targetName, purchase.amount);
    }
    case 'fight':
      return dispatchFightAction(context);
    case 'runMap':
      return dispatchRunMapAction(context, action);
    default:
      throw new Error(`Unsupported runtime action: ${String(action.type)}`);
  }
}

module.exports = {
  ACTION_TARGETS,
  GATHER_RESOURCES,
  assertUnlocked,
  assertLegacyFunction,
  dispatchFightAction,
  dispatchLegacyAction,
  dispatchRunMapAction,
  ensureFightTargetExists,
  getLegacyGlobal,
  getValidatedPurchase,
  isPauseGameEnabled,
  lookupExactTarget,
  lookupOwnedMapById,
  normalizeMapId,
  normalizePositiveInteger,
};
