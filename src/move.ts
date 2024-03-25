
import { existsSync, renameSync } from 'node:fs';
import { rename } from 'node:fs/promises';
import { dirname, parse as parsePath } from 'node:path';

import { copy, copySync } from './copy';
import { exists } from './exists';
import { makeDir, makeDirSync } from './makeDir';
import { remove, removeSync } from './remove';
import { checkParentPaths, checkParentPathsSync, checkPaths, checkPathsSync } from './util/stat';

interface MoveOptions {
  force?: boolean;
  clobber?: boolean;
}

async function doRename(
  src: string,
  dest: string,
  force: boolean,
  isChangingCase?: boolean
): Promise<void> {
  if (!isChangingCase) {
    if (force) {
      await remove(dest);
    }
    else if (await exists(dest)) {
      throw new Error('dest already exists.');
    }
  }

  try {
    // Try w/ rename first, and try copy + remove if EXDEV
    await rename(src, dest);
  }
  catch (err: any) {
    if (err.code !== 'EXDEV') {
      throw err;
    }

    // move across device
    await copy(src, dest, {
      force,
      errorOnExist: true,
      preserveTimestamps: true
    });
    await remove(src);
  }
}

function doRenameSync(
  src: string,
  dest: string,
  force: boolean,
  isChangingCase?: boolean
): void {
  if (!isChangingCase) {
    if (force) {
      removeSync(dest);
    }
    else if (existsSync(dest)) {
      throw new Error('dest already exists.');
    }
  }

  try {
    renameSync(src, dest);
  }
  catch (err: any) {
    if (err.code !== 'EXDEV') {
      throw err;
    }

    // move across device
    copySync(src, dest, {
      force,
      errorOnExist: true,
      preserveTimestamps: true
    });
    return removeSync(src);
  }
}

async function move(
  src: string,
  dest: string,
  opts: MoveOptions = {}
): Promise<void> {
  const force = opts.force || opts.clobber || false;

  const { srcStat, isChangingCase = false } = await checkPaths(src, dest, 'move', opts);

  await checkParentPaths(src, srcStat, dest, 'move');

  // If the parent of dest is not root, make sure it exists before proceeding
  const destParent = dirname(dest);
  const parsedParentPath = parsePath(destParent);
  if (parsedParentPath.root !== destParent) {
    await makeDir(destParent);
  }

  return doRename(src, dest, force, isChangingCase);
}

function moveSync(
  src: string,
  dest: string,
  opts: MoveOptions = {}
): void {
  const force = opts.force || opts.clobber || false;

  const { srcStat, isChangingCase = false } = checkPathsSync(src, dest, 'move', opts);
  checkParentPathsSync(src, srcStat, dest, 'move');

  // If the parent of dest is not root, make sure it exists before proceeding
  const destParent = dirname(dest);
  const parsedParentPath = parsePath(destParent);
  if (parsedParentPath.root !== destParent) {
    makeDirSync(destParent);
  }

  return doRenameSync(src, dest, force, isChangingCase);
}

export {
  move,
  MoveOptions,
  moveSync
};
