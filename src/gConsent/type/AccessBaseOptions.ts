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

/**
 * @module interfaces
 */

import type { UrlString } from "@inrupt/solid-client";

/**
 * Optional parameters to customise the behaviour of access requests.
 *
 * - `fetch`: Pass in a function with a signature compatible with the WHATWG
 *   Fetch API, which will be used to make HTTP requests. Primarily useful when
 *   requests need to be authenticated.
 *
 *   When [@inrupt/solid-client-authn-browser][scab] is available and this property is
 *   not set, `fetch` will be imported from there. Otherwise, the HTTP requests
 *   will be unauthenticated.
 *
 * - `accessEndpoint`: A base URL used when determining the location of access
 *   API calls. If not given, it is attempted to be found by determining the
 *   server URL from the resource involved in the request and reading its
 *   `.well-known/solid` file for an Access API entry.
 *
 * - `updateAcr`: A boolean flag. If true, the Access Control Resource of the
 *   resource for which an Access Grant is issued will be updated so that the
 *   Access Grant is effective. If `updateAcr` is false, the Access Control Resource
 *   attached to the resource targeted by the Access Grant will be left unchanged.
 *   Depending on the Access Control Policy structure of the target storage, this
 *   could result in the Access Grant being ineffective, and subsequent fetch operations
 *   using this Access Grant for authorization would fail with a 403 Unauthorized
 *   response from the server. To manually update the ACR and enable Access Grant-based
 *   access to the target resource, one can use [`acp_ess_2.setVcAccess`, from `@inrupt/solid-client`](https://docs.inrupt.com/developer-tools/api/javascript/solid-client/modules/acp_ess_2.html#setvcaccess).
 *
 *   For more information about the Access Control Policy
 *   structured supported by ESS, please refer to [the documentation](https://docs.inrupt.com/ess/latest/security/acp/#access-control-policy-acp).
 *
 *   The default value of this flag is `true`, and users should have a good understanding
 *   of the interaction between Access Grants and Access Control Policy before changing
 *   the default value.
 *
 * [scab]: https://npmjs.com/package/@inrupt/solid-client-authn-browser
 *
 * @since 0.4.0
 */
export interface AccessBaseOptions {
  /**
   * @since 2.1.0
   */
  updateAcr?: boolean;
  fetch?: typeof fetch;
  /**
   * @since 0.4.0
   */
  accessEndpoint?: URL | UrlString;

  // TODO: Verify whether we need to support the podHost parameter and implement
  //
  // - `podHost`: The URL of the pod host, from which the `.well-known/solid` file
  //   can be derived.
  //
  // podHost?: URL | UrlString;
}

/**
 * @since unreleased
 */
export interface WithLegacyJsonFlag {
  returnLegacyJsonld?: boolean;
}

export interface WithLegacyJsonFlagSet {
  returnLegacyJsonld?: true;
}
