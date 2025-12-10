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
import type { AccessModes } from "../../type/AccessModes";
import type { gc } from "../../common/constants";

export type BaseRequestParameters = {
  access: AccessModes;
  requestorInboxUrl?: UrlString;
  purpose?: Array<UrlString>;
  issuanceDate?: Date;
  expirationDate?: Date;
  inherit?: boolean;
} &
  // One of resources or templates must be defined
  (| {
        resources: Array<UrlString>;
        templates?: Array<string>;
      }
    | { resources?: Array<UrlString>; templates: Array<string> }
  );

export type InputAccessRequestParameters = BaseRequestParameters & {
  resourceOwner?: UrlString;
};
export type AccessRequestParameters = InputAccessRequestParameters & {
  status: typeof gc.ConsentStatusRequested.value;
};

export interface InputAccessGrantParameters
  extends Omit<BaseRequestParameters, "templates"> {
  /**
   * WebID of the resource owner. If the request is not issued by an admin,
   * this is overridden by the server to the identity of the agent issuing
   * the Access Grant.
   */
  owner?: UrlString;
  requestor: UrlString;
  request?: UrlString;
  verifiedRequest?: UrlString;
}

export interface AccessGrantParameters extends InputAccessGrantParameters {
  status: typeof gc.ConsentStatusExplicitlyGiven.value;
}
