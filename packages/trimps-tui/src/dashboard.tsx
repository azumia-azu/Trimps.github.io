import { formatNumber, formatResource } from './engine-loader';
import { BuyPanel } from './components/BuyPanel';
import { CombatPanel } from './components/CombatPanel';
import { CommandBar } from './components/CommandBar';
import { Header } from './components/Header';
import { LogPanel } from './components/LogPanel';
import { ResourcePanel } from './components/ResourcePanel';
import { TrimpsPanel } from './components/TrimpsPanel';
import {
  CORE_RESOURCES,
  EMPTY_SNAPSHOT,
  SPACE,
  THEME,
  countOwned,
  countUnlocked,
  formatItemCounts,
  formatMessages,
  getResource,
  itemRows,
} from './components/shared';
import type { Command, GameSnapshot } from './types/trimps-engine';

export { CORE_RESOURCES, THEME, countOwned, countUnlocked, formatItemCounts, formatMessages, itemRows };

export function App({ snapshot, commands, status }: { snapshot?: GameSnapshot; commands?: readonly Command[]; status?: string | null }) {
  const safeSnapshot = snapshot || EMPTY_SNAPSHOT;
  return (
    <box id="trimps-dashboard" flexDirection="column" width="100%" height="100%" backgroundColor={THEME.background} padding={SPACE.xs}>
      <Header snapshot={safeSnapshot} />
      <box flexDirection="row" flexGrow={1}>
        <ResourcePanel snapshot={safeSnapshot} />
        <TrimpsPanel snapshot={safeSnapshot} />
        <LogPanel snapshot={safeSnapshot} />
      </box>
      <box flexDirection="row" flexGrow={2}>
        <BuyPanel snapshot={safeSnapshot} />
        <CombatPanel snapshot={safeSnapshot} />
      </box>
      <CommandBar commands={commands} status={status} />
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
