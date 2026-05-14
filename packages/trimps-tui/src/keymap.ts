import type { Command } from './types/trimps-engine';

export const keymap = Object.freeze({}) satisfies Record<string, string>;

type KeyEventInput = {
  name?: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  sequence?: string;
  raw?: string;
  eventType?: string;
  repeated?: boolean;
};

type KeyInput = string | KeyEventInput;

const ACCEPTED_KEY_EVENT_TYPES = new Set(['press', 'keypress']);

function normalizeKeyValue(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  if (value.length === 1) return value.toLowerCase();
  return null;
}

export function normalizeKeyInput(input: KeyInput | null | undefined | unknown): string | null {
  if (!input) return null;
  if (typeof input === 'string') return normalizeKeyValue(input);
  if (typeof input !== 'object') return null;
  const key = input as KeyEventInput;
  if (key.eventType && !ACCEPTED_KEY_EVENT_TYPES.has(key.eventType)) return null;
  if (key.repeated) return null;
  if (key.ctrl || key.meta) return null;
  return normalizeKeyValue(key.name) || normalizeKeyValue(key.sequence) || normalizeKeyValue(key.raw);
}

export function findCommandByKey(commands: readonly Command[] | null | undefined, key: string | null): Command | null {
  if (!commands || !key) return null;
  const normalizedKey = key.toLowerCase();
  return commands.find((command) => typeof command.key === 'string' && command.key.toLowerCase() === normalizedKey) || null;
}
