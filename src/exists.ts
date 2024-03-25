import { PathLike } from 'node:fs';
import { stat } from 'node:fs/promises';

export async function exists(dest: PathLike): Promise<boolean> {
  try {
    await stat(dest);
    return true;
  }
  catch (err: any) {
    if (err.code === 'ENOENT') {
      return false;
    }
    throw err;
  }
}

export { existsSync } from 'node:fs';
