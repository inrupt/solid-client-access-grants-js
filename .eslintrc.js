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
