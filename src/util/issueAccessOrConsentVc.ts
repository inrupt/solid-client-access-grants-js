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
  BaseConsentGrantBody,
  BaseConsentRequestBody,
  BaseGrantBody,
  BaseRequestBody,
  ConsentAttributes,
  ConsentGrantAttributes,
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
import { getConsentApiEndpoint } from "../discover/getConsentApiEndpoint";
import { accessToResourceAccessModeArray } from "./accessToResourceAccessModeArray";
import { isBaseConsentParameters } from "../guard/isConsentRequestParameters";
import { isBaseRequest } from "../guard/isBaseRequest";

function getConsentAttributes(
  params: BaseRequestParameters,
  type: "BaseRequestBody" | "BaseGrantBody"
): ConsentAttributes | ConsentGrantAttributes {
  const modes = accessToResourceAccessModeArray(params.access);
  const consentAttributes: ConsentAttributes = {
    mode: modes,
    hasStatus: params.status,
    forPersonalData: params.resources,
  };
  if (type === "BaseGrantBody") {
    return {
      ...consentAttributes,
      isProvidedTo: params.requestor,
    } as ConsentGrantAttributes;
  }
  return consentAttributes;
}

function getBaseBody(
  params: BaseRequestParameters,
  type: "BaseRequestBody" | "BaseGrantBody"
): BaseRequestBody | BaseGrantBody {
  const body = {
    "@context": CONSENT_CONTEXT,
    type: [CREDENTIAL_TYPE] as [typeof CREDENTIAL_TYPE],
    credentialSubject: {
      id: params.requestor,
      inbox: params.requestorInboxUrl,
    },
  };
  if (type === "BaseGrantBody") {
    return {
      ...body,
      credentialSubject: {
        ...body.credentialSubject,
        providedConsent: getConsentAttributes(
          params,
          type
        ) as ConsentGrantAttributes,
      },
    };
  }
  return {
    ...body,
    credentialSubject: {
      ...body.credentialSubject,
      hasConsent: getConsentAttributes(params, type),
    },
  };
}

function getConsentBaseBody(
  params: BaseConsentParameters,
  baseBody: BaseGrantBody | BaseRequestBody
) {
  const request = { ...baseBody };
  // This makes request a ConsentGrantBody
  if (params.issuanceDate) {
    (request as ConsentGrantBody).issuanceDate =
      params.issuanceDate.toISOString();
  }
  if (params.expirationDate) {
    (request as ConsentGrantBody).expirationDate =
      params.expirationDate.toISOString();
  }
  return request;
}

function getConsentGrantBody(
  params: BaseConsentParameters,
  baseBody: BaseGrantBody
): ConsentGrantBody {
  const request = getConsentBaseBody(params, baseBody);
  (request as ConsentGrantBody).credentialSubject.providedConsent.forPurpose =
    params.purpose;
  return request as ConsentGrantBody;
}

function getConsentRequestBody(
  params: BaseConsentParameters,
  baseBody: BaseRequestBody
): ConsentRequestBody {
  const request = getConsentBaseBody(params, baseBody);
  (request as ConsentRequestBody).credentialSubject.hasConsent.forPurpose =
    params.purpose;
  return request as ConsentRequestBody;
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
  const requestBody = getBaseBody(params, "BaseRequestBody");

  if (isBaseConsentParameters(params)) {
    // This makes request a ConsentRequestBody
    return getConsentRequestBody(
      params,
      requestBody as BaseRequestBody
    ) as ConsentRequestBody;
  }
  return requestBody as AccessRequestBody;
}

export function getGrantBody(params: ConsentGrantParameters): ConsentGrantBody;
export function getGrantBody(params: AccessGrantParameters): AccessGrantBody;
export function getGrantBody(
  params: AccessGrantParameters | ConsentGrantParameters
): AccessGrantBody | ConsentGrantBody {
  const grantBody = getBaseBody(params, "BaseGrantBody");

  if (isBaseConsentParameters(params)) {
    // This makes request a ConsentGrantBody
    return getConsentGrantBody(
      params as ConsentGrantParameters,
      grantBody as ConsentGrantBody
    );
  }
  return grantBody as AccessGrantBody;
}

export async function issueAccessOrConsentVc(
  requestor: WebId,
  vcBody:
    | BaseRequestBody
    | BaseGrantBody
    | BaseConsentRequestBody
    | BaseConsentGrantBody,
  options: ConsentApiBaseOptions
): Promise<VerifiableCredential> {
  const fetcher = await getSessionFetch(options);
  const targetResourceIri = isBaseRequest(vcBody)
    ? vcBody.credentialSubject.hasConsent.forPersonalData[0]
    : (vcBody as ConsentGrantBody).credentialSubject.providedConsent
        .forPersonalData[0];
  // TODO: find out if concatenating "issue" here is correct
  // It seems like the issuer endpoint should be discovered from the well-known direcly
  // And the consent endpoint should be an object with one URI per service
  // (issuer service, verifier service... supposedly status and query and vc???)
  const consentIssuerEndpoint = new URL(
    "issue",
    await getConsentApiEndpoint(targetResourceIri, options)
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
