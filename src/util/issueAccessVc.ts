/**
 * Copyright 2022 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import {
  issueVerifiableCredential,
  VerifiableCredential,
} from "@inrupt/solid-client-vc";
import {
  CONSENT_CONTEXT,
  CREDENTIAL_TYPE_ACCESS_GRANT,
  CREDENTIAL_TYPE_ACCESS_REQUEST,
} from "../constants";
import type { AccessBaseOptions } from "../type/AccessBaseOptions";
import { getSessionFetch } from "./getSessionFetch";
import type {
  AccessGrantBody,
  AccessRequestBody,
  BaseConsentGrantBody,
  BaseConsentRequestBody,
  BaseGrantBody,
  BaseGrantPayload,
  BaseRequestBody,
  BaseRequestPayload,
  ConsentAttributes,
  ConsentGrantAttributes,
  ConsentGrantBody,
  ConsentRequestBody,
} from "../type/AccessVerifiableCredential";
import { isConsentRequest } from "../guard/isConsentRequest";
import type {
  BaseConsentParameters,
  ConsentRequestParameters,
  AccessRequestParameters,
  ConsentGrantParameters,
  AccessGrantParameters,
} from "../type/Parameter";
import { getAccessApiEndpoint } from "../discover/getAccessApiEndpoint";
import { accessToResourceAccessModeArray } from "./accessToResourceAccessModeArray";
import { isBaseConsentParameters } from "../guard/isBaseConsentParameters";
import { isBaseRequest } from "../guard/isBaseRequest";
import type { AccessCredentialType } from "../type/AccessCredentialType";

function getConsentAttributes(
  params: ConsentRequestParameters,
  type: "BaseRequestBody"
): ConsentAttributes;
function getConsentAttributes(
  params: ConsentGrantParameters,
  type: "BaseGrantBody"
): ConsentGrantAttributes;
function getConsentAttributes(
  params: ConsentRequestParameters | ConsentGrantParameters,
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
      isProvidedTo: (params as AccessGrantParameters).requestor,
    } as ConsentGrantAttributes;
  }
  return consentAttributes;
}

function getBaseBody(
  params: AccessRequestParameters,
  type: "BaseRequestBody"
): BaseRequestPayload;
function getBaseBody(
  params: AccessGrantParameters,
  type: "BaseGrantBody"
): BaseGrantPayload;
function getBaseBody(
  params: AccessRequestParameters | AccessGrantParameters,
  type: "BaseRequestBody" | "BaseGrantBody"
): BaseRequestPayload | BaseGrantPayload {
  const body = {
    "@context": CONSENT_CONTEXT,
    type: [
      type === "BaseGrantBody"
        ? CREDENTIAL_TYPE_ACCESS_GRANT
        : CREDENTIAL_TYPE_ACCESS_REQUEST,
    ] as AccessCredentialType[],
    credentialSubject: {
      inbox: params.requestorInboxUrl,
    },
  };
  if (type === "BaseGrantBody") {
    return {
      ...body,
      credentialSubject: {
        ...body.credentialSubject,
        providedConsent: getConsentAttributes(
          params as ConsentGrantParameters,
          type
        ),
      },
    };
  }
  return {
    ...body,
    credentialSubject: {
      ...body.credentialSubject,
      hasConsent: getConsentAttributes(
        params as ConsentRequestParameters,
        type
      ),
    },
  };
}

function getConsentBaseBody(
  params: BaseConsentParameters,
  baseBody: BaseGrantPayload | BaseRequestPayload
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
  baseBody: BaseRequestPayload
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
  if (isBaseConsentParameters(params)) {
    // This makes request a ConsentRequestBody
    return getConsentRequestBody(
      params,
      getBaseBody(params, "BaseRequestBody")
    ) as ConsentRequestBody;
  }
  return getBaseBody(
    params as AccessRequestParameters,
    "BaseRequestBody"
  ) as AccessRequestBody;
}

export function getGrantBody(params: ConsentGrantParameters): ConsentGrantBody;
export function getGrantBody(params: AccessGrantParameters): AccessGrantBody;
export function getGrantBody(
  params: AccessGrantParameters | ConsentGrantParameters
): AccessGrantBody | ConsentGrantBody {
  const grantBody = getBaseBody(params, "BaseGrantBody");
  grantBody.type = [CREDENTIAL_TYPE_ACCESS_GRANT];
  if (isBaseConsentParameters(params)) {
    // This makes request a ConsentGrantBody
    return getConsentGrantBody(
      params as ConsentGrantParameters,
      grantBody as ConsentGrantBody
    );
  }
  return grantBody as AccessGrantBody;
}

export async function issueAccessVc(
  vcBody:
    | BaseRequestBody
    | BaseGrantBody
    | BaseConsentRequestBody
    | BaseConsentGrantBody,
  options: AccessBaseOptions
): Promise<VerifiableCredential> {
  const fetcher = await getSessionFetch(options);
  const targetResourceIri = isBaseRequest(vcBody)
    ? vcBody.credentialSubject.hasConsent.forPersonalData[0]
    : (vcBody as ConsentGrantBody).credentialSubject.providedConsent
        .forPersonalData[0];

  // TODO: find out if concatenating "issue" here is correct
  // It seems like the issuer endpoint should be discovered from the well-known direcly
  // And the access endpoint should be an object with one URI per service
  // (issuer service, verifier service... supposedly status and query and vc???)
  const accessIssuerEndpoint = new URL(
    "issue",
    await getAccessApiEndpoint(targetResourceIri, options)
  );

  return issueVerifiableCredential(
    accessIssuerEndpoint.href,
    {
      "@context": vcBody["@context"],
      ...vcBody.credentialSubject,
    },
    {
      "@context": vcBody["@context"],
      type: vcBody.type,
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
