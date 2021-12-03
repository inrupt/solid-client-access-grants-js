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

import express from "express";
import { approveAccessRequest } from "../../../dist/index";

const GRANT_ACCESS_DEFAULT_PORT = 3002;

// Load env variables
config();
export const GRANT_ACCESS_PORT =
  process.env.GRANT_ACCESS_PORT ?? GRANT_ACCESS_DEFAULT_PORT;

const app = express();
// Support parsing application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// Receive the consent request, and display a form to the user
app.get("/manage", async (req, res) => {
  if (req.query.requestVc === undefined) {
    res.send(`Error: no 'requestVc' query parameter has been found.`);
    return;
  }
  if (req.query.redirectUrl === undefined) {
    res.send(`Error: no 'redirectUrl' query parameter has been found.`);
    return;
  }
  // The request VC is base64-encoded.
  const accessRequest = atob(req.query.requestVc as string);
  res.send(
    `<div><p>Here is the requested access:</p>
    <pre>${JSON.stringify(JSON.parse(accessRequest), undefined, "  ")}</pre>
    <form action="/redirect", method="post">
      <div>
        <p>Do you want to:</p>
        <label for="grant">
          grant
          <input type="radio" name="grant" id="grant" value="grant" required/>
        </label>
        <label for="grant">
          deny
          <input type="radio" name="grant" id="deny" value="deny" required/>
          </label>
        <p>the requested access ?</p>
      </div>
      <div>
        <input type="hidden" name="requestVc" id="requestVc" value=${
          req.query.requestVc
        }>
        <input type="hidden" name="redirectUrl" id="redirectUrl" value=${
          req.query.redirectUrl
        }>
      </div>
      <div>
        <input type="submit" value="Respond to access request">
      </div>
    </form></div>`
  );
});

// Return the consent grant to the requestor
// TODO: if the user denied access, deny consent grant instead of approving.
app.post("/redirect", async (req, res) => {
  const session = new Session();
  await session.login({
    clientId: process.env.OWNER_CLIENT_ID,
    clientSecret: process.env.OWNER_CLIENT_SECRET,
    oidcIssuer: process.env.OWNER_OIDC_ISSUER,
  });

  const accessGrant = await approveAccessRequest(
    session.info.webId as string,
    JSON.parse(atob(req.body.requestVc)),
    undefined,
    {
      fetch: session.fetch,
    }
  );
  const redirectUrl = new URL(decodeURI(req.body.redirectUrl));
  redirectUrl.searchParams.append(
    "accessGrant",
    btoa(JSON.stringify(accessGrant))
  );
  res.redirect(redirectUrl.href);
});

app.listen(GRANT_ACCESS_PORT, async () => {
  console.log(`Listening on [${GRANT_ACCESS_PORT}]...`);
});
