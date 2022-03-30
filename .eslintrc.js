module.exports = {
  extends: ["@inrupt/eslint-config-lib"],
  rules: {
    "import/prefer-default-export": "off",
  },
  settings: {
    "import/extensions": [".mjs", ".js"],
    "import/resolver": {
      node: {
        extensions: [".mjs", ".ts"],
        moduleDirectory: [
          "src",
          "node_modules",
          "examples/grant-access/node_modules",
          "e2e/browser/src/node_modules"
        ]
      },
    },
  },
  overrides: [
    {
      files: "examples/**/*",
      rules: {
        "import/no-unresolved": "off",
      },
    },
  ],
  parserOptions: {
    project: "./tsconfig.eslint.json",
  },
};
