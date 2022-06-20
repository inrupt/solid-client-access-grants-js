//
// Copyright 2022 Inrupt Inc.
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

/* eslint-disable no-console */

import { Session } from "@inrupt/solid-client-authn-node";
import { fetch as crossFetch } from "cross-fetch";
import express from "express";
import {
  issueAccessRequest,
  redirectToAccessManagementUi,
  getFile,
  getAccessGrantFromRedirectUrl,
} from "@inrupt/solid-client-access-grants";
import { getConfig } from "./getConfig";
import "./polyfill/node14";

// Load env variables
const config = getConfig();

// Setup app
const app = express();
app.set("view engine", "ejs");
// Support parsing application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

app.get("/", async (req, res) => {
  res.render("request-form");
});

app.post("/request", async (req, res) => {
  const session = new Session();
  await session.login({
    clientId: process.env.REQUESTOR_CLIENT_ID,
    clientSecret: process.env.REQUESTOR_CLIENT_SECRET,
    oidcIssuer: process.env.REQUESTOR_OIDC_ISSUER,
  });

  const accessRequest = await issueAccessRequest(
    {
      access: { read: true },
      purpose: ["https://some.purpose", "https://some.other.purpose"],
      resourceOwner: req.body.owner,
      resources: [req.body.resource],
    },
    {
      fetch: session.fetch as typeof fetch,
      accessEndpoint: "https://vc.inrupt.com",
    }
  );

  await redirectToAccessManagementUi(
    accessRequest,
    new URL("/redirect", config.request.href).href,
    {
      redirectCallback: (url) => {
        console.log(`Redirecting to ${url}`);
        res.redirect(url);
      },
      // The following IRI redirects the user to PodBrowser so that they can approve/reny the request.
      // fallbackAccessManagementUi: `https://podborowser.inrupt.com/privacy/consent/requests/`,
      // The following IRI redirects to the IRI used by the examples/grant-access demo.
      fallbackAccessManagementUi: `${
        new URL("/manage", config.grant.href).href
      }`,
      // Note: the following is only necessary because this projects depends for testing puspose
      // on solid-client-authn-browser, which is picked up automatically for convenience in
      // browser-side apps. A typical node app would not have this dependence.
      fetch: crossFetch,
    }
  );
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

  const accessGrant = await getAccessGrantFromRedirectUrl(
    new URL(req.url, config.request.href).toString(),
    {
      fetch: session.fetch as typeof fetch,
    }
  );
  const targetResource = (
    accessGrant.credentialSubject.providedConsent as {
      forPersonalData: Array<string>;
    }
  ).forPersonalData[0];
  const file = await getFile(targetResource, accessGrant, {
    fetch: session.fetch as typeof fetch,
  });
  const fileContent = await file.text();

  res.render("granted", { accessGrant, fileContent });
});

app.listen(config.request.port, async () => {
  console.log(`Listening on [${config.request.port}]...`);
});
