import { formatNumber } from '../engine-loader';
import { line, Panel, PillRow, SPACE, THEME, type SnapshotProps } from './shared';

export function CombatPanel({ snapshot }: SnapshotProps) {
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
