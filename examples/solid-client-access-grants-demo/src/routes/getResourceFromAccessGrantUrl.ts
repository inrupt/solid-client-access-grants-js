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

import { Session } from "@inrupt/solid-client-authn-node";
// eslint-disable-next-line import/no-unresolved
import { getAccessGrant, getFile } from "@inrupt/solid-client-access-grants";
import { getEnvironment } from "../utils/getEnvironment";

export async function getResourceFromAccessGrantUrl(
  req: Request,
  res: Response,
): Promise<void> {
  const env = getEnvironment();
  const session = new Session();
  await session.login({
    clientId: env.clientId,
    clientSecret: env.clientSecret,
    oidcIssuer: env.oidcIssuer.href,
    // Note that using a Bearer token is mandatory for the UMA access token to be valid.
    tokenType: "Bearer",
  });

  /**
   * Retrieve an Access Grant issued to the application.
   */
  const accessGrant = await getAccessGrant(req.query.accessGrantUrl as string, {
    fetch: session.fetch,
  });

  /**
   * Retrieve the URL of a resource to which access was granted.
   */
  const targetResource =
    accessGrant.credentialSubject.providedConsent.forPersonalData[0];

  /**
   * Retrieve a resource using an Access Grant.
   */
  const file = await getFile(targetResource, accessGrant, {
    fetch: session.fetch,
  });

  /**
   * Send back the resource.
   */
  // Note: this should be handled properly with file.type but browsers are not too good with ttl...
  res.type("text/plain");
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  file.arrayBuffer().then((buf) => {
    res.send(Buffer.from(buf));
  });
}
