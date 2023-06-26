import { execSync } from 'child_process';

export const runShellCommand = (cmd: string): Buffer => {
  try {
    return execSync(cmd);
  } catch (err) {
    console.error(err);
    return undefined;
  }
};
