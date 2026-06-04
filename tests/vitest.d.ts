declare module "vitest" {
  type MockFn = (...args: unknown[]) => unknown;
  type UnknownArray = unknown[];
  interface MockResult {
    mock: {
      calls: UnknownArray[];
    };
    mockResolvedValue(value: unknown): MockResult;
    mockRejectedValue(reason: unknown): MockResult;
    mockResolvedValueOnce(value: unknown): MockResult;
    mockRejectedValueOnce(reason: unknown): MockResult;
    mockReturnValue(value: unknown): MockResult;
  }

  export const describe: (name: string, fn: () => void) => void;
  export const it: (name: string, fn: () => void | Promise<void>) => void;
  export const beforeEach: (fn: () => void | Promise<void>) => void;
  export const afterEach: (fn: () => void | Promise<void>) => void;

  export const expect: (actual: unknown) => {
    toBe: (expected: unknown) => void;
    toHaveLength: (expectedLength: number) => void;
    toMatchObject: (expected: unknown) => void;
    toBeTruthy: () => void;
    toBeGreaterThan: (expected: number) => void;
    toHaveBeenCalledTimes: (expected: number) => void;
    rejects: {
      toMatchObject: (expected: unknown) => Promise<void>;
    };
  };

  export const vi: {
    fn: (implementation?: MockFn) => MockResult;
    restoreAllMocks: () => void;
    stubGlobal: (name: string, value: unknown) => void;
  };

  export { describe as test };
}
