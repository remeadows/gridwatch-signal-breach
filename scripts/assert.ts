import { stableStringify } from "./expansion-content-report-lib";

/** Dependency-free assertions for the DOM-free TypeScript verification runner. */
export default {
  equal(actual: unknown, expected: unknown, message = "Values differ"): void {
    if (!Object.is(actual, expected)) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  },
  deepEqual(actual: unknown, expected: unknown, message = "Structures differ"): void {
    if (stableStringify(actual) !== stableStringify(expected)) throw new Error(message);
  },
  throws(run: () => unknown, pattern: RegExp): void {
    try { run(); } catch (error) {
      if (error instanceof Error && pattern.test(error.message)) return;
      throw error;
    }
    throw new Error("Missing expected exception.");
  },
};
