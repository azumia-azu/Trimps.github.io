const GATHER_RESOURCES = new Set(['food', 'wood', 'metal', 'science', 'buildings', 'trimps']);

function getActionType(action) {
  if (!action || typeof action !== 'object') throw new Error('Runtime action must be an object.');
  if (!action.type) throw new Error('Runtime action is missing a type.');
  return action.type;
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
    default:
      throw new Error(`Unsupported runtime action: ${String(action.type)}`);
  }
}

module.exports = {
  GATHER_RESOURCES,
  dispatchLegacyAction,
};
