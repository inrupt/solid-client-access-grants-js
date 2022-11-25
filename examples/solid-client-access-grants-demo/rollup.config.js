import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "rollup-plugin-typescript2";
import pkg from "../../package.json";

const external = [
  ...Object.keys(pkg.dependencies),
  "@inrupt/solid-client-authn-browser",
];

export default {
  input: "./src/static/main.ts",
  output: {
    file: "./static/javascript/main.js",
    format: "es",
  },
  external,
  plugins: [
    nodeResolve({ browser: true, preferBuiltins: false }),
    typescript({
      typescript: require("typescript"),
      tsconfig: "tsconfig.static.json",
    }),
  ],
};
