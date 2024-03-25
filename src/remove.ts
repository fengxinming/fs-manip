import { PathLike, RmOptions, rmSync } from 'node:fs';
import { rm } from 'node:fs/promises';

import { globby, globbySync, Options } from 'globby';

interface RemoveOptions extends RmOptions {
  glob?: true | Options;
}

async function remove(path: PathLike | string[], options?: RemoveOptions): Promise<void> {
  const opts = Object.assign({ recursive: true, force: true }, options);

  const { glob } = opts;
  if (glob) {
    if (typeof path === 'string' || Array.isArray(path)) {
      await Promise.all(
        (await globby(path, typeof glob === 'object' ? glob : void 0)).map((n) => rm(n, opts))
      );
      return;
    }
    return;
  }
  else if (Array.isArray(path)) {
    await Promise.all(path.map((n) => rm(n, opts)));
    return;
  }

  return rm(path, opts);
}

function removeSync(path: PathLike | string[], options?: RemoveOptions): void {
  const opts = Object.assign({ recursive: true, force: true }, options);

  const { glob } = opts;
  if (glob) {
    if (typeof path === 'string' || Array.isArray(path)) {
      globbySync(path, typeof glob === 'object' ? glob : void 0).forEach((n) => rmSync(n, opts));
    }
    return;
  }
  else if (Array.isArray(path)) {
    path.forEach((n) => rmSync(n, opts));
    return;
  }

  return rmSync(path, opts);
}

export {
  remove,
  RemoveOptions,
  removeSync
};
