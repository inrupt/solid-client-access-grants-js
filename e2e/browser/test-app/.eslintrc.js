module.exports = {
  // ESLint dependencies are resolved in the root package.
  extends: ["@inrupt/eslint-config-react", "next/core-web-vitals"],
  rules: {
    "react/jsx-filename-extension": [1, { "extensions": [".tsx"] }]
  }
}
