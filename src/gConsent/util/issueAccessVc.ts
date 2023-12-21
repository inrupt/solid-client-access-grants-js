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

import type {
  VerifiableCredential,
  VerifiableCredentialBase,
  DatasetWithId,
} from "@inrupt/solid-client-vc";
import { issueVerifiableCredential } from "@inrupt/solid-client-vc";
import {
  ACCESS_GRANT_CONTEXT_DEFAULT,
  CREDENTIAL_TYPE_ACCESS_GRANT,
  CREDENTIAL_TYPE_ACCESS_REQUEST,
  instanciateEssAccessGrantContext,
} from "../constants";
import type { AccessBaseOptions } from "../type/AccessBaseOptions";
import { getSessionFetch } from "../../common/util/getSessionFetch";
import type {
  AccessGrantBody,
  AccessRequestBody,
  BaseAccessVcBody,
  BaseGrantBody,
  BaseGrantPayload,
  BaseRequestBody,
  BaseRequestPayload,
  GConsentRequestAttributes,
  GConsentGrantAttributes,
} from "../type/AccessVerifiableCredential";
import type {
  AccessRequestParameters,
  AccessGrantParameters,
} from "../type/Parameter";
import { getAccessApiEndpoint } from "../discover/getAccessApiEndpoint";
import { accessToResourceAccessModeArray } from "./accessToResourceAccessModeArray";
import { isBaseRequest } from "../guard/isBaseRequest";
import type { AccessCredentialType } from "../type/AccessCredentialType";

function getGConsentAttributes(
  params: AccessRequestParameters,
  type: "BaseRequestBody",
): GConsentRequestAttributes;
function getGConsentAttributes(
  params: AccessGrantParameters,
  type: "BaseGrantBody",
): GConsentGrantAttributes;
function getGConsentAttributes(
  params: AccessRequestParameters | AccessGrantParameters,
  type: "BaseRequestBody" | "BaseGrantBody",
): GConsentRequestAttributes | GConsentGrantAttributes {
  const modes = accessToResourceAccessModeArray(params.access);
  const consentAttributes: GConsentRequestAttributes = {
    mode: modes,
    hasStatus: params.status,
    forPersonalData: params.resources,
  };
  if (params.purpose !== undefined) {
    consentAttributes.forPurpose = params.purpose;
  }
  if (params.inherit !== undefined) {
    consentAttributes.inherit = params.inherit;
  }

  if (type === "BaseGrantBody") {
    return {
      ...consentAttributes,
      isProvidedTo: (params as AccessGrantParameters).requestor,
    };
  }
  return {
    ...consentAttributes,
    isConsentForDataSubject: (params as AccessRequestParameters).resourceOwner,
  };
}

function getBaseBody(
  params: AccessRequestParameters,
  type: "BaseRequestBody",
): BaseRequestPayload;
function getBaseBody(
  params: AccessGrantParameters,
  type: "BaseGrantBody",
): BaseGrantPayload;
function getBaseBody(
  params: AccessRequestParameters | AccessGrantParameters,
  type: "BaseRequestBody" | "BaseGrantBody",
): BaseRequestPayload | BaseGrantPayload {
  const body = {
    "@context": ACCESS_GRANT_CONTEXT_DEFAULT,
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
        providedConsent: getGConsentAttributes(
          params as AccessGrantParameters,
          type,
        ),
      },
    };
  }
  return {
    ...body,
    credentialSubject: {
      ...body.credentialSubject,
      hasConsent: getGConsentAttributes(
        params as AccessRequestParameters,
        type,
      ),
    },
  };
}

export function getRequestBody(
  params: AccessRequestParameters,
): AccessRequestBody {
  return getBaseBody(params, "BaseRequestBody") as AccessRequestBody;
}

export function getGrantBody(params: AccessGrantParameters): AccessGrantBody {
  return getBaseBody(params, "BaseGrantBody") as AccessGrantBody;
}

export async function issueAccessVc(
  vcBody: BaseRequestBody | BaseGrantBody,
  options: AccessBaseOptions & {
    returnLegacyJsonld: false;
    normalize?: (arg: VerifiableCredentialBase) => VerifiableCredentialBase;
  },
): Promise<DatasetWithId>;
/**
 * @deprecated Use RDFJS API by setting returnLegacyJsonld: false
 */
export async function issueAccessVc(
  vcBody: BaseRequestBody | BaseGrantBody,
  options?: AccessBaseOptions & {
    returnLegacyJsonld?: true;
    normalize?: (arg: VerifiableCredentialBase) => VerifiableCredentialBase;
  },
): Promise<VerifiableCredential>;
/**
 * @deprecated Use RDFJS API by setting returnLegacyJsonld: false
 */
export async function issueAccessVc(
  vcBody: BaseRequestBody | BaseGrantBody,
  options?: AccessBaseOptions & {
    returnLegacyJsonld?: boolean;
    normalize?: (arg: VerifiableCredentialBase) => VerifiableCredentialBase;
  },
): Promise<DatasetWithId>;
export async function issueAccessVc(
  vcBody: BaseRequestBody | BaseGrantBody,
  options: AccessBaseOptions & {
    returnLegacyJsonld?: boolean;
    normalize?: (arg: VerifiableCredentialBase) => VerifiableCredentialBase;
  } = {},
): Promise<DatasetWithId> {
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
    await getAccessApiEndpoint(targetResourceIri, options),
  );

  const issuedVc = await issueVerifiableCredential(
    accessIssuerEndpoint.href,
    {
      "@context": instanciateEssAccessGrantContext(
        accessIssuerEndpoint.hostname,
      ),
      ...vcBody.credentialSubject,
    },
    {
      // All the required context is provided by instanciateEssAccessGrantContext,
      // and vcBody contains a default context we don't want to include in the
      // result VC.
      "@context": [],
      type: vcBody.type,
      issuanceDate: vcBody.issuanceDate,
      expirationDate: vcBody.expirationDate,
    },
    {
      fetch: fetcher,
      returnLegacyJsonld: options.returnLegacyJsonld,
      normalize: options.normalize,
    },
  );
  return issuedVc;
}
