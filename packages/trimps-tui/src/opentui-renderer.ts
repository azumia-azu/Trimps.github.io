import { jsx } from '@opentui/react/jsx-runtime';
import type { CliRenderer } from '@opentui/core';
import { App } from './dashboard';
import type { GameSnapshot } from './types/trimps-engine';

type OpenTuiRoot = {
  render(element: unknown): void;
  unmount?: () => void;
};

export type TuiRenderer = {
  isClosed(): boolean;
  update(snapshot: GameSnapshot): Promise<void>;
  close(): Promise<void>;
};

export async function createOpenTuiRenderer(): Promise<TuiRenderer> {
  const { createCliRenderer } = await import('@opentui/core');
  const { createRoot } = await import('@opentui/react');

  let closed = false;
  const renderer: CliRenderer = await createCliRenderer({
    exitOnCtrlC: true,
    onDestroy: () => {
      closed = true;
    },
    targetFps: 10,
  });
  const root = createRoot(renderer) as OpenTuiRoot;

  return {
    isClosed() {
      return closed || renderer.isDestroyed;
    },
    async update(snapshot: GameSnapshot) {
      if (closed || renderer.isDestroyed) return;
      root.render(jsx(App, { snapshot }));
    },
    async close() {
      if (closed || renderer.isDestroyed) return;
      closed = true;
      if (root && typeof root.unmount === 'function') root.unmount();
      if (renderer && typeof renderer.destroy === 'function') renderer.destroy();
      else if (renderer && typeof renderer.stop === 'function') renderer.stop();
    },
  };
}
