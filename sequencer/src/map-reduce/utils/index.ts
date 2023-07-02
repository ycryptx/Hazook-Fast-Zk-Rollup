import { execSync } from 'child_process';

export const runShellCommand = (cmd: string): string => {
  try {
    const result = execSync(cmd);
    return (result || '').toString();
  } catch (err) {
    console.error(err);
    return undefined;
  }
};
