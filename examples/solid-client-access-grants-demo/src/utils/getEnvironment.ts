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

import { RESOURCE_FETCHER_PATHNAME } from "../static/constants";

interface Environment {
  url: URL;
  managementApp: URL;
  clientId: string;
  clientSecret: string;
  oidcIssuer: URL;
  redirectUrl: URL;
}

export function getEnvironment(): Environment {
  const url = new URL(process.env.BASE_URL ?? "http://localhost");
  url.port = process.env.PORT ?? "8080";

  return {
    url,
    managementApp: new URL(
      process.env.ACCESS_MANAGEMENT_APP ??
        "https://podbrowser.inrupt.com/privacy/access/requests/",
    ),
    clientId: process.env.CLIENT_ID ?? "",
    clientSecret: process.env.CLIENT_SECRET ?? "",
    oidcIssuer: new URL(process.env.OIDC_ISSUER ?? "https://login.inrupt.com"),
    redirectUrl: new URL(
      process.env.FRONTENT_REDIRECT ?? new URL(RESOURCE_FETCHER_PATHNAME, url),
    ),
  };
}
