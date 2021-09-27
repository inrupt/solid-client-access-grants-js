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

import { WebId } from "@inrupt/solid-client";
import {
  issueVerifiableCredential,
  VerifiableCredential,
} from "@inrupt/solid-client-vc";
import { CONSENT_CONTEXT, CREDENTIAL_TYPE } from "../constants";
import type { ConsentApiBaseOptions } from "../type/ConsentApiBaseOptions";
import { getSessionFetch } from "./getSessionFetch";
import type {
  AccessGrantBody,
  AccessRequestBody,
  BaseAccessBody,
  BaseConsentBody,
  ConsentGrantBody,
  ConsentRequestBody,
} from "../type/AccessVerifiableCredential";
import { isConsentRequest } from "../guard/isConsentRequest";
import type {
  BaseConsentParameters,
  BaseRequestParameters,
  ConsentRequestParameters,
  AccessRequestParameters,
  ConsentGrantParameters,
  AccessGrantParameters,
} from "../type/Parameter";
import { getConsentApiEndpoint } from "../discovery/getConsentApiEndpoint";
import { accessToResourceAccessModeArray } from "./accessToResourceAccessModeArray";
import { isConsentRequestParameters } from "../guard/isConsentRequestParameters";

function getBaseBody(params: BaseRequestParameters): BaseAccessBody {
  const modes = accessToResourceAccessModeArray(params.access);
  return {
    "@context": CONSENT_CONTEXT,
    type: [CREDENTIAL_TYPE],
    credentialSubject: {
      id: params.requestor,
      hasConsent: {
        mode: modes,
        hasStatus: params.status,
        forPersonalData: params.resources,
      },
      inbox: params.requestorInboxUrl,
    },
  };
}

function getConsentBody(
  params: BaseConsentParameters,
  baseBody: BaseAccessBody
): BaseConsentBody {
  const request = { ...baseBody };
  // This makes request a ConsentRequestBody
  if (params.issuanceDate) {
    (request as BaseConsentBody).issuanceDate =
      params.issuanceDate.toISOString();
  }
  if (params.expirationDate) {
    (request as BaseConsentBody).expirationDate =
      params.expirationDate.toISOString();
  }
  (request as BaseConsentBody).credentialSubject.hasConsent.forPurpose =
    params.purpose;
  return request as BaseConsentBody;
}

export function getRequestBody(
  params: ConsentRequestParameters
): ConsentRequestBody;
export function getRequestBody(
  params: AccessRequestParameters
): AccessRequestBody;
export function getRequestBody(
  params: AccessRequestParameters | ConsentRequestParameters
): AccessRequestBody | ConsentRequestBody {
  const request = getBaseBody(params);
  // From this point on, request is an AccessRequestBody
  request.credentialSubject.hasConsent.hasStatus = params.status;
  if (isConsentRequestParameters(params)) {
    // This makes request a ConsentRequestBody
    return getConsentBody(params, request) as ConsentRequestBody;
  }
  return request as AccessRequestBody;
}

export function getGrantBody(params: ConsentGrantParameters): ConsentGrantBody;
export function getGrantBody(params: AccessGrantParameters): AccessGrantBody;
export function getGrantBody(
  params: AccessGrantParameters | ConsentGrantParameters
): AccessGrantBody | ConsentGrantBody {
  const grant = getBaseBody(params);
  // From this point on, request is an AccessGrantBody
  grant.credentialSubject.hasConsent.hasStatus = params.status;
  (grant as AccessGrantBody).credentialSubject.hasConsent.isProvidedTo =
    params.requestor;
  if (isConsentRequestParameters(params)) {
    // This makes request a ConsentGrantBody
    return getConsentBody(params, grant) as ConsentGrantBody;
  }
  return grant as AccessGrantBody;
}

export async function issueAccessOrConsentVc(
  requestor: WebId,
  vcBody: BaseAccessBody | BaseConsentBody,
  options: ConsentApiBaseOptions
): Promise<VerifiableCredential> {
  const fetcher = await getSessionFetch(options);
  // TODO: find out if concatenating "issue" here is correct
  // It seems like the issuer endpoint should be discovered from the well-known direcly
  // And the consent endpoint should be an object with one URI per service
  // (issuer service, verifier service... supposedly status and query and vc???)
  const consentIssuerEndpoint = new URL(
    "issue",
    await getConsentApiEndpoint(
      vcBody.credentialSubject.hasConsent.forPersonalData[0],
      options
    )
  );
  return issueVerifiableCredential(
    consentIssuerEndpoint.href,
    requestor,
    {
      "@context": vcBody["@context"],
      ...vcBody.credentialSubject,
    },
    {
      "@context": vcBody["@context"],
      type: [CREDENTIAL_TYPE],
      issuanceDate: isConsentRequest(vcBody) ? vcBody.issuanceDate : undefined,
      expirationDate: isConsentRequest(vcBody)
        ? vcBody.expirationDate
        : undefined,
    },
    {
      fetch: fetcher,
    }
  );
}
