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

export default {
  compilerOptions: {
    skipLibCheck: true,
  },
  out: "docs/api/",
  // entryPointStrategy: "expand",
  entryPoints: [
    // The source files of everything listed under `exports` in our package.json
    // (i.e. public API's that should be documented) should be listed here:
    "src/index.ts",
    "src/resource/index.ts",
    // "src/fetch/index.ts",
    "src/common/index.ts",
    // "src/common/getters.ts",
    // "src/gConsent/index.ts",
    // "src/gConsent/constants.ts",
    // "src/gConsent/discover/index.ts",
    // "src/gConsent/manage/index.ts",
    // "src/gConsent/request/index.ts",
    // "src/gConsent/verify/index.ts",
    // // These types are reused across files, so give them a specific page for
    // // them to be documented on:
    // "src/type/RedirectOptions.ts",
    // "src/type/FetchOptions.ts",
    // "src/type/UmaConfiguration.ts",
    // "src/type/AccessGrant.ts",
    // "src/type/AccessModes.ts",
    // "src/gConsent/type/AccessBaseOptions.ts",
    // "src/gConsent/type/IssueAccessRequestParameters.ts",
    // "src/gConsent/type/Parameter.ts",
  ],
  exclude: [
    "node_modules/**",
    "**/*.test.ts",
    // Internal helpers:
    "**/*.internal.ts",
    // TODO Is this desired? It clashes with the includes.
    // Re-exported functions are already documented in their own modules:
    // "src/index.ts",
    // Constants are only used internally:
    // "src/constants.ts",
  ],
  // includeCategories: true,
  // options: {
  navigation: {
    includeCategories: true,
  },
  // },
};
