//
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

/* eslint-disable no-console, import/no-unresolved */

import { Session } from "@inrupt/solid-client-authn-node";
import express from "express";
import {
  approveAccessRequest,
  getAccessRequestFromRedirectUrl,
  redirectToRequestor,
} from "@inrupt/solid-client-access-grants";
import { getConfig } from "./getConfig";

// Load env variables
const config = getConfig();

// Setup app
const app = express();
app.set("view engine", "ejs");
// Support parsing application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// Receive the access request, and display a form to the user
app.get("/manage", async (req, res) => {
  const session = new Session();

  await session.login({
    clientId: process.env.OWNER_CLIENT_ID,
    clientSecret: process.env.OWNER_CLIENT_SECRET,
    oidcIssuer: process.env.OWNER_OIDC_ISSUER,
  });

  const { accessRequest, requestorRedirectUrl } =
    await getAccessRequestFromRedirectUrl(
      new URL(req.url, config.grant.href).href,
      {
        fetch: session.fetch,
      },
    );

  res.render("grant-form", { accessRequest, requestorRedirectUrl });
});

// Return the access grant to the requestor
// TODO: if the user denied access, deny access grant instead of approving.
app.post("/redirect", async (req, res) => {
  const session = new Session();
  await session.login({
    clientId: process.env.OWNER_CLIENT_ID,
    clientSecret: process.env.OWNER_CLIENT_SECRET,
    oidcIssuer: process.env.OWNER_OIDC_ISSUER,
  });

  const accessGrant = await approveAccessRequest(
    JSON.parse(req.body.requestVc),
    undefined,
    {
      fetch: session.fetch,
    },
  );
  const redirectUrl = new URL(decodeURI(req.body.redirectUrl));
  await redirectToRequestor(accessGrant.id, redirectUrl, {
    redirectCallback: (url) => {
      console.log(`redirecting to ${url}`);
      res.redirect(url);
    },
  });
});

app.listen(config.grant.port, async () => {
  // eslint-disable-next-line no-console
  console.log(`Listening on [${config.grant.port}]...`);
});
