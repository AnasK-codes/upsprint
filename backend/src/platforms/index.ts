import { codechefAdapter } from "./codechef.js";
import { codeforcesAdapter } from "./codeforces.js";
import { leetcodeAdapter } from "./leetcode.js";
import { PLATFORM_NAMES, type PlatformAdapter, type PlatformName } from "./types.js";

export { PLATFORM_NAMES };
export type { PlatformAdapter, PlatformName, SnapshotStats } from "./types.js";

const adapters: Record<PlatformName, PlatformAdapter<any>> = {
  leetcode: leetcodeAdapter,
  codeforces: codeforcesAdapter,
  codechef: codechefAdapter,
};

export function isPlatform(name: string): name is PlatformName {
  return (PLATFORM_NAMES as readonly string[]).includes(name);
}

export function getAdapter(name: string): PlatformAdapter<any> {
  if (!isPlatform(name)) throw new Error(`Unknown platform: ${name}`);
  return adapters[name];
}
