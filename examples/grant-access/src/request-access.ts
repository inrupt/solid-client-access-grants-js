// Copyright 2021 Inrupt Inc.
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

/* eslint-disable no-console */

import { Session } from "@inrupt/solid-client-authn-node";
import { config } from "dotenv-flow";
import { fetch as crossFetch } from "cross-fetch";

import express from "express";
import {
  issueAccessRequest,
  redirectToAccessManagementUi,
  getFile,
} from "../../../dist/index";

const REQUEST_ACCESS_DEFAULT_PORT = 3001;
const GRANT_ACCESS_PORT = 3002;

// Load env variables
config();
const REQUEST_ACCESS_PORT =
  process.env.REQUEST_ACCESS_PORT ?? REQUEST_ACCESS_DEFAULT_PORT;

const app = express();
// Support parsing application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// This is the endpoint our NodeJS demo app listens on to receive incoming login
const redirectUrl = new URL("/redirect", "http://localhost");
redirectUrl.port = `${REQUEST_ACCESS_PORT}`;
const REDIRECT_URL = redirectUrl.href;

app.get("/", async (req, res, next) => {
  res.send(
    `<form action="/request", method="post">
      <div>
        <label for="name">Target resource:</label>
        <input type="url" name="resource" id="resource" required>
      </div>
      <div>
        <label for="owner">Owner WebID</label>
        <input type="url" name="owner" id="owner" required>
      </div>
      <div>
        <input type="submit" value="Request consent">
      </div>
    </form>`
  );
});

app.post("/request", async (req, res) => {
  const session = new Session();
  await session.login({
    clientId: process.env.REQUESTOR_CLIENT_ID,
    clientSecret: process.env.REQUESTOR_CLIENT_SECRET,
    oidcIssuer: process.env.REQUESTOR_OIDC_ISSUER,
  });

  const consentRequest = await issueAccessRequest(
    {
      access: { read: true },
      purpose: ["https://some.purpose", "https://some.other.purpose"],
      requestor: session.info.webId as string,
      resourceOwner: req.body.owner,
      resources: [req.body.resource],
    },
    {
      fetch: session.fetch,
    }
  );
  await redirectToAccessManagementUi(consentRequest, REDIRECT_URL, {
    redirectCallback: (url) => {
      console.log(`redirecting to ${url}`);
      res.redirect(url);
    },
    // The following IRI redirects the user to PodBrowser so that they can approve/reny the request.
    // fallbackConsentManagementUi: `https://podborowser.inrupt.com/privacy/consent/requests/`,
    // The following IRI redirects to the IRI used by the examples/grant-access demo.
    fallbackConsentManagementUi: `http://localhost:${GRANT_ACCESS_PORT}/manage/`,
    // Note: the following is only necessary because this projects depends for testing puspose
    // on solid-client-authn-browser, which is picked up automatically for convenience in
    // browser-side apps. A typical node app would not have this dependence.
    fetch: crossFetch,
  });
});

app.get("/redirect", async (req, res) => {
  const session = new Session();
  await session.login({
    clientId: process.env.REQUESTOR_CLIENT_ID,
    clientSecret: process.env.REQUESTOR_CLIENT_SECRET,
    oidcIssuer: process.env.REQUESTOR_OIDC_ISSUER,
    // Note that using a Bearer token is mandatory for the UMA access token to be valid.
    tokenType: "Bearer",
  });
  const { accessGrant } = req.query;
  const decodedAccessGrant = JSON.parse(atob(accessGrant as string));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const targetResource = (decodedAccessGrant as any).credentialSubject
    .providedConsent.forPersonalData[0];
  const file = await getFile(targetResource, decodedAccessGrant, {
    fetch: session.fetch,
  });
  const fileContent = await file.text();

  res.send(`<div>
    <p>Redirected with access grant: </p>
    <pre>${JSON.stringify(
      JSON.parse(atob(accessGrant as string)),
      undefined,
      "  "
    )}</pre>
    <hr/>
    <p>Fetched file content: </p>
    <pre>${fileContent}</pre>
  <div>`);
});

app.listen(REQUEST_ACCESS_PORT, async () => {
  console.log(`Listening on [${REQUEST_ACCESS_PORT}]...`);
});
