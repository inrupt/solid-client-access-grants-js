import pkg from "./package.json";
import typescript from "rollup-plugin-typescript2";

const external = [
  ...Object.keys(pkg.dependencies || {}),
  "@inrupt/solid-client-authn-browser",
];

const plugins = [
  typescript({
    // Use our own version of TypeScript, rather than the one bundled with the plugin:
    typescript: require("typescript"),
    tsconfigOverride: {
      compilerOptions: {
        module: "esnext",
      },
    },
  }),
];

const rollupDefaultConfig = { external, plugins };

export default [
  {
    input: "./src/index.ts",
    output: [
      {
        file: pkg.main,
        format: "cjs",
      },
      {
        file: pkg.module,
        entryFileNames: "[name].es.js",
        format: "esm",
      },
      {
        dir: "umd",
        format: "umd",
        name: "SolidAccess",
      },
    ],
    ...rollupDefaultConfig,
  },
  {
    input: [
      "./src/index.ts",
      "./src/discover/index.ts",
      "./src/manage/index.ts",
      "./src/request/index.ts",
      "./src/resource/index.ts",
      "./src/verify/index.ts",
    ],
    output: {
      dir: "dist",
      entryFileNames: "[name].mjs",
      format: "esm",
      preserveModules: true,
    },
    ...rollupDefaultConfig,
  },
  {
    input: [
      "./src/type/AccessBaseOptions.ts",
      "./src/type/AccessCredentialType.ts",
      "./src/type/AccessVerifiableCredential.ts",
      "./src/type/AccessGrantContext.ts",
      "./src/type/GConsentStatus.ts",
      "./src/type/FetchOptions.ts",
      "./src/type/Parameter.ts",
      "./src/type/RecursivePartial.ts",
      "./src/type/IssueAccessRequestParameters.ts",
      "./src/type/ResourceAccessMode.ts",
      "./src/type/UmaConfiguration.ts",
    ],
    output: {
      dir: "dist",
      entryFileNames: "[name].d.ts",
      format: "esm",
      preserveModules: true,
    },
    ...rollupDefaultConfig,
  },
];
