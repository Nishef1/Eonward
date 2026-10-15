import { safeNativePath } from '../src/domain/links';

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return safeNativePath(path);
}
