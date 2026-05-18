import { formatNumber } from '../engine-loader';
import type { Command, GameSnapshot, ItemSnapshot, ResourceSnapshot } from '../types/trimps-engine';

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

export const SPACE = Object.freeze({
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

export const BUY_TABS = ['All', 'Buildings', 'Jobs', 'Upgrades', 'Equipment'];
export const NUM_TABS = ['+1', '+10', '+25', '+100', 'Custom', 'Max'];

export type OwnedKey = 'owned' | 'level';
export type SnapshotProps = { snapshot: GameSnapshot };
export type CommandBarProps = { commands?: readonly Command[]; status?: string | null };

export const EMPTY_RESOURCE: ResourceSnapshot = { owned: 0, max: null };
export const EMPTY_SNAPSHOT: GameSnapshot = {
  resources: {},
  buildings: [],
  jobs: [],
  equipment: [],
  messages: [],
};

function safeItems(items: unknown): ItemSnapshot[] {
  return Array.isArray(items) ? items : [];
}

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

export function getResource(snapshot: GameSnapshot | null | undefined, key: string): ResourceSnapshot {
  return snapshot?.resources?.[key] ?? EMPTY_RESOURCE;
}

export function getMiscResources(snapshot: GameSnapshot): Array<[string, string, ResourceSnapshot]> {
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

export function line(content: unknown, fg: string = THEME.text) {
  return <text fg={fg} content={String(content)} />;
}

export function Panel({ title, children, ...props }: { title: string; children?: unknown; [key: string]: unknown }) {
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
      <text fg={THEME.text} bg={THEME.panelAlt} content={title} />
      {children}
    </box>
  );
}

export function PillRow({ items, selected }: { items: string[]; selected: string }) {
  return (
    <box flexDirection="row" marginBottom={SPACE.xs}>
      {items.map((item) => (
        <text
          key={item}
          content={` ${item} `}
          fg={item === selected ? THEME.badgeText : THEME.text}
          bg={item === selected ? THEME.badge : THEME.panelAlt}
          marginRight={SPACE.xs}
        />
      ))}
    </box>
  );
}
