import { createRequire } from 'node:module';
import type { EngineModule } from './types/trimps-engine';

const require = createRequire(import.meta.url);

function isModuleNotFound(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'MODULE_NOT_FOUND');
}

export function loadEngine(): EngineModule {
  try {
    return require('@trimps/engine') as EngineModule;
  } catch (error) {
    if (!isModuleNotFound(error)) throw error;
    return require('../../trimps-engine/src/headless-runtime') as EngineModule;
  }
}

export function loadFormatter(): Pick<EngineModule, 'formatNumber' | 'formatPercent' | 'formatResource'> {
  try {
    return require('@trimps/engine') as EngineModule;
  } catch (error) {
    if (!isModuleNotFound(error)) throw error;
    return require('../../trimps-engine/src/formatter') as Pick<EngineModule, 'formatNumber' | 'formatPercent' | 'formatResource'>;
  }
}

export const { formatNumber, formatPercent, formatResource } = loadFormatter();
