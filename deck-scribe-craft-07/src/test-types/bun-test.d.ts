declare module "bun:test" {
  type TestBody = () => void | Promise<void>;

  interface TestFunction {
    (name: string, body: TestBody): void;
  }

  interface Expectation {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toThrow(expected?: unknown): void;
  }

  export const describe: TestFunction;
  export const test: TestFunction;
  export function expect(actual: unknown): Expectation;
}
