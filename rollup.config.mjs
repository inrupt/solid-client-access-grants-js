// The following is only possible from Node 18 onwards
// import pkg from "./package.json" assert { type: "json" };

// Until we only support Node 18+, this should be used instead
// (see https://rollupjs.org/guide/en/#importing-packagejson) 
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pkg = require('./package.json');

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
      "./src/resource/index.ts",
      "./src/gConsent/discover/index.ts",
      "./src/gConsent/manage/index.ts",
      "./src/gConsent/request/index.ts",
      "./src/common/verify/index.ts",
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
      "./src/type/AccessModes.ts",
      "./src/type/FetchOptions.ts",
      "./src/type/RecursivePartial.ts",
      "./src/type/RedirectOptions.ts",
      "./src/type/UmaConfiguration.ts",
      "./src/type/ResourceAccessMode.ts",
      "./src/gConsent/type/AccessGrant.ts",
      "./src/gConsent/type/AccessBaseOptions.ts",
      "./src/gConsent/type/AccessCredentialType.ts",
      "./src/gConsent/type/AccessGrantContext.ts",
      "./src/gConsent/type/AccessRequest.ts",
      "./src/gConsent/type/AccessVerifiableCredential.ts",
      "./src/gConsent/type/GConsentStatus.ts",
      "./src/gConsent/type/IssueAccessRequestParameters.ts",
      "./src/gConsent/type/Parameter.ts",
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
