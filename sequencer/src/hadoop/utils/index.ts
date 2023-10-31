export const logger = (instance: string, msg: string): void => {
  console.error(`${new Date().toISOString()} ${instance}: ${msg}`);
};
