import type { Command } from '../types/trimps-engine';
import { SPACE, THEME, type CommandBarProps } from './shared';
import { StatusLine } from './StatusLine';

function formatCommandHint(command: Command): string {
  return command.key ? `[${command.key}] ${command.label}` : command.label;
}

function CommandHints({ commands }: { commands?: readonly Command[] }) {
  const visibleCommands = commands || [];
  if (!visibleCommands.length) return <text content="Commands unavailable" fg={THEME.muted} bg={THEME.panelAlt} />;
  return (
    <box flexDirection="row" flexWrap="wrap">
      {visibleCommands.map((command) => (
        <text
          key={command.id}
          content={` ${formatCommandHint(command)} `}
          fg={command.enabled ? THEME.text : THEME.muted}
          bg={command.enabled ? THEME.primary : THEME.panelAlt}
          marginRight={SPACE.xs}
        />
      ))}
    </box>
  );
}

export function CommandBar({ commands, status }: CommandBarProps) {
  return (
    <box backgroundColor={THEME.panelAlt} paddingX={SPACE.xs} flexDirection="column">
      <StatusLine status={status} />
      <CommandHints commands={commands} />
    </box>
  );
}
