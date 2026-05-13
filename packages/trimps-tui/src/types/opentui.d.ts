declare namespace JSX {
  type Element = unknown;
  type ElementChildrenAttribute = { children: unknown };
  type IntrinsicElements = Record<string, Record<string, unknown>>;
}

declare module '@opentui/react/jsx-runtime' {
  export function jsx(type: unknown, props: Record<string, unknown>, key?: unknown): unknown;
  export function jsxs(type: unknown, props: Record<string, unknown>, key?: unknown): unknown;
  export const Fragment: unknown;
}

declare module '@opentui/react' {
  export function createRoot(renderer: unknown): {
    render(element: unknown): void;
    unmount?: () => void;
  };
}

declare module '@opentui/core' {
  export function createCliRenderer(options?: Record<string, unknown>): Promise<{
    destroy?: () => void;
    stop?: () => void;
  }>;
}
