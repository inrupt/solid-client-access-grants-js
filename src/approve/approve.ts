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

function initializeGrantParameters(
  requestVc?: AccessRequestBody,
  requestOverride?: Partial<{
    requestor: WebId;
    access: Partial<Access>;
    resources: Array<UrlString>;
    requestorInboxIri: UrlString;
    purpose: Array<UrlString>;
    issuanceDate: Date;
    expirationDate: Date;
  }>
): Exclude<Required<typeof requestOverride>, undefined> {
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
  return (internalOptions as Required<typeof requestOverride>)!;
}

/**
 * Approve an access request. The content of the approved access request is provided
 * as a Verifiable Credential which properties may be overriden if necessary.
 *
 * @param requestVc The Verifiable Credential representing the Access Request. If
 * not conform to an Access Request, the function will throw.
 * @param requestOverride Elements overriding information from the provided Verifiable Credential.
 * @param options Optional properties to customise the access grant behaviour.
 * @returns A Verifiable Credential representing the granted access.
 * @since Unreleased.
 */
export async function approveAccessRequest(
  // If the VC is specified, all the overrides become optional
  requestVc: VerifiableCredential,
  requestOverride?: Partial<{
    requestor: WebId;
    access: Partial<Access>;
    resources: Array<UrlString>;
    requestorInboxIri: UrlString;
  }>,
  options?: {
    fetch: typeof window.fetch;
    consentEndpoint?: UrlString;
  }
): Promise<VerifiableCredential>;
/**
 * Approve an access request. The content of the approved access request is provided
 * as a set of claims, and no input Verifiable Credential is expected.
 *
 * @param requestVc A Verifiable Credential that would represent the Access Request if provided.
 * @param requestOverride Claims constructing the Access Grant.
 * @param options Optional properties to customise the access grant behaviour.
 * @returns A Verifiable Credential representing the granted access.
 * @since Unreleased.
 */
export async function approveAccessRequest(
  requestVc: undefined,
  // If the VC is undefined, then some of the overrides become mandatory
  requestOverride: {
    requestor: WebId;
    access: Partial<Access>;
    resources: Array<UrlString>;
    requestorInboxIri: UrlString;
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
    requestorInboxIri: UrlString;
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
  const internalOptions = initializeGrantParameters(requestVc, requestOverride);
  const requestBody = getGrantBody({
    access: internalOptions.access,
    requestor: internalOptions.requestor,
    resources: internalOptions.resources,
    requestorInboxUrl: internalOptions.requestorInboxIri,
    status: "ConsentStatusExplicitlyGiven",
  });
  return sendRequestApproval(internalOptions.requestor, requestBody, {
    fetch: options?.fetch,
    consentEndpoint: options?.consentEndpoint,
  });
}

/**
 * Approve an consent request. The content of the approved consent request is provided
 * as a Verifiable Credential which properties may be overriden if necessary.
 *
 * @param requestVc The Verifiable Credential representing the Consent Request. If
 * not conform to a Consent Request, the function will throw.
 * @param requestOverride Elements overriding information from the provided Verifiable Credential.
 * @param options Optional properties to customise the consent grant behaviour.
 * @returns A Verifiable Credential representing the granted consent.
 * @since Unreleased.
 */
export async function approveAccessRequestWithConsent(
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
/**
 * Approve a consent request. The content of the approved consent request is provided
 * as a set of claims, and no input Verifiable Credential is expected.
 *
 * @param requestVc A Verifiable Credential that would represent the Consent Request if provided.
 * @param requestOverride Claims constructing the Consent Grant.
 * @param options Optional properties to customise the consent grant behaviour.
 * @returns A Verifiable Credential representing the granted consent.
 * @since Unreleased.
 */
export async function approveAccessRequestWithConsent(
  requestVc: undefined,
  // If the VC is undefined, then some of the overrides become mandatory
  requestOverride: {
    requestor: WebId;
    access: Partial<Access>;
    resources: Array<UrlString>;
    requestorInboxIri: UrlString;
    purpose: Array<UrlString>;
    issuanceDate: Date;
    expirationDate: Date;
  },
  options?: {
    fetch: typeof window.fetch;
    consentEndpoint?: UrlString;
  }
): Promise<VerifiableCredential>;
export async function approveAccessRequestWithConsent(
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
  const initialisedOptions = initializeGrantParameters(
    requestVc,
    requestOverride
  );
  const requestBody = getGrantBody({
    access: initialisedOptions.access,
    requestor: initialisedOptions.requestor,
    resources: initialisedOptions.resources,
    requestorInboxUrl: initialisedOptions.requestorInboxIri,
    status: "ConsentStatusExplicitlyGiven",
    purpose: initialisedOptions.purpose,
    issuanceDate: initialisedOptions.issuanceDate,
    expirationDate: initialisedOptions.expirationDate,
  });
  return sendRequestApproval(initialisedOptions.requestor, requestBody, {
    fetch: options?.fetch,
    consentEndpoint: options?.consentEndpoint,
  });
}
