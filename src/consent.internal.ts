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
} from "@inrupt/solid-client";
import { VerifiableCredential } from "@inrupt/solid-client-vc";
import { fetch as crossFetch } from "cross-fetch";
import {
  CONTEXT_CONSENT,
  INRUPT_CONSENT_SERVICE,
  CREDENTIAL_TYPE,
  CONSENT_STATUS,
  ResourceAccessModes,
} from "./constants";

export function accessToConsentRequestModes(
  desiredAccess: Partial<access.Access>
): ResourceAccessModes[] {
  // TODO: Check that these are actually the modes you can request.
  //       The Server API doc does refer to `acl:` as a prefix,
  //       although that is not listed in the example context.
  const modes: ResourceAccessModes[] = [];
  if (desiredAccess.read === true) {
    modes.push("Read");
  }
  if (desiredAccess.append === true) {
    modes.push("Append");
  }
  if (desiredAccess.write === true) {
    modes.push("Write");
  }
  if (
    desiredAccess.controlRead === true ||
    desiredAccess.controlWrite === true
  ) {
    modes.push("Control");
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
  "@context": typeof CONTEXT_CONSENT;
  type: [typeof CREDENTIAL_TYPE];
  credentialSubject: {
    id: UrlString;
    hasConsent: {
      mode: ResourceAccessModes[];
      hasStatus: CONSENT_STATUS;
      forPersonalData: UrlString[];
    };
    inbox: UrlString;
  };
};

export type BaseConsentBody = BaseAccessBody & {
  credentialSubject: {
    hasConsent: {
      forPurpose: UrlString[];
    };
  };
  issuanceDate?: string;
  expirationDate?: string;
};

export type AccessRequestBody = BaseAccessBody & {
  credentialSubject: {
    hasConsent: {
      hasStatus: "ConsentStatusRequested";
    };
  };
};

export type AccessGrantBody = BaseAccessBody & {
  credentialSubject: {
    hasConsent: {
      hasStatus: "ConsentStatusRequested";
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
  status: CONSENT_STATUS;
};

export type BaseConsentParameters = {
  purpose: Array<UrlString>;
  issuanceDate?: Date;
  expirationDate?: Date;
};

export type AccessRequestParameters = BaseRequestParameters & {
  status: "ConsentStatusRequested";
};

export type ConsentRequestParameters = AccessRequestParameters &
  BaseConsentParameters;

export type AccessGrantParameters = BaseRequestParameters & {
  status: "ConsentStatusExplicitlyGiven";
};

export type ConsentGrantParameters = AccessGrantParameters &
  BaseConsentParameters;

function areConsentParameters(
  parameters: BaseConsentParameters | BaseRequestParameters
): parameters is BaseConsentParameters {
  return (parameters as BaseConsentParameters).purpose !== undefined;
}

export function isConsentRequest(
  request: AccessRequestBody | ConsentRequestBody
): request is ConsentRequestBody {
  return (
    (request as ConsentRequestBody).credentialSubject.hasConsent.forPurpose !==
    undefined
  );
}

function getBaseBody(params: BaseRequestParameters): BaseAccessBody {
  const modes = accessToConsentRequestModes(params.access);
  return {
    "@context": CONTEXT_CONSENT,
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
  credential: VerifiableCredential | AccessRequestBody
): credential is AccessRequestBody {
  let result = true;
  result =
    result &&
    (credential as AccessRequestBody).type.includes("SolidConsentRequest");
  result =
    result &&
    (credential as AccessRequestBody).credentialSubject.hasConsent !==
      undefined;
  result =
    result &&
    (credential as AccessRequestBody).credentialSubject.hasConsent
      .forPersonalData !== undefined;
  result =
    result &&
    (credential as AccessRequestBody).credentialSubject.hasConsent.hasStatus ===
      "ConsentStatusRequested";
  result =
    result &&
    (credential as AccessRequestBody).credentialSubject.hasConsent.mode !==
      undefined;
  result =
    result &&
    (credential as AccessRequestBody).credentialSubject.inbox !== undefined;
  return result;
}
