/* Config file to run just end-to-end tests */

module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  clearMocks: true,
  // Because we're making HTTP requests that can take a while, tests should be
  // given a little longer to complete:
  testTimeout: 15000,
  testRegex: "e2e/node/.*.test.ts",
  injectGlobals: false,
};
