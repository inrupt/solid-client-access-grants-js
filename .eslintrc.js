module.exports = {
  extends: ["@inrupt/eslint-config-lib"],
  rules: {
    "import/prefer-default-export": "off",
  },
  settings: {
    "import/extensions": [".mjs", ".js"],
    "import/resolver": {
      node: {
        extensions: [".mjs", ".ts", ".js", ".jsx"],
        moduleDirectory: [
          "src",
          "node_modules",
          "e2e/**/node_modules",
          "examples/**/node_modules",
        ]
      },
    },
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
