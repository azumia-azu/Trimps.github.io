import { formatNumber, formatPercent } from '../engine-loader';
import { getResource, line, Panel, THEME, type SnapshotProps } from './shared';

export function TrimpsPanel({ snapshot }: SnapshotProps) {
  const trimps = getResource(snapshot, 'trimps');
  return (
    <Panel title="Trimps" flexGrow={1} minWidth={20}>
      {line(`${formatNumber(trimps.owned)} / ${formatNumber(trimps.max)}`)}
      <text content={` ${formatPercent(trimps)} `} fg={THEME.text} bg={THEME.primary} />
      {line(`Working: ${formatNumber(trimps.working)}`, THEME.muted)}
      {line(`Soldiers: ${formatNumber(trimps.soldiers)} / ${formatNumber(trimps.maxSoldiers)}`, THEME.muted)}
      {line(`Potency: ${formatNumber(trimps.potency)}`, THEME.muted)}
    </Panel>
  );
}
