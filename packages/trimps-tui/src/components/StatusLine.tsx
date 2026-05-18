import { THEME } from './shared';

export function StatusLine({ status }: { status?: string | null }) {
  return (
    <box justifyContent="space-between" flexDirection="row">
      <text content="Ctrl+C quit" fg={THEME.text} bg={THEME.panelAlt} />
      <text content={status || 'Press a command key to dispatch through the engine runtime.'} fg={status ? THEME.warning : THEME.muted} bg={THEME.panelAlt} />
    </box>
  );
}
