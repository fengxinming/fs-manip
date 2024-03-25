import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import {
  outputFile,
  outputFileSync,
  remove
} from '../src/index';

const cwd = process.cwd();

describe('测试 outputFile 功能', () => {
  const destFile = join(cwd, 'tmp/outputFile.txt');
  const destFile2 = join(cwd, 'tmp/outputFile2.txt');
  const destContent = 'hello';

  it('测试 outputFile 方法', async () => {
    await outputFile(destFile, destContent);
    expect(readFileSync(destFile, 'utf-8'))
      .toBe(destContent);
  });

  it('测试 outputFileSync 方法', () => {
    outputFileSync(destFile2, destContent);
    expect(readFileSync(destFile2, 'utf-8'))
      .toBe(destContent);
  });

  afterAll(async () => {
    await Promise.all([
      remove(destFile),
      remove(destFile2)
    ]);
  });
});
