import { formatNumber, formatPercent, formatResource } from '../engine-loader';
import type { ResourceSnapshot } from '../types/trimps-engine';
import { getMiscResources, getResource, line, Panel, SPACE, THEME, type SnapshotProps } from './shared';

function ResourceCard({ label, resource, actionLabel }: { label: string; resource: ResourceSnapshot; actionLabel: string }) {
  return (
    <Panel title={label} flexGrow={1} minHeight={5}>
      {line(`${formatNumber(resource.owned)}${resource.max === null || typeof resource.max === 'undefined' ? '' : ` / ${formatNumber(resource.max)}`}`)}
      <box flexDirection="row">
        <text content={` ${formatPercent(resource)} `} fg={THEME.text} bg={THEME.primary} marginRight={SPACE.xs} />
        <text content={actionLabel || '+/sec unavailable'} fg={THEME.muted} />
      </box>
    </Panel>
  );
}

export function ResourcePanel({ snapshot }: SnapshotProps) {
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
