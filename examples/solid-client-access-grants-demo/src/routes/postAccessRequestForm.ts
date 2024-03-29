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

// eslint-disable-next-line no-shadow
import type { Request, Response } from "express";

import {
  getAccessApiEndpoint,
  issueAccessRequest,
  redirectToAccessManagementUi,
  // eslint-disable-next-line import/no-unresolved
} from "@inrupt/solid-client-access-grants";
import { Session } from "@inrupt/solid-client-authn-node";
import { getEnvironment } from "../utils/getEnvironment";

/**
 *
 * @param req
 * @param res
 */
export async function postAccessRequestForm(
  req: Request,
  res: Response,
): Promise<void> {
  const env = getEnvironment();
  const session = new Session();
  await session.login({
    clientId: env.clientId,
    clientSecret: env.clientSecret,
    oidcIssuer: env.oidcIssuer.href,
  });

  /**
   * Access Point discovery:
   * 1.
   */
  const accessEndpoint = await getAccessApiEndpoint(req.body.resource);

  /**
   * Create an Access Request:
   */
  const accessRequest = await issueAccessRequest(
    {
      access: {
        read: !!req.body.read,
      },
      purpose: req.body.purpose,
      resourceOwner: req.body.owner,
      resources: [req.body.resource],
      expirationDate: new Date(Date.now() + 60 * 60 * 10000),
    },
    {
      fetch: session.fetch,
      accessEndpoint,
    },
  );

  /**
   * Redirect to Access Management application:
   */
  await redirectToAccessManagementUi(accessRequest.id, env.redirectUrl.href, {
    redirectCallback: (url) => {
      res.redirect(url);
    },
    fallbackAccessManagementUi: env.managementApp.href,
    fetch: session.fetch,
  });
}
