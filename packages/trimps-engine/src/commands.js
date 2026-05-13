const { ACTION_METADATA } = require('./actions');

const DEFAULT_COMMAND_DEFINITIONS = [
  {
    id: 'gather.food',
    label: 'Gather Food',
    description: 'Switch gathering to food.',
    key: 'f',
    action: { type: 'gather', resource: 'food' },
    capabilityPath: ['gather', 'food'],
  },
  {
    id: 'gather.wood',
    label: 'Gather Wood',
    description: 'Switch gathering to wood.',
    key: 'w',
    action: { type: 'gather', resource: 'wood' },
    capabilityPath: ['gather', 'wood'],
  },
  {
    id: 'gather.metal',
    label: 'Gather Metal',
    description: 'Switch gathering to metal.',
    key: 'm',
    action: { type: 'gather', resource: 'metal' },
    capabilityPath: ['gather', 'metal'],
  },
  {
    id: 'gather.science',
    label: 'Gather Science',
    description: 'Switch gathering to science.',
    key: 'r',
    action: { type: 'gather', resource: 'science' },
    capabilityPath: ['gather', 'science'],
  },
  {
    id: 'setBuyAmount.1',
    label: 'Buy 1',
    description: 'Set the buy amount to 1.',
    key: '5',
    action: { type: 'setBuyAmount', amount: 1 },
    capabilityPath: ['setBuyAmount'],
  },
  {
    id: 'setBuyAmount.10',
    label: 'Buy 10',
    description: 'Set the buy amount to 10.',
    key: '6',
    action: { type: 'setBuyAmount', amount: 10 },
    capabilityPath: ['setBuyAmount'],
  },
  {
    id: 'setBuyAmount.25',
    label: 'Buy 25',
    description: 'Set the buy amount to 25.',
    key: '7',
    action: { type: 'setBuyAmount', amount: 25 },
    capabilityPath: ['setBuyAmount'],
  },
  {
    id: 'setBuyAmount.100',
    label: 'Buy 100',
    description: 'Set the buy amount to 100.',
    key: '8',
    action: { type: 'setBuyAmount', amount: 100 },
    capabilityPath: ['setBuyAmount'],
  },
  {
    id: 'setBuyAmount.max',
    label: 'Buy Max',
    description: 'Set the buy amount to Max.',
    key: 'x',
    action: { type: 'setBuyAmount', amount: 'Max' },
    capabilityPath: ['setBuyAmount'],
  },
  {
    id: 'toggleAutoFight',
    label: 'Auto Fight',
    description: 'Toggle legacy auto fight.',
    key: 'a',
    action: { type: 'toggleAutoFight' },
    capabilityPath: ['toggleAutoFight'],
  },
  {
    id: 'pauseFight',
    label: 'Pause Fight',
    description: 'Toggle legacy fight pause.',
    key: 'p',
    action: { type: 'pauseFight' },
    capabilityPath: ['pauseFight'],
  },
  {
    id: 'save',
    label: 'Save',
    description: 'Export the current save string.',
    key: 's',
    action: { type: 'save' },
    capabilityPath: ['save'],
  },
];

const DEFAULT_COMMANDS = Object.freeze(DEFAULT_COMMAND_DEFINITIONS.map((definition) => Object.freeze({
  ...definition,
  action: Object.freeze({ ...definition.action }),
  capabilityPath: Object.freeze([...definition.capabilityPath]),
})));

function missingCapability(path) {
  return {
    available: false,
    reason: `missing capability: ${path.join('.')}`,
  };
}

function getCapabilityValue(capabilities, path) {
  if (!capabilities || !Array.isArray(path) || path.length === 0) {
    return { available: true, reason: null };
  }

  let current = capabilities;
  for (const segment of path) {
    if (!current || typeof current !== 'object') {
      return missingCapability(path);
    }
    current = current[segment];
  }

  if (!current || typeof current !== 'object') {
    return missingCapability(path);
  }

  return {
    available: current.available !== false,
    reason: current.available === false ? (current.reason || 'unavailable') : null,
  };
}

function cloneAction(action, snapshot) {
  if (action.type === 'toggleAutoFight') {
    return { type: 'toggleAutoFight', enabled: !Boolean(snapshot && snapshot.autoFight) };
  }

  if (action.type === 'pauseFight') {
    return { type: 'pauseFight', paused: !Boolean(snapshot && snapshot.pauseFight) };
  }

  return { ...action };
}

function buildCommand(definition, snapshot, capabilities, keymap) {
  const metadata = ACTION_METADATA[definition.action.type];
  if (!metadata) {
    throw new Error(`Missing action metadata for command action type: ${definition.action.type}`);
  }

  const capability = getCapabilityValue(capabilities, definition.capabilityPath);
  const hasOverride = keymap && Object.prototype.hasOwnProperty.call(keymap, definition.id);

  return Object.freeze({
    id: definition.id,
    label: definition.label,
    description: definition.description,
    key: hasOverride ? keymap[definition.id] : definition.key,
    action: Object.freeze(cloneAction(definition.action, snapshot)),
    enabled: capability.available,
    disabledReason: capability.available ? null : capability.reason,
    stability: metadata.stability,
  });
}

function createCommandList(snapshot, capabilities, options = {}) {
  const keymap = options && options.keymap ? options.keymap : null;
  return Object.freeze(DEFAULT_COMMANDS.map((definition) => buildCommand(definition, snapshot, capabilities, keymap)));
}

module.exports = {
  DEFAULT_COMMANDS,
  createCommandList,
};
