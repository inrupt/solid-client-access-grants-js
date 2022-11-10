import type { Config } from 'jest';

type ArrayElement<ArrayLike> = ArrayLike extends Array<infer T> ? T : never; 

const baseConfig: ArrayElement<NonNullable<Config["projects"]>> = {
  modulePathIgnorePatterns: ["dist/", "<rootDir>/examples/"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  clearMocks: true,
  injectGlobals: false,
  preset: "ts-jest",
};

export default {
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
  projects: [{
    ...baseConfig,
    displayName: "browser",
    testEnvironment: "jsdom",
    testPathIgnorePatterns: ["e2e", "node.test.ts"],
    // // This combination of preset/transformIgnorePatterns enforces that both TS and
    // // JS files are transformed to CJS, and that the transform also applies to the
    // // dependencies in the node_modules, so that ESM-only dependencies are supported.
    preset: "ts-jest/presets/js-with-ts",
    // // deliberately set to an empty array to allow including node_modules when transforming code:
    transformIgnorePatterns: ["/node_modules/(?!jose/dist/browser/)"], // "/node_modules/(?!jose/dist/browser/)"
  }, {
    ...baseConfig,
    displayName: "node",
    testEnvironment: "node",
    testPathIgnorePatterns: ["e2e", "browser.test.ts"],
  }]
} as Config
