// Copyright Inrupt Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
// Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

import pkg from "./package.json" with { type: "json" };

import typescript from "rollup-plugin-typescript2";

const external = [
  ...Object.keys(pkg.dependencies || {}),
  "@inrupt/solid-client-authn-browser",
];

const plugins = [
  typescript({
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
