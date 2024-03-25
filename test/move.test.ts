import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import {
  copy,
  copySync,
  move,
  moveSync,
  remove
} from '../src/index';

const cwd = process.cwd();
describe('测试 move 功能', () => {
  const originalDir = join(cwd, 'src/util');
  const originalDirFile = join(cwd, 'src/util/stat.ts');
  const srcDir = join(cwd, 'tmp/move');
  const destDir = join(cwd, 'tmp/move2');
  const destDirFile = join(cwd, 'tmp/move2/stat.ts');
  const destFile = join(cwd, 'tmp/move2/stat2.ts');

  const srcDir2 = join(cwd, 'tmp/move3');
  const destDir2 = join(cwd, 'tmp/move4');
  const destDir2File = join(cwd, 'tmp/move4/stat.ts');
  const destFile2 = join(cwd, 'tmp/move4/stat2.ts');

  it('测试 move 方法', async () => {
    await copy(originalDir, srcDir);

    await move(srcDir, destDir);
    expect(readFileSync(destDirFile, 'utf-8'))
      .toBe(readFileSync(originalDirFile, 'utf-8'));

    await move(destDirFile, destFile);
    expect(readFileSync(destFile, 'utf-8'))
      .toBe(readFileSync(originalDirFile, 'utf-8'));
  });

  it('测试 moveSync 方法', () => {
    copySync(originalDir, srcDir2);

    moveSync(srcDir2, destDir2);
    expect(readFileSync(destDir2File, 'utf-8'))
      .toBe(readFileSync(originalDirFile, 'utf-8'));

    moveSync(destDir2File, destFile2);
    expect(readFileSync(destFile2, 'utf-8'))
      .toBe(readFileSync(originalDirFile, 'utf-8'));
  });

  afterAll(async () => {
    await Promise.all([
      remove(destDir),
      remove(destDir2)
    ]);
  });
});
