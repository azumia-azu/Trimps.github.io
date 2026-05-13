import { formatNumber, formatPercent, formatResource } from './engine-loader';
import type { GameSnapshot, ItemSnapshot, ResourceSnapshot } from './types/trimps-engine';

export const THEME = Object.freeze({
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

export const CORE_RESOURCES = [
  ['food', 'Food', 'Gather'],
  ['wood', 'Wood', 'Chop'],
  ['metal', 'Metal', 'Mine'],
  ['science', 'Science', 'Research'],
] as const;

const BUY_TABS = ['All', 'Buildings', 'Jobs', 'Upgrades', 'Equipment'];
const NUM_TABS = ['+1', '+10', '+25', '+100', 'Custom', 'Max'];

type OwnedKey = 'owned' | 'level';
type SnapshotProps = { snapshot: GameSnapshot };

const EMPTY_RESOURCE: ResourceSnapshot = { owned: 0, max: null };
const EMPTY_SNAPSHOT: GameSnapshot = {
  resources: {},
  buildings: [],
  jobs: [],
  equipment: [],
  messages: [],
};

export function countUnlocked(items: unknown): number {
  return safeItems(items).filter((item) => !item.locked).length;
}

export function countOwned(items: unknown, ownedKey: OwnedKey): number {
  return safeItems(items).filter((item) => Number(item[ownedKey]) > 0).length;
}

export function formatItemCounts(label: string, items: unknown, ownedKey: OwnedKey): string {
  const safe = safeItems(items);
  return `${label}: ${countOwned(safe, ownedKey)} owned / ${countUnlocked(safe)} unlocked / ${safe.length} total`;
}

function safeItems(items: unknown): ItemSnapshot[] {
  return Array.isArray(items) ? items : [];
}

function getResource(snapshot: GameSnapshot | null | undefined, key: string): ResourceSnapshot {
  return snapshot?.resources?.[key] ?? EMPTY_RESOURCE;
}

function getMiscResources(snapshot: GameSnapshot): Array<[string, string, ResourceSnapshot]> {
  const resources = snapshot.resources || {};
  return Object.keys(resources)
    .filter((key) => key !== 'trimps' && !CORE_RESOURCES.some(([resourceKey]) => resourceKey === key))
    .map((key) => [key, titleCase(key), resources[key]]);
}

function titleCase(value: unknown): string {
  return String(value || 'Unknown').replace(/(^|\s|_|-)(\w)/g, (_, prefix: string, character: string) => `${prefix === '_' || prefix === '-' ? ' ' : prefix}${character.toUpperCase()}`);
}

export function itemRows(items: unknown, ownedKey: OwnedKey, limit: number): string[] {
  const visible = safeItems(items).filter((item) => !item.locked || Number(item[ownedKey]) > 0);
  const sorted = visible.sort((left, right) => Number(right[ownedKey] || 0) - Number(left[ownedKey] || 0));
  return sorted.slice(0, limit).map((item) => {
    const amount = Number(item[ownedKey] || 0);
    const secondary = ownedKey === 'level' && typeof item.prestige !== 'undefined' ? `P${formatNumber(item.prestige)}` : item.locked ? 'locked' : 'unlocked';
    return `${item.name}: ${formatNumber(amount)} ${secondary}`;
  });
}

export function formatMessages(messages: unknown, limit: number): string[] {
  if (!Array.isArray(messages) || messages.length === 0) return ['No snapshot messages yet.'];
  return messages.slice(-limit).map((message) => {
    if (typeof message === 'string') return message;
    if (!message || typeof message !== 'object') return String(message);
    const snapshotMessage = message as { channel?: string; text?: string; message?: string; content?: string };
    return [snapshotMessage.channel, snapshotMessage.text || snapshotMessage.message || snapshotMessage.content].filter(Boolean).join(': ') || JSON.stringify(message);
  });
}

function line(content: unknown, fg: string = THEME.text) {
  return <text fg={fg} content={String(content)} />;
}

function Panel({ title, children, ...props }: { title: string; children?: unknown; [key: string]: unknown }) {
  return (
    <box
      borderStyle="single"
      borderColor={THEME.border}
      backgroundColor={THEME.panel}
      flexDirection="column"
      padding={SPACE.xs}
      marginRight={SPACE.xs}
      marginBottom={SPACE.xs}
      {...props}
    >
      <text fg={THEME.text} backgroundColor={THEME.panelAlt} content={title} />
      {children}
    </box>
  );
}

function PillRow({ items, selected }: { items: string[]; selected: string }) {
  return (
    <box flexDirection="row" marginBottom={SPACE.xs}>
      {items.map((item) => (
        <text
          key={item}
          content={` ${item} `}
          fg={item === selected ? THEME.badgeText : THEME.text}
          backgroundColor={item === selected ? THEME.badge : THEME.panelAlt}
          marginRight={SPACE.xs}
        />
      ))}
    </box>
  );
}

function Header({ snapshot }: SnapshotProps) {
  const challenge = snapshot.challenge || snapshot.selectedChallenge || 'None';
  return (
    <box flexDirection="column" marginBottom={SPACE.xs}>
      <box flexDirection="row" justifyContent="space-between" backgroundColor={THEME.panelAlt} paddingX={SPACE.xs}>
        <text fg={THEME.text} content="Trimps TUI Dashboard" />
        <text fg={THEME.accent} content={`Zone ${formatNumber(snapshot.world || 1)} | Cell ${formatNumber((snapshot.lastClearedCell || 0) + 1)} | ${snapshot.mode || 'unknown'}`} />
        <text fg={challenge === 'None' ? THEME.muted : THEME.warning} content={`Challenge: ${challenge}`} />
      </box>
      <box backgroundColor={THEME.warning} paddingX={SPACE.xs}>
        <text fg={THEME.text} backgroundColor={THEME.warning} content="Headless read-only dashboard. Web DOM, window, and localStorage are not used by this TUI." />
      </box>
    </box>
  );
}

function ResourceCard({ label, resource, actionLabel }: { label: string; resource: ResourceSnapshot; actionLabel: string }) {
  return (
    <Panel title={label} flexGrow={1} minHeight={5}>
      {line(`${formatNumber(resource.owned)}${resource.max === null || typeof resource.max === 'undefined' ? '' : ` / ${formatNumber(resource.max)}`}`)}
      <box flexDirection="row">
        <text content={` ${formatPercent(resource)} `} fg={THEME.text} backgroundColor={THEME.primary} marginRight={SPACE.xs} />
        <text content={actionLabel || '+/sec unavailable'} fg={THEME.muted} />
      </box>
    </Panel>
  );
}

function ResourcesColumn({ snapshot }: SnapshotProps) {
  const miscResources = getMiscResources(snapshot);
  return (
    <Panel title="Resources" flexGrow={2} minWidth={34}>
      <box flexDirection="row">
        <ResourceCard label="Food" resource={getResource(snapshot, 'food')} actionLabel="Gather" />
        <ResourceCard label="Wood" resource={getResource(snapshot, 'wood')} actionLabel="Chop" />
      </box>
      <box flexDirection="row">
        <ResourceCard label="Metal" resource={getResource(snapshot, 'metal')} actionLabel="Mine" />
        <ResourceCard label="Science" resource={getResource(snapshot, 'science')} actionLabel="Research" />
      </box>
      {miscResources.length ? (
        <Panel title="Misc" marginRight={SPACE.none}>
          {miscResources.map(([key, label, resource]) => <text key={key} fg={THEME.text} content={formatResource(label, resource)} />)}
        </Panel>
      ) : null}
    </Panel>
  );
}

function TrimpsPanel({ snapshot }: SnapshotProps) {
  const trimps = getResource(snapshot, 'trimps');
  return (
    <Panel title="Trimps" flexGrow={1} minWidth={20}>
      {line(`${formatNumber(trimps.owned)} / ${formatNumber(trimps.max)}`)}
      <text content={` ${formatPercent(trimps)} `} fg={THEME.text} backgroundColor={THEME.primary} />
      {line(`Working: ${formatNumber(trimps.working)}`, THEME.muted)}
      {line(`Soldiers: ${formatNumber(trimps.soldiers)} / ${formatNumber(trimps.maxSoldiers)}`, THEME.muted)}
      {line(`Potency: ${formatNumber(trimps.potency)}`, THEME.muted)}
    </Panel>
  );
}

function LogPanel({ snapshot }: SnapshotProps) {
  return (
    <Panel title="Log" flexGrow={3} marginRight={SPACE.none} minWidth={34}>
      <PillRow items={['Story', 'Loot', 'Unlocks', 'Combat']} selected="Story" />
      {formatMessages(snapshot.messages, 7).map((message, index) => <text key={`${index}:${message}`} fg={THEME.muted} content={message} />)}
    </Panel>
  );
}

function ItemSection({ title, items, ownedKey }: { title: string; items: ItemSnapshot[] | undefined; ownedKey: OwnedKey }) {
  const rows = itemRows(items, ownedKey, 5);
  return (
    <Panel title={title} marginRight={SPACE.none}>
      {line(formatItemCounts(title, items, ownedKey), THEME.muted)}
      {rows.length ? rows.map((row) => <text key={row} fg={THEME.text} content={row} />) : line('No visible entries yet.', THEME.muted)}
    </Panel>
  );
}

function BuyColumn({ snapshot }: SnapshotProps) {
  return (
    <Panel title="Buy / Queue" flexGrow={2} minWidth={42}>
      <PillRow items={BUY_TABS} selected="All" />
      <PillRow items={NUM_TABS} selected="+1" />
      <Panel title="Build Queue" marginRight={SPACE.none}>{line('Nothing in queue...', THEME.muted)}</Panel>
      <ItemSection title="Buildings" items={snapshot.buildings} ownedKey="owned" />
      <ItemSection title="Jobs" items={snapshot.jobs} ownedKey="owned" />
      <ItemSection title="Equipment" items={snapshot.equipment} ownedKey="level" />
    </Panel>
  );
}

function CombatPanel({ snapshot }: SnapshotProps) {
  const challenge = snapshot.challenge || snapshot.selectedChallenge || 'None';
  const modeColor = snapshot.mapsActive ? THEME.warning : snapshot.fighting ? THEME.success : THEME.danger;
  return (
    <Panel title="Battle / Maps / World" flexGrow={3} marginRight={SPACE.none} minWidth={48}>
      <box flexDirection="row">
        <Panel title="Trimps" flexGrow={1}>
          {line(`Fighting: ${snapshot.fighting ? 'yes' : 'no'}`)}
          {line(`Paused: ${snapshot.pauseFight ? 'yes' : 'no'}`, THEME.muted)}
        </Panel>
        <Panel title="Enemy" flexGrow={1} marginRight={SPACE.none}>
          {line('Health: n/a', THEME.muted)}
          {line('Damage: n/a', THEME.muted)}
        </Panel>
      </box>
      <Panel title="Zone Grid" marginRight={SPACE.none}>
        {line(`Zone ${formatNumber(snapshot.world || 1)} | Cell ${formatNumber((snapshot.lastClearedCell || 0) + 1)}`)}
        {line(`Mode: ${snapshot.mode || 'unknown'} | Maps active: ${snapshot.mapsActive ? 'yes' : 'no'}`, modeColor)}
        {line(`Map cell: ${formatNumber((snapshot.lastClearedMapCell || -1) + 1)} | Current map: ${snapshot.currentMapId || 'none'}`, THEME.muted)}
        {line(`Challenge: ${challenge}`, challenge === 'None' ? THEME.muted : THEME.warning)}
      </Panel>
      <PillRow items={['Fight', 'AutoFight', 'Maps', 'Repeat', 'Portal']} selected={snapshot.mapsActive ? 'Maps' : 'Fight'} />
    </Panel>
  );
}

function HelpBar() {
  return (
    <box backgroundColor={THEME.panelAlt} paddingX={SPACE.xs} justifyContent="space-between" flexDirection="row">
      <text content="Ctrl+C quit" fg={THEME.text} backgroundColor={THEME.panelAlt} />
      <text content="Read-only first-stage dashboard" fg={THEME.muted} backgroundColor={THEME.panelAlt} />
      <text content="Actions will be dispatched through runtime ports in later stages" fg={THEME.muted} backgroundColor={THEME.panelAlt} />
    </box>
  );
}

export function App({ snapshot }: { snapshot?: GameSnapshot }) {
  const safeSnapshot = snapshot || EMPTY_SNAPSHOT;
  return (
    <box id="trimps-dashboard" flexDirection="column" width="100%" height="100%" backgroundColor={THEME.background} padding={SPACE.xs}>
      <Header snapshot={safeSnapshot} />
      <box flexDirection="row" flexGrow={1}>
        <ResourcesColumn snapshot={safeSnapshot} />
        <TrimpsPanel snapshot={safeSnapshot} />
        <LogPanel snapshot={safeSnapshot} />
      </box>
      <box flexDirection="row" flexGrow={2}>
        <BuyColumn snapshot={safeSnapshot} />
        <CombatPanel snapshot={safeSnapshot} />
      </box>
      <HelpBar />
    </box>
  );
}

export function formatDashboard(snapshot?: GameSnapshot | null): string {
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

export { formatNumber, formatResource };
