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
  parserOptions: {
    project: "./tsconfig.eslint.json",
  },
};
