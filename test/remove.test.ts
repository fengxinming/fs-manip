import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import {
  copy,
  copySync,
  remove,
  removeSync
} from '../src/index';

const cwd = process.cwd();

describe('测试 remove 功能', () => {
  const originalDir = join(cwd, 'src');
  const srcDir = join(cwd, 'tmp/remove');
  const srcDirFile = join(cwd, 'tmp/remove/**/*.ts');

  const srcDir2 = join(cwd, 'tmp/remove2');
  const srcDir2File = join(cwd, 'tmp/remove2/**/*.ts');

  it('测试 remove 方法', async () => {
    await copy(originalDir, srcDir);

    await remove(srcDirFile, { glob: true });
    expect(readdirSync(srcDir)).toEqual(['util']);
  });

  it('测试 removeSync 方法', () => {
    copySync(originalDir, srcDir2);

    removeSync(srcDir2File, { glob: true });
    expect(readdirSync(srcDir2)).toEqual(['util']);
  });

  afterAll(async () => {
    await Promise.all([
      remove(srcDir),
      remove(srcDir2)
    ]);
  });
});
