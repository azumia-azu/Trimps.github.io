import { formatNumber } from '../engine-loader';
import { SPACE, THEME, type SnapshotProps } from './shared';

export function Header({ snapshot }: SnapshotProps) {
  const challenge = snapshot.challenge || snapshot.selectedChallenge || 'None';
  return (
    <box flexDirection="column" marginBottom={SPACE.xs}>
      <box flexDirection="row" justifyContent="space-between" backgroundColor={THEME.panelAlt} paddingX={SPACE.xs}>
        <text fg={THEME.text} content="Trimps TUI Dashboard" />
        <text fg={THEME.accent} content={`Zone ${formatNumber(snapshot.world || 1)} | Cell ${formatNumber((snapshot.lastClearedCell || 0) + 1)} | ${snapshot.mode || 'unknown'}`} />
        <text fg={challenge === 'None' ? THEME.muted : THEME.warning} content={`Challenge: ${challenge}`} />
      </box>
      <box backgroundColor={THEME.warning} paddingX={SPACE.xs}>
        <text fg={THEME.text} bg={THEME.warning} content="Headless command dashboard. Web DOM, window, and localStorage are not used by this TUI." />
      </box>
    </box>
  );
}
