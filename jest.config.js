module.exports = {
  // This combination of preset/transformIgnorePatterns enforces that both TS and
  // JS files are transformed to CJS, and that the transform also applies to the
  // dependencies in the node_modules, so that ESM-only dependencies are supported.
  preset: "ts-jest/presets/js-with-ts",
  // deliberately set to an empty array to allow including node_modules when transforming code:
  transformIgnorePatterns: ["/node_modules/(?!jose/dist/browser/)"],
  modulePathIgnorePatterns: ["dist/", "<rootDir>/examples/"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
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
