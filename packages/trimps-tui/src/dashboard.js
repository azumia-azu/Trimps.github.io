const React = require('react');

const e = React.createElement;
const { formatNumber, formatPercent, formatResource } = loadFormatter();

function loadFormatter() {
  try {
    return require('@trimps/engine');
  } catch (error) {
    if (!error || error.code !== 'MODULE_NOT_FOUND') throw error;
    return require('../../trimps-engine/src/formatter');
  }
}

const THEME = Object.freeze({
  background: '#000000',
  panel: '#000000',
  panelAlt: '#202020',
  border: '#212121',
  borderStrong: '#5D5D5D',
  text: '#C8C8C8',
  muted: '#7E7E7E',
  accent: '#1E90FF',
  primary: '#183854',
  success: '#194A19',
  warning: '#574800',
  danger: '#441817',
  badgeText: '#000000',
  badge: '#FFFF00',
});

const SPACE = Object.freeze({
  none: 0,
  xs: 1,
  sm: 2,
});

const CORE_RESOURCES = [
  ['food', 'Food', 'Gather'],
  ['wood', 'Wood', 'Chop'],
  ['metal', 'Metal', 'Mine'],
  ['science', 'Science', 'Research'],
];

const BUY_TABS = ['All', 'Buildings', 'Jobs', 'Upgrades', 'Equipment'];
const NUM_TABS = ['+1', '+10', '+25', '+100', 'Custom', 'Max'];

function countUnlocked(items) {
  return safeItems(items).filter((item) => !item.locked).length;
}

function countOwned(items, ownedKey) {
  return safeItems(items).filter((item) => Number(item[ownedKey]) > 0).length;
}

function formatItemCounts(label, items, ownedKey) {
  const safe = safeItems(items);
  return `${label}: ${countOwned(safe, ownedKey)} owned / ${countUnlocked(safe)} unlocked / ${safe.length} total`;
}

function safeItems(items) {
  return Array.isArray(items) ? items : [];
}

function getResource(snapshot, key) {
  return snapshot && snapshot.resources && snapshot.resources[key] ? snapshot.resources[key] : { owned: 0, max: null };
}

function getMiscResources(snapshot) {
  const resources = (snapshot && snapshot.resources) || {};
  return Object.keys(resources)
    .filter((key) => key !== 'trimps' && !CORE_RESOURCES.some(([resourceKey]) => resourceKey === key))
    .map((key) => [key, titleCase(key), resources[key]]);
}

function titleCase(value) {
  return String(value || 'Unknown').replace(/(^|\s|_|-)(\w)/g, (_, prefix, character) => `${prefix === '_' || prefix === '-' ? ' ' : prefix}${character.toUpperCase()}`);
}

function itemRows(items, ownedKey, limit) {
  const visible = safeItems(items).filter((item) => !item.locked || Number(item[ownedKey]) > 0);
  const sorted = visible.sort((left, right) => Number(right[ownedKey] || 0) - Number(left[ownedKey] || 0));
  return sorted.slice(0, limit).map((item) => {
    const amount = Number(item[ownedKey] || 0);
    const secondary = ownedKey === 'level' && typeof item.prestige !== 'undefined' ? `P${formatNumber(item.prestige)}` : item.locked ? 'locked' : 'unlocked';
    return `${item.name}: ${formatNumber(amount)} ${secondary}`;
  });
}

function formatMessages(messages, limit) {
  if (!Array.isArray(messages) || messages.length === 0) return ['No snapshot messages yet.'];
  return messages.slice(-limit).map((message) => {
    if (typeof message === 'string') return message;
    if (!message || typeof message !== 'object') return String(message);
    return [message.channel, message.text || message.message || message.content].filter(Boolean).join(': ') || JSON.stringify(message);
  });
}

function text(content, props) {
  return e('text', Object.assign({ fg: THEME.text, content: String(content) }, props || {}));
}

function line(content, fg) {
  return text(content, { fg: fg || THEME.text });
}

function panel(title, children, props) {
  return e(
    'box',
    Object.assign({
      borderStyle: 'single',
      borderColor: THEME.border,
      backgroundColor: THEME.panel,
      flexDirection: 'column',
      padding: SPACE.xs,
      marginRight: SPACE.xs,
      marginBottom: SPACE.xs,
    }, props || {}),
    text(title, { fg: THEME.text, backgroundColor: THEME.panelAlt }),
    ...[].concat(children || []),
  );
}

function PillRow({ items, selected }) {
  return e(
    'box',
    { flexDirection: 'row', marginBottom: SPACE.xs },
    ...items.map((item) => text(` ${item} `, {
      fg: item === selected ? THEME.badgeText : THEME.text,
      backgroundColor: item === selected ? THEME.badge : THEME.panelAlt,
      marginRight: SPACE.xs,
    })),
  );
}

function Header({ snapshot }) {
  const challenge = snapshot.challenge || snapshot.selectedChallenge || 'None';
  return e(
    'box',
    { flexDirection: 'column', marginBottom: SPACE.xs },
    e('box', { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: THEME.panelAlt, paddingX: SPACE.xs },
      text('Trimps TUI Dashboard', { fg: THEME.text }),
      text(`Zone ${formatNumber(snapshot.world || 1)} | Cell ${formatNumber((snapshot.lastClearedCell || 0) + 1)} | ${snapshot.mode || 'unknown'}`, { fg: THEME.accent }),
      text(`Challenge: ${challenge}`, { fg: challenge === 'None' ? THEME.muted : THEME.warning })),
    e('box', { backgroundColor: THEME.warning, paddingX: SPACE.xs },
      text('Headless read-only dashboard. Web DOM, window, and localStorage are not used by this TUI.', { fg: THEME.text, backgroundColor: THEME.warning })),
  );
}

function ResourceCard({ label, resource, actionLabel }) {
  return panel(label, [
    line(`${formatNumber(resource.owned)}${resource.max === null || typeof resource.max === 'undefined' ? '' : ` / ${formatNumber(resource.max)}`}`),
    e('box', { flexDirection: 'row' },
      text(` ${formatPercent(resource)} `, { fg: THEME.text, backgroundColor: THEME.primary, marginRight: SPACE.xs }),
      text(actionLabel || '+/sec unavailable', { fg: THEME.muted })),
  ], { flexGrow: 1, minHeight: 5 });
}

function ResourcesColumn({ snapshot }) {
  const miscResources = getMiscResources(snapshot);
  return panel('Resources', [
    e('box', { flexDirection: 'row' },
      ResourceCard({ label: 'Food', resource: getResource(snapshot, 'food'), actionLabel: 'Gather' }),
      ResourceCard({ label: 'Wood', resource: getResource(snapshot, 'wood'), actionLabel: 'Chop' })),
    e('box', { flexDirection: 'row' },
      ResourceCard({ label: 'Metal', resource: getResource(snapshot, 'metal'), actionLabel: 'Mine' }),
      ResourceCard({ label: 'Science', resource: getResource(snapshot, 'science'), actionLabel: 'Research' })),
    miscResources.length ? panel('Misc', miscResources.map(([, label, resource]) => line(formatResource(label, resource))), { marginRight: SPACE.none }) : null,
  ].filter(Boolean), { flexGrow: 2, minWidth: 34 });
}

function TrimpsPanel({ snapshot }) {
  const trimps = getResource(snapshot, 'trimps');
  return panel('Trimps', [
    line(`${formatNumber(trimps.owned)} / ${formatNumber(trimps.max)}`),
    text(` ${formatPercent(trimps)} `, { fg: THEME.text, backgroundColor: THEME.primary }),
    line(`Working: ${formatNumber(trimps.working)}`, THEME.muted),
    line(`Soldiers: ${formatNumber(trimps.soldiers)} / ${formatNumber(trimps.maxSoldiers)}`, THEME.muted),
    line(`Potency: ${formatNumber(trimps.potency)}`, THEME.muted),
  ], { flexGrow: 1, minWidth: 20 });
}

function LogPanel({ snapshot }) {
  return panel('Log', [
    e(PillRow, { items: ['Story', 'Loot', 'Unlocks', 'Combat'], selected: 'Story' }),
    ...formatMessages(snapshot.messages, 7).map((message) => line(message, THEME.muted)),
  ], { flexGrow: 3, marginRight: SPACE.none, minWidth: 34 });
}

function ItemSection({ title, items, ownedKey }) {
  const rows = itemRows(items, ownedKey, 5);
  return panel(title, [
    line(formatItemCounts(title, items, ownedKey), THEME.muted),
    ...(rows.length ? rows.map((row) => line(row)) : [line('No visible entries yet.', THEME.muted)]),
  ], { marginRight: SPACE.none });
}

function BuyColumn({ snapshot }) {
  return panel('Buy / Queue', [
    e(PillRow, { items: BUY_TABS, selected: 'All' }),
    e(PillRow, { items: NUM_TABS, selected: '+1' }),
    panel('Build Queue', [line('Nothing in queue...', THEME.muted)], { marginRight: SPACE.none }),
    e(ItemSection, { title: 'Buildings', items: snapshot.buildings, ownedKey: 'owned' }),
    e(ItemSection, { title: 'Jobs', items: snapshot.jobs, ownedKey: 'owned' }),
    e(ItemSection, { title: 'Equipment', items: snapshot.equipment, ownedKey: 'level' }),
  ], { flexGrow: 2, minWidth: 42 });
}

function CombatPanel({ snapshot }) {
  const challenge = snapshot.challenge || snapshot.selectedChallenge || 'None';
  const modeColor = snapshot.mapsActive ? THEME.warning : snapshot.fighting ? THEME.success : THEME.danger;
  return panel('Battle / Maps / World', [
    e('box', { flexDirection: 'row' },
      panel('Trimps', [line(`Fighting: ${snapshot.fighting ? 'yes' : 'no'}`), line(`Paused: ${snapshot.pauseFight ? 'yes' : 'no'}`, THEME.muted)], { flexGrow: 1 }),
      panel('Enemy', [line('Health: n/a', THEME.muted), line('Damage: n/a', THEME.muted)], { flexGrow: 1, marginRight: SPACE.none })),
    panel('Zone Grid', [
      line(`Zone ${formatNumber(snapshot.world || 1)} | Cell ${formatNumber((snapshot.lastClearedCell || 0) + 1)}`),
      line(`Mode: ${snapshot.mode || 'unknown'} | Maps active: ${snapshot.mapsActive ? 'yes' : 'no'}`, modeColor),
      line(`Map cell: ${formatNumber((snapshot.lastClearedMapCell || -1) + 1)} | Current map: ${snapshot.currentMapId || 'none'}`, THEME.muted),
      line(`Challenge: ${challenge}`, challenge === 'None' ? THEME.muted : THEME.warning),
    ], { marginRight: SPACE.none }),
    e(PillRow, { items: ['Fight', 'AutoFight', 'Maps', 'Repeat', 'Portal'], selected: snapshot.mapsActive ? 'Maps' : 'Fight' }),
  ], { flexGrow: 3, marginRight: SPACE.none, minWidth: 48 });
}

function HelpBar() {
  return e('box', { backgroundColor: THEME.panelAlt, paddingX: SPACE.xs, justifyContent: 'space-between', flexDirection: 'row' },
    text('Ctrl+C quit', { fg: THEME.text, backgroundColor: THEME.panelAlt }),
    text('Read-only first-stage dashboard', { fg: THEME.muted, backgroundColor: THEME.panelAlt }),
    text('Actions will be dispatched through runtime ports in later stages', { fg: THEME.muted, backgroundColor: THEME.panelAlt }));
}

function App({ snapshot }) {
  const safeSnapshot = snapshot || { resources: {}, buildings: [], jobs: [], equipment: [], messages: [] };
  return e('box', {
    id: 'trimps-dashboard',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    backgroundColor: THEME.background,
    padding: SPACE.xs,
  },
    e(Header, { snapshot: safeSnapshot }),
    e('box', { flexDirection: 'row', flexGrow: 1 },
      e(ResourcesColumn, { snapshot: safeSnapshot }),
      e(TrimpsPanel, { snapshot: safeSnapshot }),
      e(LogPanel, { snapshot: safeSnapshot })),
    e('box', { flexDirection: 'row', flexGrow: 2 },
      e(BuyColumn, { snapshot: safeSnapshot }),
      e(CombatPanel, { snapshot: safeSnapshot })),
    e(HelpBar));
}

function formatDashboard(snapshot) {
  const challenge = (snapshot && (snapshot.challenge || snapshot.selectedChallenge)) || 'None';
  const trimps = getResource(snapshot, 'trimps');
  const lines = [
    'Trimps TUI Dashboard',
    '====================',
    `Zone: ${(snapshot && snapshot.world) || 1}`,
    `Cell: ${((snapshot && snapshot.lastClearedCell) || 0) + 1}`,
    `Mode: ${(snapshot && snapshot.mode) || 'unknown'}`,
    `Fighting: ${snapshot && snapshot.fighting ? 'yes' : 'no'}`,
    `Maps Active: ${snapshot && snapshot.mapsActive ? 'yes' : 'no'}`,
    `Challenge: ${challenge}`,
    '',
    'Resources',
    '---------',
  ];

  CORE_RESOURCES.forEach(([key, label]) => {
    lines.push(formatResource(label, getResource(snapshot, key)));
  });
  lines.push(formatResource('Trimps', trimps));
  if (typeof trimps.working !== 'undefined') lines.push(`Working Trimps: ${formatNumber(trimps.working)}`);
  if (typeof trimps.soldiers !== 'undefined') lines.push(`Soldiers: ${formatNumber(trimps.soldiers)} / ${formatNumber(trimps.maxSoldiers)}`);
  lines.push('', 'Inventory', '---------');
  lines.push(formatItemCounts('Buildings', snapshot && snapshot.buildings, 'owned'));
  lines.push(formatItemCounts('Jobs', snapshot && snapshot.jobs, 'owned'));
  lines.push(formatItemCounts('Equipment', snapshot && snapshot.equipment, 'level'));

  return lines.join('\n');
}

module.exports = {
  App,
  CORE_RESOURCES,
  THEME,
  countOwned,
  countUnlocked,
  formatDashboard,
  formatItemCounts,
  formatMessages,
  formatNumber,
  formatResource,
  itemRows,
};
