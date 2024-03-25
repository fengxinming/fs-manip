import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import {
  copy,
  copySync,
  emptyDir,
  emptyDirSync,
  remove
} from '../src/index';

const cwd = process.cwd();
describe('测试 emptyDir 功能', () => {
  const srcDir = join(cwd, 'src/util');
  const destDir = join(cwd, 'tmp/emptyDir');
  const destDir2 = join(cwd, 'tmp/emptyDir2');

  it('测试 emptyDir 方法', async () => {
    await copy(srcDir, destDir);
    await emptyDir(destDir);
    expect(readdirSync(destDir)).toEqual([]);
  });

  it('测试 emptyDirSync 方法', () => {
    copySync(srcDir, destDir2);
    emptyDirSync(destDir2);
    expect(readdirSync(destDir2)).toEqual([]);
  });

  afterAll(async () => {
    await Promise.all([
      remove(destDir),
      remove(destDir2)
    ]);
  });
});
