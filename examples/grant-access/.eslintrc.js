module.exports = {
  extends: ["../../.eslintrc.js"],
  rules: {
    "header/header": ["error", "../../resources/license-header.js"],
  },
  parserOptions: {
    project: "./tsconfig.eslint.json",
  },
};
