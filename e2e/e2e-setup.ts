/**
 * Copyright 2022 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import { config } from "dotenv-flow";
import { join } from "path";

config({
  path: join(__dirname, "env"),
  // Disable warning messages in CI
  silent: process.env.CI === "true",
});

const availableEnvironment = [
  "ESS Dev-Next" as const,
  "ESS Production" as const,
];

export type AvailableEnvironment = typeof availableEnvironment extends Array<
  infer E
>
  ? E
  : never;

interface Client {
  id: string;
  secret: string;
}

export interface TestingEnvironmentNode {
  requestor: Client;
  resourceOwner: Client;
  environment: AvailableEnvironment;
  idp: string;
  vcProvider: string;
}

export interface TestingEnvironmentBrowser {
  login: string;
  password: string;
}

export interface EnvVariables {
  E2E_TEST_ENVIRONMENT: AvailableEnvironment;
  E2E_TEST_IDP: string;
  E2E_TEST_VC_SERVICE: string;
  E2E_TEST_REQUESTOR_CLIENT_ID: string;
  E2E_TEST_REQUESTOR_CLIENT_SECRET: string;
  E2E_TEST_RESOURCE_OWNER_CLIENT_ID: string;
  E2E_TEST_RESOURCE_OWNER_CLIENT_SECRET: string;
  E2E_TEST_UI_LOGIN: string | undefined;
  E2E_TEST_UI_PASSWORD: string | undefined;
}

function isTestingEnvironment(
  environment: unknown
): asserts environment is EnvVariables {
  if (
    !availableEnvironment.includes(
      (environment as EnvVariables).E2E_TEST_ENVIRONMENT as AvailableEnvironment
    )
  ) {
    throw new Error(
      `Unknown environment: [${
        (environment as EnvVariables).E2E_TEST_ENVIRONMENT
      }]`
    );
  }

  if (typeof (environment as EnvVariables).E2E_TEST_IDP !== "string") {
    throw new Error("The environment variable E2E_TEST_IDP is undefined.");
  }

  if (typeof (environment as EnvVariables).E2E_TEST_VC_SERVICE !== "string") {
    throw new Error(
      "The environment variable E2E_TEST_VC_SERVICE is undefined."
    );
  }

  if (
    typeof (environment as EnvVariables).E2E_TEST_REQUESTOR_CLIENT_ID !==
    "string"
  ) {
    throw new Error(
      "The environment variable E2E_TEST_REQUESTOR_CLIENT_ID is undefined."
    );
  }

  if (
    typeof (environment as EnvVariables).E2E_TEST_REQUESTOR_CLIENT_SECRET !==
    "string"
  ) {
    throw new Error(
      "The environment variable E2E_TEST_CLIENT_SECRET is undefined."
    );
  }

  if (
    typeof (environment as EnvVariables).E2E_TEST_RESOURCE_OWNER_CLIENT_ID !==
    "string"
  ) {
    throw new Error(
      "The environment variable E2E_TEST_RESOURCE_OWNER_CLIENT_ID is undefined."
    );
  }

  if (
    typeof (environment as EnvVariables)
      .E2E_TEST_RESOURCE_OWNER_CLIENT_SECRET !== "string"
  ) {
    throw new Error(
      "The environment variable E2E_TEST_CLIENT_SECRET is undefined."
    );
  }
}

export function getTestingEnvironmentNode(): TestingEnvironmentNode {
  isTestingEnvironment(process.env);

  return {
    idp: process.env.E2E_TEST_IDP,
    environment: process.env.E2E_TEST_ENVIRONMENT,
    vcProvider: process.env.E2E_TEST_VC_SERVICE,
    requestor: {
      id: process.env.E2E_TEST_REQUESTOR_CLIENT_ID,
      secret: process.env.E2E_TEST_REQUESTOR_CLIENT_SECRET,
    },
    resourceOwner: {
      id: process.env.E2E_TEST_RESOURCE_OWNER_CLIENT_ID,
      secret: process.env.E2E_TEST_RESOURCE_OWNER_CLIENT_SECRET,
    },
  };
}

export function getTestingEnvironmentBrowser(): TestingEnvironmentBrowser {
  isTestingEnvironment(process.env);
  if (process.env.E2E_TEST_UI_LOGIN === undefined) {
    throw new Error("The environment variable E2E_TEST_UI_LOGIN is undefined.");
  }
  if (process.env.E2E_TEST_UI_PASSWORD === undefined) {
    throw new Error("The environment variable E2E_TEST_UI_LOGIN is undefined.");
  }

  return {
    login: process.env.E2E_TEST_UI_LOGIN,
    password: process.env.E2E_TEST_UI_PASSWORD,
  };
}
