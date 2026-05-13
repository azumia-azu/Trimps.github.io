import { jsx } from '@opentui/react/jsx-runtime';
import type { CliRenderer } from '@opentui/core';
import { App } from './dashboard';
import type { GameSnapshot } from './types/trimps-engine';

type OpenTuiRoot = {
  render(element: unknown): void;
  unmount?: () => void;
};

export type TuiRenderer = {
  update(snapshot: GameSnapshot): Promise<void>;
  close(): Promise<void>;
};

export async function createOpenTuiRenderer(): Promise<TuiRenderer> {
  const { createCliRenderer } = await import('@opentui/core');
  const { createRoot } = await import('@opentui/react');

  const renderer: CliRenderer = await createCliRenderer({ exitOnCtrlC: true, targetFps: 10 });
  const root = createRoot(renderer) as OpenTuiRoot;

  return {
    async update(snapshot: GameSnapshot) {
      root.render(jsx(App, { snapshot }));
    },
    async close() {
      if (root && typeof root.unmount === 'function') root.unmount();
      if (renderer && typeof renderer.destroy === 'function') renderer.destroy();
      else if (renderer && typeof renderer.stop === 'function') renderer.stop();
    },
  };
}
