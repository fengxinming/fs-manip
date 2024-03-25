import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import {
  copy,
  copySync,
  remove
} from '../src/index';

const cwd = process.cwd();

describe('测试 copy 功能', () => {
  const srcFile = join(cwd, 'README.md');
  const destFile = join(cwd, 'tmp/README.md');
  const destFile2 = join(cwd, 'tmp/README2.md');
  const srcDir = join(cwd, 'src/util');
  const srcDirFile = join(cwd, 'src/util/stat.ts');
  const destDir = join(cwd, 'tmp/copy');
  const destDirFile = join(cwd, 'tmp/copy/stat.ts');
  const destDir2 = join(cwd, 'tmp/copy2');
  const destDir2File = join(cwd, 'tmp/copy2/stat.ts');

  it('测试 copy 方法', async () => {
    await copy(srcFile, destFile);
    expect(readFileSync(destFile, 'utf-8'))
      .toBe(readFileSync(srcFile, 'utf-8'));

    await copy(srcDir, destDir);
    expect(readFileSync(destDirFile, 'utf-8'))
      .toBe(readFileSync(srcDirFile, 'utf-8'));
  });

  it('测试 copySync 方法', () => {
    copySync(srcFile, destFile2);
    expect(readFileSync(destFile2, 'utf-8'))
      .toBe(readFileSync(srcFile, 'utf-8'));

    copySync(srcDir, destDir2);
    expect(readFileSync(destDir2File, 'utf-8'))
      .toBe(readFileSync(srcDirFile, 'utf-8'));
  });

  afterAll(async () => {
    await Promise.all([
      remove(destFile),
      remove(destFile2),
      remove(destDir),
      remove(destDir2)
    ]);
  });
});
