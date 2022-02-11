# End-to-end tests for solid-client in the browser

This directory contains our browser-based end-to-end tests. The interaction
between the test script, which runs on the command line in Node, and the system
under test, which runs in the browser, is a bit involved, so here's a short
description of our setup.

There are two main parts:

- The system under test, which you can find under ./src side-by-side with these tests
- The test code, which you can find in this directory.

## The system under test

The system under test is our existing test application, which is also used to try our
library in the browser, and to verify whether the built code works after a pull
request.

One thing to note is that its dependency on solid-client-access-grants should be
on the code _inside this repository_, rather than fetched from `npm`. This is achieved
using `npm link` during the setup (see the installation section for the details).

## The test code

We use [Playwright](https://playwright.dev) to run our
browser-based end-to-end tests. It is configured in `playwright.config.ts` in
the root of this repository, where it is setup to run all tests defined in files
suffixed with `.playwright.ts` inside of `/e2e/browser/test/`. It also points to
`/e2e/browser/test/globalSetup.ts`, where it is told how to start the system
under test before running the test.

Essentially, the tests open the system under test in a browser, go through the
login procedure if they intend to make authenticated requests, and then interact
with the app UI, which calls to the library we want to test.

Note that the tests need the URL of a Pod and the credentials to log in to it.
These can be set via environment variables, or by creating a file
`.env.test.local` in this directory - see `.env.example` for an example.

## Running the tests

To run the tests, run:

1. `npm ci` at the root to install the test runner.
2. `npx playwright install` to download the latest versions of all browsers the
   tests run in. 3.`npm run test:e2e:browser:build` to install the dependencies of the
   application under test and link to the local library.

You can then run the tests using `npm run test:e2e:browser` at the root.

If you want to actually see the interactive parts, set `headless: false` in
`playwright.config.ts`. That said, most of the tests involve running code
without a UI component.

To only run tests in a specific browser, run one of:

    npm run test:e2e:browser -- --project=firefox
    npm run test:e2e:browser -- --project=chromium
    npm run test:e2e:browser -- --project=webkit
