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
  ACCESS_GRANT_CONTEXT,
  CREDENTIAL_TYPE_ACCESS_GRANT,
  CREDENTIAL_TYPE_ACCESS_REQUEST,
} from "../constants";
import type { AccessBaseOptions } from "../type/AccessBaseOptions";
import { getSessionFetch } from "./getSessionFetch";
import type {
  AccessGrantBody,
  AccessRequestBody,
  BaseAccessVcBody,
  BaseGrantBody,
  BaseGrantPayload,
  BaseRequestBody,
  BaseRequestPayload,
  ConsentAttributes,
  ConsentGrantAttributes,
} from "../type/AccessVerifiableCredential";
import { isConsentRequest } from "../guard/isConsentRequest";
import type {
  AccessRequestParameters,
  AccessGrantParameters,
} from "../type/Parameter";
import { getAccessApiEndpoint } from "../discover/getAccessApiEndpoint";
import { accessToResourceAccessModeArray } from "./accessToResourceAccessModeArray";
import { isBaseRequest } from "../guard/isBaseRequest";
import type { AccessCredentialType } from "../type/AccessCredentialType";

function getConsentAttributes(
  params: AccessRequestParameters,
  type: "BaseRequestBody"
): ConsentAttributes;
function getConsentAttributes(
  params: AccessGrantParameters,
  type: "BaseGrantBody"
): ConsentGrantAttributes;
function getConsentAttributes(
  params: AccessRequestParameters | AccessGrantParameters,
  type: "BaseRequestBody" | "BaseGrantBody"
): ConsentAttributes | ConsentGrantAttributes {
  const modes = accessToResourceAccessModeArray(params.access);
  const consentAttributes: ConsentAttributes = {
    mode: modes,
    hasStatus: params.status,
    forPersonalData: params.resources,
  };
  if (params.purpose !== undefined) {
    consentAttributes.forPurpose = params.purpose;
  }

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
    "@context": ACCESS_GRANT_CONTEXT,
    type: [
      type === "BaseGrantBody"
        ? CREDENTIAL_TYPE_ACCESS_GRANT
        : CREDENTIAL_TYPE_ACCESS_REQUEST,
    ] as AccessCredentialType[],
    credentialSubject: {
      inbox: params.requestorInboxUrl,
    },
  };
  if (params.issuanceDate !== undefined) {
    (body as BaseAccessVcBody).issuanceDate = params.issuanceDate.toISOString();
  }
  if (params.expirationDate !== undefined) {
    (body as BaseAccessVcBody).expirationDate =
      params.expirationDate.toISOString();
  }
  if (type === "BaseGrantBody") {
    return {
      ...body,
      credentialSubject: {
        ...body.credentialSubject,
        providedConsent: getConsentAttributes(
          params as AccessGrantParameters,
          type
        ),
      },
    };
  }
  return {
    ...body,
    credentialSubject: {
      ...body.credentialSubject,
      hasConsent: getConsentAttributes(params as AccessRequestParameters, type),
    },
  };
}

export function getRequestBody(
  params: AccessRequestParameters
): AccessRequestBody {
  return getBaseBody(params, "BaseRequestBody") as AccessRequestBody;
}

export function getGrantBody(params: AccessGrantParameters): AccessGrantBody {
  return getBaseBody(params, "BaseGrantBody") as AccessGrantBody;
}

export async function issueAccessVc(
  vcBody: BaseRequestBody | BaseGrantBody,
  options: AccessBaseOptions
): Promise<VerifiableCredential> {
  const fetcher = await getSessionFetch(options);
  const targetResourceIri = isBaseRequest(vcBody)
    ? vcBody.credentialSubject.hasConsent.forPersonalData[0]
    : (vcBody as BaseGrantBody).credentialSubject.providedConsent
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
