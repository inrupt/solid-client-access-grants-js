module.exports = {
  preset: "ts-jest",
  // this test environment adds TextEncoder to jsdom, which we require.
  testEnvironment: "<rootDir>/tests/environment/customEnvironment.js",
  clearMocks: true,
  injectGlobals: false,
  collectCoverage: true,
  coverageReporters: process.env.CI ? ["text", "lcov"] : ["text"],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};
