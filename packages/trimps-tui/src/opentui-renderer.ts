import { jsx } from '@opentui/react/jsx-runtime';
import type { CliRenderer } from '@opentui/core';
import { App } from './dashboard';
import { findCommandByKey, keymap, normalizeKeyInput } from './keymap';
import type { Command, EngineModule, GameSnapshot, TrimpsRuntime } from './types/trimps-engine';

type OpenTuiRoot = {
  render(element: unknown): void;
  unmount?: () => void;
};

export type TuiRenderer = {
  isClosed(): boolean;
  update(snapshot: GameSnapshot): Promise<void>;
  close(): Promise<void>;
};

export type TuiRendererOptions = {
  runtime: TrimpsRuntime;
  createCommandList: NonNullable<EngineModule['createCommandList']>;
};

type KeyInputEmitter = {
  on(event: 'keypress', handler: (key: unknown) => void): void;
};

type CommandState = {
  snapshot: GameSnapshot;
  commands: readonly Command[];
};

export async function createOpenTuiRenderer(options: TuiRendererOptions): Promise<TuiRenderer> {
  const { createCliRenderer } = await import('@opentui/core');
  const { createRoot } = await import('@opentui/react');

  let closed = false;
  let lastStatus: string | null = null;
  const renderer: CliRenderer = await createCliRenderer({
    exitOnCtrlC: true,
    onDestroy: () => {
      closed = true;
    },
    targetFps: 10,
  });
  const root = createRoot(renderer) as OpenTuiRoot;

  function readCommandState(): CommandState {
    const snapshot = options.runtime.snapshot();
    const commands = options.createCommandList(snapshot, options.runtime.capabilities(), { keymap });
    return { snapshot, commands };
  }

  function renderCurrent(): void {
    if (closed || renderer.isDestroyed) return;
    const state = readCommandState();
    root.render(jsx(App, { snapshot: state.snapshot, commands: state.commands, status: lastStatus }));
  }

  const keyInput = (renderer as CliRenderer & { keyInput?: KeyInputEmitter }).keyInput;
  if (keyInput && typeof keyInput.on === 'function') {
    keyInput.on('keypress', (input: unknown) => {
      if (closed || renderer.isDestroyed) return;
      const key = normalizeKeyInput(input);
      if (!key) return;
      const state = readCommandState();
      const command = findCommandByKey(state.commands, key);
      if (!command) return;
      if (!command.enabled) {
        lastStatus = `${command.label} disabled: ${command.disabledReason || 'unavailable'}`;
        renderCurrent();
        return;
      }
      options.runtime.dispatch(command.action);
      lastStatus = `${command.label} dispatched.`;
      renderCurrent();
    });
  }

  return {
    isClosed() {
      return closed || renderer.isDestroyed;
    },
    async update(_snapshot: GameSnapshot) {
      if (closed || renderer.isDestroyed) return;
      renderCurrent();
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
