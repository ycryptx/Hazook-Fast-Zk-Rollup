module.exports = {
  /* eslint-disable global-require */
  preset: "ts-jest",
  roots: ["<rootDir>/__tests__"],
  testRegex: "__tests__\\/.*\\.test\\.ts$",
  moduleFileExtensions: ["js", "ts", "json", "node"],
  resetMocks: true,
  testEnvironment: "node",
  testTimeout: 30000,
};
