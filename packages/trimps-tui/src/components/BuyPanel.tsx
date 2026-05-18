import type { ItemSnapshot } from '../types/trimps-engine';
import { BUY_TABS, formatItemCounts, itemRows, line, NUM_TABS, Panel, PillRow, SPACE, THEME, type OwnedKey, type SnapshotProps } from './shared';

function ItemSection({ title, items, ownedKey }: { title: string; items: ItemSnapshot[] | undefined; ownedKey: OwnedKey }) {
  const rows = itemRows(items, ownedKey, 5);
  return (
    <Panel title={title} marginRight={SPACE.none}>
      {line(formatItemCounts(title, items, ownedKey), THEME.muted)}
      {rows.length ? rows.map((row) => <text key={row} fg={THEME.text} content={row} />) : line('No visible entries yet.', THEME.muted)}
    </Panel>
  );
}

export function BuyPanel({ snapshot }: SnapshotProps) {
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
