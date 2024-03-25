
import { existsSync, WriteFileOptions, writeFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Stream } from 'node:stream';

import { exists } from './exists';
import { makeDir, makeDirSync } from './makeDir';
async function outputFile(
  file: string,
  data: string
      | NodeJS.ArrayBufferView
      | Iterable<string | NodeJS.ArrayBufferView>
      | AsyncIterable<string | NodeJS.ArrayBufferView>
      | Stream,
  options: WriteFileOptions = 'utf-8'
): Promise<void> {
  const dir = dirname(file);

  if (!(await exists(dir))) {
    await makeDir(dir);
  }

  return writeFile(file, data, options);
}

function outputFileSync(
  file: string,
  data: string | NodeJS.ArrayBufferView,
  options: WriteFileOptions = 'utf-8'
): void {
  const dir = dirname(file);
  if (!existsSync(dir)) {
    makeDirSync(dir);
  }

  writeFileSync(file, data, options);
}

export {
  outputFile,
  outputFileSync
};
