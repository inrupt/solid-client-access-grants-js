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
  WebId,
  getWellKnownSolid,
  getThingAll,
  getSourceIri,
  getIri,
} from "@inrupt/solid-client";
import { CONTEXT_CONSENT, INRUPT_CONSENT_SERVICE } from "./constants";

function accessToConsentRequestModes(
  desiredAccess: Partial<access.Access>
): ConsentRequestModes[] {
  // TODO: Check that these are actually the modes you can request.
  //       The Server API doc does refer to `acl:` as a prefix,
  //       although that is not listed in the example context.
  const modes: ConsentRequestModes[] = [];
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

export async function getConsentEndpointForWebId(
  webId: WebId,
  fetcher: typeof fetch
): Promise<UrlString> {
  const wellKnown = await getWellKnownSolid(webId, {
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

// TODO: Check that these are actually the modes you can request.
//       The Server API doc does refer to `acl:` as a prefix,
//       although that is not listed in the example context.
type ConsentRequestModes = "Read" | "Append" | "Write" | "Control";

export type AccessRequestBody = {
  "@context": typeof CONTEXT_CONSENT;
  type: ["SolidConsentRequest"];
  credentialSubject: {
    id: UrlString;
    hasConsent: {
      mode: ConsentRequestModes[];
      hasStatus: "ConsentStatusRequested";
      forPersonalData: UrlString[];
    };
    inbox?: UrlString;
  };
};

export type ConsentRequestBody = AccessRequestBody & {
  credentialSubject: {
    hasConsent: {
      forPurpose?: UrlString[];
    };
  };
  issuanceDate?: string;
  expirationDate?: string;
};

export type AccessRequestParameters = {
  requestor: UrlString;
  access: Partial<access.Access>;
  resources: UrlString[];
  requestorInboxUrl?: UrlString;
  status: "ConsentStatusRequested";
};

export type ConsentRequestParameters = AccessRequestParameters & {
  purpose: UrlString[];
  issuanceDate?: Date;
  expirationDate?: Date;
};

function areConsentRequestParameters(
  parameters: ConsentRequestParameters | AccessRequestParameters
): parameters is ConsentRequestParameters {
  return (parameters as ConsentRequestParameters).purpose !== undefined;
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
  const modes = accessToConsentRequestModes(params.access);
  const request: AccessRequestBody = {
    "@context": CONTEXT_CONSENT,
    type: ["SolidConsentRequest"],
    credentialSubject: {
      id: params.requestor,
      hasConsent: {
        mode: modes,
        hasStatus: "ConsentStatusRequested",
        forPersonalData: params.resources,
      },
    },
  };
  if (params.requestorInboxUrl) {
    request.credentialSubject.inbox = params.requestorInboxUrl;
  }
  if (areConsentRequestParameters(params)) {
    if (params.issuanceDate) {
      (request as ConsentRequestBody).issuanceDate =
        params.issuanceDate.toISOString();
    }
    if (params.expirationDate) {
      (request as ConsentRequestBody).expirationDate =
        params.expirationDate.toISOString();
    }
    (request as ConsentRequestBody).credentialSubject.hasConsent.forPurpose =
      params.purpose;
  }
  return request;
}
