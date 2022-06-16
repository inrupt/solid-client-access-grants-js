module.exports = {
  preset: "ts-jest",
  // this test environment adds TextEncoder to jsdom, which we require.
  testEnvironment: "<rootDir>/tests/environment/customEnvironment.js",
  clearMocks: true,
  injectGlobals: false,
  collectCoverage: true,
  coverageReporters: ["text", "lcov"],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  coveragePathIgnorePatterns: ["/node_modules/", "<rootDir>/dist"],
  testPathIgnorePatterns: [
    "/node_modules/",
    // By default we only run unit tests:
    "/src/e2e-node/",
    "/src/e2e-browser/",
  ],
};
