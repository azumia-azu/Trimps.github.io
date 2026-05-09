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
      throw new Error('fight is not yet exposed through the headless action boundary.');
    case 'runMap':
      throw new Error('runMap is not yet exposed through the headless action boundary.');
    default:
      throw new Error(`Unsupported runtime action: ${String(action.type)}`);
  }
}

module.exports = {
  ACTION_TARGETS,
  GATHER_RESOURCES,
  assertUnlocked,
  dispatchLegacyAction,
  getValidatedPurchase,
  lookupExactTarget,
  normalizePositiveInteger,
};
