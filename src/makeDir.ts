import { MakeDirectoryOptions, mkdirSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { parse as parsePath } from 'node:path';

function checkPath(pth: string): void {
  if (process.platform === 'win32') {
    const pathHasInvalidWinCharacters = /[<>:"|?*]/.test(pth.replace(parsePath(pth).root, ''));

    if (pathHasInvalidWinCharacters) {
      const error: any = new Error(`Path contains invalid characters: ${pth}`);
      error.code = 'EINVAL';
      throw error;
    }
  }
}

async function makeDir(dir: string, options?: MakeDirectoryOptions): Promise<string | undefined> {
  checkPath(dir);
  options = Object.assign({ mode: 0o777, recursive: true }, options);
  return mkdir(dir, options);
}

function makeDirSync(dir: string, options?: MakeDirectoryOptions): string | undefined {
  checkPath(dir);
  options = Object.assign({ mode: 0o777, recursive: true }, options);
  return mkdirSync(dir, options);
}

export {
  makeDir,
  makeDirSync
};
