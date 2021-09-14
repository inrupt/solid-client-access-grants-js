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
  IriString,
} from "@inrupt/solid-client";
import {
  issueVerifiableCredential,
  VerifiableCredential,
} from "@inrupt/solid-client-vc";
import { fetch as crossFetch } from "cross-fetch";
import {
  CONSENT_CONTEXT,
  INRUPT_CONSENT_SERVICE,
  CREDENTIAL_TYPE,
  ConsentStatus,
  CONSENT_STATUS_REQUESTED,
  ResourceAccessMode,
  CONSENT_STATUS_EXPLICITLY_GIVEN,
  RESOURCE_ACCESS_MODE_READ,
  RESOURCE_ACCESS_MODE_APPEND,
  RESOURCE_ACCESS_MODE_WRITE,
  RESOURCE_ACCESS_MODE_CONTROL,
  ConsentGrantBaseOptions,
} from "./constants";

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

export type BaseAccessBody = {
  "@context": typeof CONSENT_CONTEXT;
  type: [typeof CREDENTIAL_TYPE];
  credentialSubject: {
    id: UrlString;
    hasConsent: {
      mode: ResourceAccessMode[];
      hasStatus: ConsentStatus;
      forPersonalData: UrlString[];
    };
    inbox: UrlString;
  };
  issuanceDate?: string;
};

export type BaseConsentBody = BaseAccessBody & {
  credentialSubject: {
    hasConsent: {
      forPurpose: UrlString[];
    };
  };
  expirationDate?: string;
};

export type AccessRequestBody = BaseAccessBody & {
  credentialSubject: {
    hasConsent: {
      hasStatus: typeof CONSENT_STATUS_REQUESTED;
    };
  };
};

export type AccessGrantBody = BaseAccessBody & {
  credentialSubject: {
    hasConsent: {
      hasStatus: typeof CONSENT_STATUS_EXPLICITLY_GIVEN;
      isProvidedTo: UrlString;
    };
  };
};

export type ConsentRequestBody = AccessRequestBody & BaseConsentBody;

export type ConsentGrantBody = AccessGrantBody & BaseConsentBody;

export type BaseRequestParameters = {
  requestor: UrlString;
  access: Partial<access.Access>;
  resources: Array<UrlString>;
  requestorInboxUrl: UrlString;
  status: ConsentStatus;
};

export type BaseConsentParameters = {
  purpose: Array<UrlString>;
  issuanceDate?: Date;
  expirationDate?: Date;
};

export type AccessRequestParameters = BaseRequestParameters & {
  status: typeof CONSENT_STATUS_REQUESTED;
};

export type ConsentRequestParameters = AccessRequestParameters &
  BaseConsentParameters;

export type AccessGrantParameters = BaseRequestParameters & {
  status: typeof CONSENT_STATUS_EXPLICITLY_GIVEN;
};

export type ConsentGrantParameters = AccessGrantParameters &
  BaseConsentParameters;

function areConsentParameters(
  parameters: BaseConsentParameters | BaseRequestParameters
): parameters is BaseConsentParameters {
  return (parameters as BaseConsentParameters).purpose !== undefined;
}

export function isConsentRequest(
  request: BaseAccessBody | BaseConsentBody
): request is BaseConsentBody {
  return (
    (request as ConsentRequestBody).credentialSubject.hasConsent.forPurpose !==
    undefined
  );
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
  if (areConsentParameters(params)) {
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
  if (areConsentParameters(params)) {
    // This makes request a ConsentGrantBody
    return getConsentBody(params, grant) as ConsentGrantBody;
  }
  return grant as AccessGrantBody;
}

// Dynamically import solid-client-authn-browser so that this library doesn't have a hard
// dependency.
export async function getDefaultSessionFetch(): Promise<typeof fetch> {
  try {
    const { fetch: fetchFn } = await import(
      "@inrupt/solid-client-authn-browser"
    );

    return fetchFn;
  } catch (e) {
    /* istanbul ignore next: @inrupt/solid-client-authn-browser is a devDependency, so this path is not hit in tests: */
    return crossFetch;
  }
}

export function isAccessRequest(
  credential:
    | VerifiableCredential
    | (AccessRequestBody & { issuanceDate: string })
): credential is AccessRequestBody & { issuanceDate: string } {
  return (
    credential.type.includes(CREDENTIAL_TYPE) &&
    "hasConsent" in credential.credentialSubject &&
    "forPersonalData" in
      (credential as AccessRequestBody).credentialSubject.hasConsent &&
    (credential as AccessRequestBody).credentialSubject.hasConsent.hasStatus ===
      CONSENT_STATUS_REQUESTED &&
    "mode" in (credential as AccessRequestBody).credentialSubject.hasConsent &&
    "inbox" in (credential as AccessRequestBody).credentialSubject &&
    credential.issuanceDate !== undefined
  );
}

export async function issueAccessOrConsentVc(
  requestor: WebId,
  vcBody: BaseAccessBody | BaseConsentBody,
  options: ConsentGrantBaseOptions
): Promise<VerifiableCredential> {
  const fetcher = options.fetch ?? (await getDefaultSessionFetch());
  const consentEndpoint = options.consentEndpoint
    ? new URL(options.consentEndpoint)
    : new URL(
        "issue",
        await getConsentEndpointForResource(
          vcBody.credentialSubject.hasConsent.forPersonalData[0],
          fetcher
        )
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

export async function dereferenceVcIri(
  vcIri: IriString,
  fetcher: typeof global.fetch
): Promise<VerifiableCredential> {
  const issuerResponse = await fetcher(vcIri);
  if (!issuerResponse.ok) {
    throw new Error(
      `An error occured when looking up [${vcIri}]: ${issuerResponse.status} ${issuerResponse.statusText}`
    );
  }
  return (await issuerResponse.json()) as VerifiableCredential;
}
