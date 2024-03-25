import {
  BigIntStats,
  chmodSync,
  copyFileSync,
  CopyOptions,
  existsSync,
  lstatSync,
  opendirSync,
  PathLike,
  readlinkSync,
  Stats,
  statSync,
  symlinkSync,
  unlinkSync,
  utimesSync
} from 'node:fs';
import {
  chmod,
  copyFile,
  lstat,
  opendir,
  readlink,
  stat,
  symlink,
  unlink,
  utimes
} from 'node:fs/promises';
import {
  dirname,
  isAbsolute,
  join,
  resolve
} from 'node:path';

import { exists } from './exists';
import { makeDir, makeDirSync } from './makeDir';
import {
  checkParentPaths,
  checkParentPathsSync,
  checkPaths,
  checkPathsSync,
  isSrcSubdir
} from './util/stat';

async function copyDir(
  src: string,
  dest: string,
  opts: CopyOptions
): Promise<void> {
  const dir = await opendir(src);

  for await (const { name } of dir) {
    const srcItem = join(src, name);
    const destItem = join(dest, name);
    const { destStat, skipped } = await checkPaths(srcItem, destItem, 'copy', opts);
    if (!skipped) {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      await getStatsForCopy(destStat, srcItem, destItem, opts);
    }
  }
}

function copyDirSync(
  src: string,
  dest: string,
  opts: CopyOptions
): void {
  const dir = opendirSync(src);

  try {
    let dirent;

    while ((dirent = dir.readSync()) !== null) {
      const { name } = dirent;
      const srcItem = join(src, name);
      const destItem = join(dest, name);
      const { destStat, skipped } = checkPathsSync(srcItem, destItem, 'copy', opts);
      if (!skipped) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        getStatsForCopySync(destStat, srcItem, destItem, opts);
      }
    }
  }
  finally {
    dir.closeSync();
  }
}

async function mkDirAndCopy(
  srcMode: number,
  src: string,
  dest: string,
  opts: CopyOptions
): Promise<void> {
  await makeDir(dest);
  await copyDir(src, dest, opts);
  return chmod(dest, srcMode);
}

function mkDirAndCopySync(
  srcMode: number,
  src: string,
  dest: string,
  opts: CopyOptions
): void {
  makeDirSync(dest);
  copyDirSync(src, dest, opts);
  return chmodSync(dest, srcMode);
}

function onDir(
  srcStat: Stats | BigIntStats,
  destStat: Stats | BigIntStats,
  src: string,
  dest: string,
  opts: CopyOptions
): Promise<void> {
  if (!destStat) {
    return mkDirAndCopy(Number(srcStat.mode), src, dest, opts);
  }
  return copyDir(src, dest, opts);
}

function onDirSync(
  srcStat: Stats | BigIntStats,
  destStat: Stats | BigIntStats,
  src: string,
  dest: string,
  opts: CopyOptions
): void {
  if (!destStat) {
    return mkDirAndCopySync(Number(srcStat.mode), src, dest, opts);
  }
  return copyDirSync(src, dest, opts);
}

function fileIsNotWritable(srcMode: number): boolean {
  return (srcMode & 0o200) === 0;
}

async function setDestTimestamps(src: PathLike, dest: PathLike): Promise<void> {
  // The initial srcStat.atime cannot be trusted
  // because it is modified by the read(2) system call
  // (See https://nodejs.org/api/fs.html#fs_stat_time_values)
  const updatedSrcStat = await stat(src);
  return utimes(dest, updatedSrcStat.atime, updatedSrcStat.mtime);
}

function setDestTimestampsSync(src: PathLike, dest: PathLike): void {
  // The initial srcStat.atime cannot be trusted
  // because it is modified by the read(2) system call
  // (See https://nodejs.org/api/fs.html#fs_stat_time_values)
  const updatedSrcStat = statSync(src);
  return utimesSync(dest, updatedSrcStat.atime, updatedSrcStat.mtime);
}

async function handleTimestampsAndMode(
  srcMode: number,
  src: PathLike,
  dest: PathLike
): Promise<void> {
  // Make sure the file is writable before setting the timestamp
  // otherwise open fails with EPERM when invoked with 'r+'
  // (through utimes call)
  if (fileIsNotWritable(srcMode)) {
    // Make sure the file is writable
    await chmod(dest, srcMode | 0o200);
  }
  return setDestTimestamps(src, dest);
}

function handleTimestampsAndModeSync(
  srcMode: number,
  src: PathLike,
  dest: PathLike
) {
  // Make sure the file is writable before setting the timestamp
  // otherwise open fails with EPERM when invoked with 'r+'
  // (through utimes call)
  if (fileIsNotWritable(srcMode)) {
    // Make sure the file is writable
    chmodSync(dest, srcMode | 0o200);
  }
  return setDestTimestampsSync(src, dest);
}

async function _copyFile(
  srcStat: Stats | BigIntStats,
  src: PathLike,
  dest: PathLike,
  opts: CopyOptions
): Promise<void> {
  await copyFile(src, dest, opts.mode);
  const mode = Number(srcStat.mode);
  if (opts.preserveTimestamps) {
    await handleTimestampsAndMode(mode, src, dest);
  }
  return chmod(dest, mode);
}

function _copyFileSync(
  srcStat: Stats | BigIntStats,
  src: PathLike,
  dest: PathLike,
  opts: CopyOptions
): void {
  copyFileSync(src, dest, opts.mode);
  const mode = Number(srcStat.mode);
  if (opts.preserveTimestamps) {
    handleTimestampsAndModeSync(mode, src, dest);
  }
  return chmodSync(dest, mode);
}

async function mayCopyFile(
  srcStat: Stats | BigIntStats,
  src: PathLike,
  dest: PathLike,
  opts: CopyOptions
) {
  if (opts.force) {
    await unlink(dest);
    return _copyFile(srcStat, src, dest, opts);
  }
  else if (opts.errorOnExist) {
    throw new Error(`${dest} already exists`);
  }
}

function mayCopyFileSync(
  srcStat: Stats | BigIntStats,
  src: PathLike,
  dest: PathLike,
  opts: CopyOptions
) {
  if (opts.force) {
    unlinkSync(dest);
    return _copyFileSync(srcStat, src, dest, opts);
  }
  else if (opts.errorOnExist) {
    throw new Error(`${dest} already exists`);
  }
}

function onFile(
  srcStat: Stats | BigIntStats,
  destStat: Stats | BigIntStats,
  src: PathLike,
  dest: PathLike,
  opts: CopyOptions
): Promise<void> {
  if (!destStat) {
    return _copyFile(srcStat, src, dest, opts);
  }
  return mayCopyFile(srcStat, src, dest, opts);
}

function onFileSync(
  srcStat: Stats | BigIntStats,
  destStat: Stats | BigIntStats,
  src: PathLike,
  dest: PathLike,
  opts: CopyOptions
) {
  if (!destStat) {
    return _copyFileSync(srcStat, src, dest, opts);
  }
  return mayCopyFileSync(srcStat, src, dest, opts);
}

async function copyLink(resolvedSrc: PathLike, dest: PathLike): Promise<void> {
  await unlink(dest);
  return symlink(resolvedSrc, dest);
}

function copyLinkSync(resolvedSrc: PathLike, dest: PathLike): void {
  unlinkSync(dest);
  return symlinkSync(resolvedSrc, dest);
}

async function onLink(
  destStat: Stats | BigIntStats,
  src: string,
  dest: string,
  opts: CopyOptions
): Promise<void> {
  let resolvedSrc = await readlink(src);
  if (!opts.verbatimSymlinks && !isAbsolute(resolvedSrc)) {
    resolvedSrc = resolve(dirname(src), resolvedSrc);
  }
  if (!destStat) {
    return symlink(resolvedSrc, dest);
  }
  let resolvedDest;
  try {
    resolvedDest = await readlink(dest);
  }
  catch (err: any) {
    // Dest exists and is a regular file or directory,
    // Windows may throw UNKNOWN error. If dest already exists,
    // fs throws error anyway, so no need to guard against it here.
    if (err.code === 'EINVAL' || err.code === 'UNKNOWN') {
      return symlink(resolvedSrc, dest);
    }
    throw err;
  }
  if (!isAbsolute(resolvedDest)) {
    resolvedDest = resolve(dirname(dest), resolvedDest);
  }
  if (isSrcSubdir(resolvedSrc, resolvedDest)) {
    throw new Error(`cannot copy ${resolvedSrc} to a subdirectory of self `
            + `${resolvedDest}`);
  }
  // Do not copy if src is a subdir of dest since unlinking
  // dest in this case would result in removing src contents
  // and therefore a broken symlink would be created.
  if ((await stat(dest)).isDirectory() && isSrcSubdir(resolvedDest, resolvedSrc)) {
    throw new Error(`cannot overwrite ${resolvedDest} with ${resolvedSrc}`);
  }
  return copyLink(resolvedSrc, dest);
}

function onLinkSync(
  destStat: Stats | BigIntStats,
  src: string,
  dest: string,
  opts: CopyOptions
): void {
  let resolvedSrc = readlinkSync(src);
  if (!opts.verbatimSymlinks && !isAbsolute(resolvedSrc)) {
    resolvedSrc = resolve(dirname(src), resolvedSrc);
  }
  if (!destStat) {
    return symlinkSync(resolvedSrc, dest);
  }
  let resolvedDest;
  try {
    resolvedDest = readlinkSync(dest);
  }
  catch (err: any) {
    // Dest exists and is a regular file or directory,
    // Windows may throw UNKNOWN error. If dest already exists,
    // fs throws error anyway, so no need to guard against it here.
    if (err.code === 'EINVAL' || err.code === 'UNKNOWN') {
      return symlinkSync(resolvedSrc, dest);
    }
    throw err;
  }
  if (!isAbsolute(resolvedDest)) {
    resolvedDest = resolve(dirname(dest), resolvedDest);
  }
  if (isSrcSubdir(resolvedSrc, resolvedDest)) {
    throw new Error(`cannot copy ${resolvedSrc} to a subdirectory of self `
          + `${resolvedDest}`);
  }
  // Prevent copy if src is a subdir of dest since unlinking
  // dest in this case would result in removing src contents
  // and therefore a broken symlink would be created.
  if (statSync(dest).isDirectory() && isSrcSubdir(resolvedDest, resolvedSrc)) {
    throw new Error(`cannot overwrite ${resolvedDest} with ${resolvedSrc}`);
  }
  return copyLinkSync(resolvedSrc, dest);
}

async function getStatsForCopy(
  destStat: Stats | BigIntStats,
  src: string,
  dest: string,
  opts: CopyOptions
): Promise<void> {
  const statFn = opts.dereference ? stat : lstat;
  const srcStat = await statFn(src);

  if (srcStat.isDirectory()) {
    if (opts.recursive) {
      return onDir(srcStat, destStat, src, dest, opts);
    }
    throw new Error(`${src} is a directory (not copied)`);
  }
  else if (srcStat.isFile()
        || srcStat.isCharacterDevice()
        || srcStat.isBlockDevice()) {
    return onFile(srcStat, destStat, src, dest, opts);
  }
  else if (srcStat.isSymbolicLink()) {
    return onLink(destStat, src, dest, opts);
  }
  else if (srcStat.isSocket()) {
    throw new Error(`cannot copy a socket file: ${dest}`);
  }
  else if (srcStat.isFIFO()) {
    throw new Error(`cannot copy a FIFO pipe: ${dest}`);
  }
  throw new Error(`cannot copy an unknown file type: ${dest}`);
}

function getStatsForCopySync(
  destStat: Stats | BigIntStats,
  src: string,
  dest: string,
  opts: CopyOptions
): void {
  const statSyncFn = opts.dereference ? statSync : lstatSync;
  const srcStat = statSyncFn(src);

  if (srcStat.isDirectory()) {
    if (opts.recursive) {
      return onDirSync(srcStat, destStat, src, dest, opts);
    }
    throw new Error(`${src} is a directory (not copied)`);
  }
  else if (srcStat.isFile()
        || srcStat.isCharacterDevice()
        || srcStat.isBlockDevice()) {
    return onFileSync(srcStat, destStat, src, dest, opts);
  }
  else if (srcStat.isSymbolicLink()) {
    return onLinkSync(destStat, src, dest, opts);
  }
  else if (srcStat.isSocket()) {
    throw new Error(`cannot copy a socket file: ${dest}`);
  }
  else if (srcStat.isFIFO()) {
    throw new Error(`cannot copy a FIFO pipe: ${dest}`);
  }
  throw new Error(`cannot copy an unknown file type: ${dest}`);
}

async function checkParentDir(
  destStat: Stats | BigIntStats,
  src: string,
  dest: string,
  opts: CopyOptions
): Promise<void> {
  const destParent = dirname(dest);
  if (!(await exists(destParent))) {
    await makeDir(destParent);
  }
  return getStatsForCopy(destStat, src, dest, opts);
}

function checkParentDirSync(
  destStat: Stats | BigIntStats,
  src: string,
  dest: string,
  opts: CopyOptions
): void {
  const destParent = dirname(dest);
  if (!existsSync(destParent)) {
    makeDirSync(destParent);
  }
  return getStatsForCopySync(destStat, src, dest, opts);
}

const defaultCopyOptions = { recursive: true };
function defaultOptions(opts?: CopyOptions): CopyOptions {
  opts = Object.assign(defaultCopyOptions, opts);

  // Warn about using preserveTimestamps on 32-bit node
  if (opts.preserveTimestamps && process.arch === 'ia32') {
    const warning = 'Using the preserveTimestamps option in 32-bit '
      + 'node is not recommended';
    process.emitWarning(warning, 'TimestampPrecisionWarning');
  }

  return opts;
}

async function copy(
  src: string,
  dest: string,
  opts?: CopyOptions
): Promise<void> {
  opts = defaultOptions(opts);
  const { srcStat, destStat, skipped } = await checkPaths(src, dest, 'copy', opts);
  if (skipped) {
    return;
  }
  await checkParentPaths(src, srcStat, dest, 'copy');
  return checkParentDir(destStat, src, dest, opts);
}

function copySync(
  src: string,
  dest: string,
  opts?: CopyOptions
): void {
  opts = defaultOptions(opts);
  const { srcStat, destStat, skipped } = checkPathsSync(src, dest, 'copy', opts);
  if (skipped) {
    return;
  }
  checkParentPathsSync(src, srcStat, dest, 'copy');
  return checkParentDirSync(destStat, src, dest, opts);
}

export {
  copy,
  copySync
};
