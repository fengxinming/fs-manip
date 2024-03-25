import { readdirSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { makeDir, makeDirSync } from './makeDir';
import { remove, removeSync } from './remove';

async function emptyDir(dir: string): Promise<string | undefined> {
  let items;
  try {
    items = await readdir(dir);
  }
  catch {
    return makeDir(dir);
  }

  await Promise.all(items.map((item) => remove(join(dir, item))));
}

function emptyDirSync(dir: string): string | undefined {
  let items;
  try {
    items = readdirSync(dir);
  }
  catch {
    return makeDirSync(dir);
  }

  items.forEach((item) => {
    removeSync(join(dir, item));
  });
}

export {
  emptyDir,
  emptyDirSync
};
