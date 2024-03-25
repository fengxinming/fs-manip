import { BigIntStats, lstatSync, PathLike, Stats, statSync } from 'node:fs';
import { lstat, stat } from 'node:fs/promises';
import { basename, dirname, parse as parsePath, resolve, sep } from 'node:path';

function getStats(src: PathLike, dest: PathLike, opts: Record<string, any>): Promise<[BigIntStats, BigIntStats|null]> {
  const statFunc = opts.dereference
    ? (file: PathLike) => stat(file, { bigint: true })
    : (file: PathLike) => lstat(file, { bigint: true });
  return Promise.all([
    statFunc(src),
    statFunc(dest).catch((err) => {
      if (err.code === 'ENOENT') {
        return null;
      }
      throw err;
    })
  ]);
}

function getStatsSync(src: PathLike, dest: PathLike, opts: Record<string, any>): [BigIntStats, BigIntStats|null] {
  let destStat;
  const statFunc = opts.dereference
    ? (file) => statSync(file, { bigint: true })
    : (file) => lstatSync(file, { bigint: true });
  const srcStat = statFunc(src);
  try {
    destStat = statFunc(dest);
  }
  catch (err: any) {
    if (err.code === 'ENOENT') {
      return [srcStat, null];
    }
    throw err;
  }
  return [srcStat, destStat];
}

function areIdentical(srcStat: Stats | BigIntStats, destStat: Stats | BigIntStats): bigint | number | boolean {
  return destStat.ino && destStat.dev && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev;
}

function normalizePathToArray(path: string): string[] {
  return resolve(path).split(sep).filter(Boolean);
}

// return true if dest is a subdir of src, otherwise false.
// It only checks the path strings.
function isSrcSubdir(src: string, dest: string): boolean {
  const srcArr = normalizePathToArray(src);
  const destArr = normalizePathToArray(dest);
  return srcArr.every((cur, i) => destArr[i] === cur);
}

function errMsg(src: string, dest: string, funcName: string): string {
  return `Cannot ${funcName} '${src}' to a subdirectory of itself, '${dest}'.`;
}

function checkStat(
  src: string,
  srcStat: BigIntStats,
  dest: string,
  destStat: BigIntStats|null,
  funcName: string,
): Record<string, any> {
  if (destStat) {
    if (areIdentical(srcStat, destStat)) {
      const srcBaseName = basename(src);
      const destBaseName = basename(dest);
      if (funcName === 'move'
          && srcBaseName !== destBaseName
          && srcBaseName.toLowerCase() === destBaseName.toLowerCase()) {
        return { srcStat, destStat, isChangingCase: true };
      }
      throw new Error('Source and destination must not be the same.');
    }
    if (srcStat.isDirectory() && !destStat.isDirectory()) {
      throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`);
    }
    if (!srcStat.isDirectory() && destStat.isDirectory()) {
      throw new Error(`Cannot overwrite directory '${dest}' with non-directory '${src}'.`);
    }
  }

  if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
    throw new Error(errMsg(src, dest, funcName));
  }

  return { srcStat, destStat };
}

async function checkPaths(
  src: string,
  dest: string,
  funcName: string,
  opts: Record<string, any>
): Promise<Record<string, any>> {
  if (opts.filter && !(await opts.filter(src, dest))) {
    return { skipped: true };
  }
  const [srcStat, destStat] = await getStats(src, dest, opts);
  return checkStat(src, srcStat, dest, destStat, funcName);
}

function checkPathsSync(
  src: string,
  dest: string,
  funcName: string,
  opts: Record<string, any>
): Record<string, any> {
  if (opts.filter && !opts.filter(src, dest)) {
    return { skipped: true };
  }

  const [srcStat, destStat] = getStatsSync(src, dest, opts);
  return checkStat(src, srcStat, dest, destStat, funcName);
}

// recursively check if dest parent is a subdirectory of src.
// It works for all file types including symlinks since it
// checks the src and dest inodes. It starts from the deepest
// parent and stops once it reaches the src parent or the root path.
async function checkParentPaths(
  src: string,
  srcStat: Stats | BigIntStats,
  dest: string,
  funcName: string
): Promise<void> {
  const srcParent = resolve(dirname(src));
  const destParent = resolve(dirname(dest));
  if (destParent === srcParent || destParent === parsePath(destParent).root) {
    return;
  }

  let destStat;
  try {
    destStat = await stat(destParent, { bigint: true });
  }
  catch (err: any) {
    if (err.code === 'ENOENT') {
      return;
    }
    throw err;
  }

  if (areIdentical(srcStat, destStat)) {
    throw new Error(errMsg(src, dest, funcName));
  }

  return checkParentPaths(src, srcStat, destParent, funcName);
}

function checkParentPathsSync(
  src: string,
  srcStat: Stats | BigIntStats,
  dest: string,
  funcName: string
): void {
  const srcParent = resolve(dirname(src));
  const destParent = resolve(dirname(dest));
  if (destParent === srcParent || destParent === parsePath(destParent).root) {
    return;
  }
  let destStat;
  try {
    destStat = statSync(destParent, { bigint: true });
  }
  catch (err: any) {
    if (err.code === 'ENOENT') {
      return;
    }
    throw err;
  }
  if (areIdentical(srcStat, destStat)) {
    throw new Error(errMsg(src, dest, funcName));
  }
  return checkParentPathsSync(src, srcStat, destParent, funcName);
}

export {
  areIdentical,
  // checkParent
  checkParentPaths,
  checkParentPathsSync,
  checkPaths,
  checkPathsSync,
  // Misc
  isSrcSubdir
};
