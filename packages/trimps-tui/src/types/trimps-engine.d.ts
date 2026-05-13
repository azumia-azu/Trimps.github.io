export type ActionStability = 'stable' | 'experimental';
export type BuyAmount = number | 'Max';

export type ResourceSnapshot = {
  owned: number;
  max?: number | null;
  working?: number;
  soldiers?: number;
  maxSoldiers?: number;
  potency?: number;
  speed?: number;
  employed?: number;
  [key: string]: unknown;
};

export type ItemSnapshot = {
  name: string;
  locked?: boolean;
  owned?: number;
  level?: number;
  purchased?: boolean;
  modifier?: number;
  prestige?: number;
  canAfford?: boolean;
  [key: string]: unknown;
};

export type SnapshotMessage = string | {
  channel?: string;
  text?: string;
  message?: string;
  content?: string;
  [key: string]: unknown;
};

export type GameSnapshot = {
  world?: number;
  lastClearedCell?: number;
  lastClearedMapCell?: number;
  currentMapId?: string | number | null;
  lookingAtMap?: string | number | null;
  playerGathering?: string;
  buyAmt?: BuyAmount | string;
  autoFight?: boolean;
  mapsUnlocked?: boolean;
  preMapsActive?: boolean;
  pauseFight?: boolean;
  pauseGame?: boolean;
  mapsActive?: boolean;
  fighting?: boolean;
  firing?: boolean;
  mode?: string;
  challenge?: string;
  selectedChallenge?: string;
  mapologyCredits?: number;
  resources?: Record<string, ResourceSnapshot>;
  buildings?: ItemSnapshot[];
  jobs?: ItemSnapshot[];
  equipment?: ItemSnapshot[];
  upgrades?: ItemSnapshot[];
  ownedMaps?: ItemSnapshot[];
  buildQueue?: unknown[];
  messages?: SnapshotMessage[];
  messagePreferences?: Record<string, unknown>;
  currentCell?: Record<string, unknown> | null;
  currentEnemy?: Record<string, unknown> | null;
  [key: string]: unknown;
};

export type GameAction =
  | { type: 'load'; payload: string }
  | { type: 'load'; save: string }
  | { type: 'save' }
  | { type: 'gather'; resource: 'food' | 'wood' | 'metal' | 'science' | 'buildings' | 'trimps' | string }
  | { type: 'buyBuilding'; name: string; amount?: BuyAmount }
  | { type: 'buyJob'; name: string; amount?: BuyAmount }
  | { type: 'buyEquipment'; name: string; amount?: BuyAmount }
  | { type: 'buyUpgrade'; name: string; amount?: BuyAmount }
  | { type: 'fight' }
  | { type: 'pauseFight'; paused?: boolean }
  | { type: 'runMap'; id: string | number }
  | { type: 'setBuyAmount'; amount: BuyAmount }
  | { type: 'toggleAutoFight'; enabled?: boolean };

export type Command = {
  id: string;
  label: string;
  description: string;
  key: string | null;
  action: GameAction;
  enabled: boolean;
  disabledReason: string | null;
  stability: ActionStability;
};

export type TrimpsRuntime = {
  loadExport(saveString: string): boolean;
  exportSave(): string;
  tick(deltaMs: number): number;
  snapshot(): GameSnapshot;
  capabilities(): Record<string, unknown>;
  dispatch(action: GameAction): unknown;
  context?: Record<string, unknown>;
  rootDir?: string;
};

export type ClockPort = {
  setTimeout(callback: () => void, delayMs: number): unknown;
};

export type FileStoragePort = {
  readText(filePath: string): string;
  writeText?(filePath: string, text: string): void;
};

export type RuntimeLoopOptions = {
  runtime: TrimpsRuntime;
  clockPort?: ClockPort;
  initialDeltaMs?: number;
  intervalMs?: number;
  frames?: number;
  onSnapshot?: (snapshot: GameSnapshot) => void | Promise<void>;
  shouldContinue?: (snapshot: GameSnapshot, frameIndex: number) => boolean | Promise<boolean>;
};

export type EngineModule = {
  createFileStoragePort(options: { baseDir: string }): FileStoragePort;
  createSystemClockPort(): ClockPort;
  createTrimpsRuntime(options?: { rootDir?: string; [key: string]: unknown }): TrimpsRuntime;
  runRuntimeLoop(options: RuntimeLoopOptions): Promise<void>;
  createCommandList?(snapshot: GameSnapshot, capabilities: Record<string, unknown>, options?: { keymap?: Record<string, string> }): readonly Command[];
  formatNumber(value: unknown): string;
  formatPercent(resource: ResourceSnapshot): string;
  formatResource(label: string, resource: ResourceSnapshot): string;
};

declare module '@trimps/engine' {
  export function createFileStoragePort(options: { baseDir: string }): FileStoragePort;
  export function createSystemClockPort(): ClockPort;
  export function createTrimpsRuntime(options?: { rootDir?: string; [key: string]: unknown }): TrimpsRuntime;
  export function runRuntimeLoop(options: RuntimeLoopOptions): Promise<void>;
  export function createCommandList(snapshot: GameSnapshot, capabilities: Record<string, unknown>, options?: { keymap?: Record<string, string> }): readonly Command[];
  export function formatNumber(value: unknown): string;
  export function formatPercent(resource: ResourceSnapshot): string;
  export function formatResource(label: string, resource: ResourceSnapshot): string;
}

declare module '../../trimps-engine/src/headless-runtime' {
  const engine: EngineModule;
  export = engine;
}

declare module '../../trimps-engine/src/formatter' {
  export function formatNumber(value: unknown): string;
  export function formatPercent(resource: ResourceSnapshot): string;
  export function formatResource(label: string, resource: ResourceSnapshot): string;
}
