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
import {
  access,
  UrlString,
  getWellKnownSolid,
  getThingAll,
  getSourceIri,
  getIri,
  WebId,
} from "@inrupt/solid-client";
import {
  issueVerifiableCredential,
  VerifiableCredential,
} from "@inrupt/solid-client-vc";
import {
  CONSENT_CONTEXT,
  INRUPT_CONSENT_SERVICE,
  CREDENTIAL_TYPE,
  RESOURCE_ACCESS_MODE_READ,
  RESOURCE_ACCESS_MODE_APPEND,
  RESOURCE_ACCESS_MODE_WRITE,
  RESOURCE_ACCESS_MODE_CONTROL,
} from "../constants";
import type { ResourceAccessMode } from "../type/ResourceAccessMode";
import type { ConsentApiBaseOptions } from "../type/ConsentApiBaseOptions";
import { getDefaultSessionFetch } from "./getDefaultSessionFetch";
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

export function accessToConsentRequestModes(
  desiredAccess: Partial<access.Access>
): ResourceAccessMode[] {
  const modes: ResourceAccessMode[] = [];
  if (desiredAccess.read === true) {
    modes.push(RESOURCE_ACCESS_MODE_READ);
  }
  if (desiredAccess.append === true) {
    modes.push(RESOURCE_ACCESS_MODE_APPEND);
  }
  if (desiredAccess.write === true) {
    modes.push(RESOURCE_ACCESS_MODE_WRITE);
  }
  if (
    desiredAccess.controlRead === true ||
    desiredAccess.controlWrite === true
  ) {
    modes.push(RESOURCE_ACCESS_MODE_CONTROL);
  }
  return modes;
}

export async function getConsentEndpointForResource(
  resource: UrlString,
  fetcher: typeof fetch
): Promise<UrlString> {
  const wellKnown = await getWellKnownSolid(resource, {
    fetch: fetcher,
  });
  const wellKnownSubjects = getThingAll(wellKnown);
  if (wellKnownSubjects.length === 0) {
    throw new Error(
      `Cannot discover consent endpoint from [${getSourceIri(
        wellKnown
      )}]: the well-known document is empty.`
    );
  }
  // There should only be 1 subject in the .well-known/solid document, and if there
  // are multiple, we arbitrarily pick the first one.
  const wellKnownSubject = wellKnownSubjects[0];
  const consentIri = getIri(wellKnownSubject, INRUPT_CONSENT_SERVICE);
  if (consentIri === null) {
    throw new Error(
      `Cannot discover consent endpoint from [${getSourceIri(
        wellKnown
      )}]: the well-known document contains no value for property [${INRUPT_CONSENT_SERVICE}].`
    );
  }
  return consentIri;
}

function isConsentRequestParameters(
  params: unknown | AccessRequestParameters | ConsentRequestParameters
): params is ConsentRequestParameters {
  return (params as ConsentRequestParameters).purpose !== undefined;
}

function getBaseBody(params: BaseRequestParameters): BaseAccessBody {
  const modes = accessToConsentRequestModes(params.access);
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

async function getConsentEndpointUrl(
  consentEndpoint: URL | UrlString | undefined,
  resource: UrlString,
  fetcher: typeof fetch
): Promise<URL> {
  // TODO: complete code coverage
  /* istanbul ignore if */
  if (consentEndpoint instanceof URL) {
    return consentEndpoint;
  }
  if (consentEndpoint) {
    return new URL(consentEndpoint);
  }
  return new URL(
    "issue",
    await getConsentEndpointForResource(resource, fetcher)
  );
}

export async function issueAccessOrConsentVc(
  requestor: WebId,
  vcBody: BaseAccessBody | BaseConsentBody,
  options: ConsentApiBaseOptions
): Promise<VerifiableCredential> {
  const fetcher = options.fetch ?? (await getDefaultSessionFetch());
  const consentEndpoint = await getConsentEndpointUrl(
    options.consentEndpoint,
    vcBody.credentialSubject.hasConsent.forPersonalData[0],
    fetcher
  );
  return issueVerifiableCredential(
    consentEndpoint.href,
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
