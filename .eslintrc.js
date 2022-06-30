require("@rushstack/eslint-patch/modern-module-resolution");

module.exports = {
  extends: ["@inrupt/eslint-config-lib"],
  rules: {
    "import/prefer-default-export": "off",
  },
  overrides: [
    {
      files: ["examples/**/*", "e2e/**/*"],
      rules: {
        "import/no-unresolved": "warn",
      },
    },
  ],
  parserOptions: {
    project: "./tsconfig.eslint.json",
  },
};
