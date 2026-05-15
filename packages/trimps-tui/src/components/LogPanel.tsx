import { formatMessages, Panel, PillRow, SPACE, THEME, type SnapshotProps } from './shared';

export function LogPanel({ snapshot }: SnapshotProps) {
  return (
    <Panel title="Log" flexGrow={3} marginRight={SPACE.none} minWidth={34}>
      <PillRow items={['Story', 'Loot', 'Unlocks', 'Combat']} selected="Story" />
      {formatMessages(snapshot.messages, 7).map((message, index) => <text key={`${index}:${message}`} fg={THEME.muted} content={message} />)}
    </Panel>
  );
}
