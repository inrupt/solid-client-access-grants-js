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

import { Access, UrlString, WebId } from "@inrupt/solid-client";
import {
  issueVerifiableCredential,
  VerifiableCredential,
} from "@inrupt/solid-client-vc";
import {
  AccessRequestBody,
  ConsentRequestBody,
  isConsentRequest,
  getDefaultSessionFetch,
  getConsentEndpointForResource,
  ConsentGrantParameters,
  AccessGrantParameters,
  getGrantBody,
  ConsentRequestModes,
} from "../consent.internal";
import { ConsentGrantBaseOptions, isAccessRequest } from "../request/request";

function getRequestorFromRequest(requestVc: AccessRequestBody): UrlString {
  return requestVc.credentialSubject.id;
}

function getModesFromRequest(
  requestVc: AccessRequestBody
): ConsentRequestModes[] {
  return requestVc.credentialSubject.hasConsent.mode;
}

function modesToAccess(modes: ConsentRequestModes[]): Partial<Access> {
  const access: Partial<Access> = {};
  access.append = modes.includes("Append");
  access.control = modes.includes("Control");
  access.read = modes.includes("Read");
  access.write = modes.includes("Write");
  return access;
}

function getInboxFromRequest(requestVc: AccessRequestBody): UrlString {
  return requestVc.credentialSubject.inbox;
}

function getResourcesFromRequest(requestVc: AccessRequestBody): UrlString[] {
  return requestVc.credentialSubject.hasConsent.forPersonalData;
}

function getPurposeFromConsentRequest(
  requestVc: AccessRequestBody
): UrlString[] | undefined {
  return isConsentRequest(requestVc)
    ? requestVc.credentialSubject.hasConsent.forPurpose
    : undefined;
}

function getIssuanceFromConsentRequest(
  requestVc: AccessRequestBody
): Date | undefined {
  return isConsentRequest(requestVc) && requestVc.issuanceDate !== undefined
    ? new Date(requestVc.issuanceDate)
    : undefined;
}

function getExpirationFromConsentRequest(
  requestVc: AccessRequestBody
): Date | undefined {
  return isConsentRequest(requestVc) && requestVc.expirationDate !== undefined
    ? new Date(requestVc.expirationDate)
    : undefined;
}

async function sendRequestApproval(
  requestor: WebId,
  requestApproval: AccessRequestBody | ConsentRequestBody,
  options: ConsentGrantBaseOptions
): Promise<VerifiableCredential> {
  const fetcher = options.fetch ?? (await getDefaultSessionFetch());
  // We assume that all the resources are controlled by the same consent endpoint.
  const consentEndpoint =
    options.consentEndpoint ??
    (await getConsentEndpointForResource(
      requestApproval.credentialSubject.hasConsent.forPersonalData[0],
      fetcher
    ));
  return issueVerifiableCredential(
    consentEndpoint,
    requestor,
    {
      "@context": requestApproval["@context"],
      ...requestApproval.credentialSubject,
    },
    {
      "@context": requestApproval["@context"],
      type: ["SolidConsentRequest"],
      issuanceDate: isConsentRequest(requestApproval)
        ? requestApproval.issuanceDate
        : undefined,
      expirationDate: isConsentRequest(requestApproval)
        ? requestApproval.expirationDate
        : undefined,
    },
    {
      fetch: fetcher,
    }
  );
}

export async function approveAccessRequest(
  // If the VC is specified, all the overrides become optional
  requestVc: VerifiableCredential,
  requestOverride?: Partial<{
    requestor: WebId;
    access: Partial<Access>;
    resources: Array<UrlString>;
    requestorInboxIri: UrlString;
    purpose: Array<UrlString>;
    issuanceDate: Date;
    expirationDate: Date;
  }>,
  options?: {
    fetch: typeof window.fetch;
    consentEndpoint?: UrlString;
  }
): Promise<VerifiableCredential>;
export async function approveAccessRequest(
  requestVc: undefined,
  // If the VC is undefined, then some of the overrides become mandatory
  requestOverride: {
    requestor: WebId;
    access: Partial<Access>;
    resources: Array<UrlString>;
    requestorInboxIri: UrlString;
    purpose?: Array<UrlString>;
    issuanceDate?: Date;
    expirationDate?: Date;
  },
  options?: {
    fetch: typeof window.fetch;
    consentEndpoint?: UrlString;
  }
): Promise<VerifiableCredential>;
export async function approveAccessRequest(
  requestVc?: VerifiableCredential,
  requestOverride?: Partial<{
    requestor: WebId;
    access: Partial<Access>;
    resources: Array<UrlString>;
    purpose: Array<UrlString>;
    requestorInboxIri: UrlString;
    issuanceDate: Date;
    expirationDate: Date;
  }>,
  options?: {
    fetch: typeof window.fetch;
    consentEndpoint?: UrlString;
  }
): Promise<VerifiableCredential> {
  if (requestVc !== undefined && !isAccessRequest(requestVc)) {
    throw new Error(
      `Unexpected VC provided for approval: ${JSON.stringify(requestVc)}`
    );
  }
  let internalOptions: typeof requestOverride;
  if (requestVc === undefined) {
    internalOptions = requestOverride;
  } else {
    internalOptions = {
      requestor:
        requestOverride?.requestor ?? getRequestorFromRequest(requestVc),
      access:
        requestOverride?.access ??
        modesToAccess(getModesFromRequest(requestVc)),
      resources:
        requestOverride?.resources ?? getResourcesFromRequest(requestVc),
      purpose:
        requestOverride?.purpose ?? getPurposeFromConsentRequest(requestVc),
      requestorInboxIri:
        requestOverride?.requestorInboxIri ?? getInboxFromRequest(requestVc),
      issuanceDate:
        requestOverride?.issuanceDate ??
        getIssuanceFromConsentRequest(requestVc),
      expirationDate:
        requestOverride?.expirationDate ??
        getExpirationFromConsentRequest(requestVc),
    };
  }
  // At this point, all the assertions in internalOptions are initialised, either
  // from the provided VC or from the provided override.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const initialisedOptions = (internalOptions as Required<
    typeof requestOverride
  >)!;
  let bodyRequestParams: AccessGrantParameters | ConsentGrantParameters = {
    access: initialisedOptions.access,
    requestor: initialisedOptions.requestor,
    resources: initialisedOptions.resources,
    requestorInboxUrl: initialisedOptions.requestorInboxIri,
    status: "ConsentStatusExplicitlyGiven",
  };
  if (initialisedOptions.purpose !== undefined) {
    bodyRequestParams = {
      ...bodyRequestParams,
      purpose: initialisedOptions.purpose,
      issuanceDate: initialisedOptions.issuanceDate,
      expirationDate: initialisedOptions.expirationDate,
    };
  }
  const requestBody = getGrantBody(bodyRequestParams);
  return sendRequestApproval(initialisedOptions.requestor, requestBody, {
    fetch: options?.fetch,
    consentEndpoint: options?.consentEndpoint,
  });
}
