import inruptCfg, { ignoreTypedLinting } from "@inrupt/eslint-config-base"
import next from "@next/eslint-plugin-next"

import { defineConfig } from "eslint/config";

ignoreTypedLinting(["**/fixtures.ts"])

export default defineConfig([
  inruptCfg, {
    plugins: {
      '@next/next': next,
    },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs['core-web-vitals'].rules,
    },
    files:  ["e2e/browser/test-app/"]
  }
]);
