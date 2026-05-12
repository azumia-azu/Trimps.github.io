const GATHER_RESOURCES = new Set(['food', 'wood', 'metal', 'science', 'buildings', 'trimps']);

const STABLE_ACTION_TYPES = new Set(['load', 'save', 'gather']);

const EXPERIMENTAL_ACTION_TYPES = new Set([
  'buyBuilding',
  'buyJob',
  'buyEquipment',
  'buyUpgrade',
  'fight',
  'pauseFight',
  'runMap',
  'setBuyAmount',
  'toggleAutoFight',
]);

const SUPPORTED_ACTION_TYPES = new Set([
  ...STABLE_ACTION_TYPES,
  ...EXPERIMENTAL_ACTION_TYPES,
]);

const ACTION_METADATA = {
  load: {
    stability: 'stable',
    description: 'Load a Trimps export save string through the legacy load() function.',
  },
  save: {
    stability: 'stable',
    description: 'Export current runtime state through the legacy save() function.',
  },
  gather: {
    stability: 'stable',
    description: 'Switch the current gathering resource through setGather().',
  },
  buyBuilding: {
    stability: 'experimental',
    description: 'Buy a legacy building by exact name.',
  },
  buyJob: {
    stability: 'experimental',
    description: 'Buy a legacy job by exact name.',
  },
  buyEquipment: {
    stability: 'experimental',
    description: 'Buy a legacy equipment item by exact name.',
  },
  buyUpgrade: {
    stability: 'experimental',
    description: 'Buy a legacy upgrade by exact name.',
  },
  fight: {
    stability: 'experimental',
    description: 'Enter or advance legacy fighting flow.',
  },
  pauseFight: {
    stability: 'experimental',
    description: 'Set or toggle the legacy pauseFight flag.',
  },
  runMap: {
    stability: 'experimental',
    description: 'Run an owned legacy map by exact id.',
  },
  setBuyAmount: {
    stability: 'experimental',
    description: 'Set the legacy global buy amount to a positive integer or Max.',
  },
  toggleAutoFight: {
    stability: 'experimental',
    description: 'Set or toggle the legacy autoFight/autoBattle state.',
  },
};

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

function normalizeBuyAmount(value) {
  if (value === 'Max') return 'Max';
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new Error(`setBuyAmount action requires a positive integer or "Max"; received ${String(value)}.`);
  }
  return normalized;
}

function resolvePurchaseAmount(context, explicitAmount) {
  if (typeof explicitAmount !== 'undefined' && explicitAmount !== null) {
    return normalizePositiveInteger(explicitAmount);
  }

  const buyAmt = getLegacyGlobal(context).buyAmt;
  return buyAmt === 'Max' ? 'Max' : normalizePositiveInteger(buyAmt);
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
    amount: resolvePurchaseAmount(context, action.amount),
    targetName,
  };
}

function buyLegacyJob(context, targetName, amount) {
  const global = getLegacyGlobal(context);
  if (global.firing) {
    throw new Error('buyJob action cannot run while firing mode is enabled.');
  }

  const previousBuyAmt = global.buyAmt;
  global.buyAmt = amount;
  try {
    return context.buyJob(targetName, true, true);
  } finally {
    global.buyAmt = previousBuyAmt;
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

function dispatchSetBuyAmountAction(context, action) {
  const global = getLegacyGlobal(context);
  const amount = normalizeBuyAmount(action.amount);
  global.buyAmt = amount;
  return global.buyAmt;
}

function dispatchToggleAutoFightAction(context, action) {
  const global = getLegacyGlobal(context);
  const enabled = typeof action.enabled === 'undefined' ? !Boolean(global.autoBattle) : Boolean(action.enabled);
  global.autoBattle = enabled;
  return Boolean(global.autoBattle);
}

function dispatchPauseFightAction(context, action) {
  const global = getLegacyGlobal(context);
  const paused = typeof action.paused === 'undefined' ? !Boolean(global.pauseFight) : Boolean(action.paused);
  global.pauseFight = paused;
  if (typeof context.pauseFight === 'function') context.pauseFight(true);
  return Boolean(global.pauseFight);
}

function dispatchBuyUpgradeAction(context, action) {
  assertLegacyFunction(context, 'buyUpgrade');
  if (typeof action.name !== 'string' || action.name.length === 0) {
    throw new Error('buyUpgrade action requires an exact upgrade name.');
  }
  const upgrade = lookupExactTarget(context, 'upgrades', action.name);
  if (upgrade && upgrade.locked) {
    throw new Error(`upgrades target is locked and cannot be purchased: ${action.name}`);
  }
  const result = context.buyUpgrade(action.name, true, true, action.heldCtrl);
  return Boolean(result);
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
      return purchase.amount === 'Max'
        ? context.buyBuilding(purchase.targetName, true, true)
        : context.buyBuilding(purchase.targetName, true, true, purchase.amount);
    }
    case 'buyEquipment': {
      const purchase = getValidatedPurchase(context, action, 'buyEquipment');
      return purchase.amount === 'Max'
        ? context.buyEquipment(purchase.targetName, true, true)
        : context.buyEquipment(purchase.targetName, true, true, purchase.amount);
    }
    case 'buyJob': {
      const purchase = getValidatedPurchase(context, action, 'buyJob');
      return buyLegacyJob(context, purchase.targetName, purchase.amount);
    }
    case 'buyUpgrade':
      return dispatchBuyUpgradeAction(context, action);
    case 'fight':
      return dispatchFightAction(context);
    case 'pauseFight':
      return dispatchPauseFightAction(context, action);
    case 'runMap':
      return dispatchRunMapAction(context, action);
    case 'setBuyAmount':
      return dispatchSetBuyAmountAction(context, action);
    case 'toggleAutoFight':
      return dispatchToggleAutoFightAction(context, action);
    default:
      throw new Error(`Unsupported runtime action: ${String(action.type)}`);
  }
}

module.exports = {
  ACTION_METADATA,
  ACTION_TARGETS,
  EXPERIMENTAL_ACTION_TYPES,
  GATHER_RESOURCES,
  STABLE_ACTION_TYPES,
  SUPPORTED_ACTION_TYPES,
  assertUnlocked,
  assertLegacyFunction,
  dispatchFightAction,
  dispatchBuyUpgradeAction,
  dispatchLegacyAction,
  dispatchPauseFightAction,
  dispatchRunMapAction,
  dispatchSetBuyAmountAction,
  dispatchToggleAutoFightAction,
  ensureFightTargetExists,
  getActionType,
  getLegacyGlobal,
  getValidatedPurchase,
  isPauseGameEnabled,
  lookupExactTarget,
  lookupOwnedMapById,
  normalizeMapId,
  normalizeBuyAmount,
  normalizePositiveInteger,
};
