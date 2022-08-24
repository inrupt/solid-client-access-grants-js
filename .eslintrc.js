require("@rushstack/eslint-patch/modern-module-resolution");

module.exports = {
  extends: ["@inrupt/eslint-config-lib"],
  rules: {
    "import/prefer-default-export": "off",
  },
  overrides: [
    {
      // TODO: Extend to all files, this will soon be the default in eslint configs
      files: "src/resource/*.ts",
      rules: {
        "@typescript-eslint/return-await": ["error", "always"],
      },
    },
    {
      files: ["examples/**/*", "e2e/**/*"],
      rules: {
        "import/no-unresolved": "warn",
      },
    },
    {
      files: ["**/*.test.ts"],
      rules: {
        "no-shadow": [
          "warn",
          {
            allow: [
              "describe",
              "it",
              "jest",
              "expect",
              "beforeEach",
              "beforeAll",
              "afterEach",
              "afterAll",
            ],
          },
        ],
        // explicit any is currently required for jest module mocking:
        "@typescript-eslint/no-explicit-any": "off",
      },
    },
  ],
  parserOptions: {
    project: "./tsconfig.eslint.json",
  },
};
