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
import { VerifiableCredential } from "@inrupt/solid-client-vc";
import {
  AccessRequestBody,
  isConsentRequest,
  getGrantBody,
  isAccessRequest,
  issueAccessOrConsentVc,
  ConsentRequestBody,
  dereferenceVcIri,
  getDefaultSessionFetch,
} from "../consent.internal";
import {
  ConsentGrantBaseOptions,
  CONSENT_STATUS_EXPLICITLY_GIVEN,
  ResourceAccessMode,
  RESOURCE_ACCESS_MODE_APPEND,
  RESOURCE_ACCESS_MODE_CONTROL,
  RESOURCE_ACCESS_MODE_READ,
  RESOURCE_ACCESS_MODE_WRITE,
} from "../constants";

function getRequestorFromRequest(requestVc: AccessRequestBody): UrlString {
  return requestVc.credentialSubject.id;
}

function getModesFromRequest(
  requestVc: AccessRequestBody
): ResourceAccessMode[] {
  return requestVc.credentialSubject.hasConsent.mode;
}

function modesToAccess(modes: ResourceAccessMode[]): Partial<Access> {
  const access: Partial<Access> = {};
  access.append = modes.includes(RESOURCE_ACCESS_MODE_APPEND);
  access.control = modes.includes(RESOURCE_ACCESS_MODE_CONTROL);
  access.read = modes.includes(RESOURCE_ACCESS_MODE_READ);
  access.write = modes.includes(RESOURCE_ACCESS_MODE_WRITE);
  return access;
}

function getInboxFromRequest(requestVc: AccessRequestBody): UrlString {
  return requestVc.credentialSubject.inbox;
}

function getResourcesFromRequest(requestVc: AccessRequestBody): UrlString[] {
  return requestVc.credentialSubject.hasConsent.forPersonalData;
}

function getIssuanceFromRequest(
  requestVc: AccessRequestBody & { issuanceDate: string }
): Date | undefined {
  return new Date(requestVc.issuanceDate);
}

function getPurposeFromConsentRequest(
  requestVc: ConsentRequestBody
): UrlString[] | undefined {
  return requestVc.credentialSubject.hasConsent.forPurpose;
}

function getExpirationFromConsentRequest(
  requestVc: ConsentRequestBody
): Date | undefined {
  return requestVc.expirationDate !== undefined
    ? new Date(requestVc.expirationDate)
    : undefined;
}

function initializeGrantParameters(
  requestVc?:
    | (AccessRequestBody & { issuanceDate: string })
    | (ConsentRequestBody & { issuanceDate: string }),
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
      requestorInboxIri:
        requestOverride?.requestorInboxIri ?? getInboxFromRequest(requestVc),
      issuanceDate:
        requestOverride?.issuanceDate ?? getIssuanceFromRequest(requestVc),
    };
    if (isConsentRequest(requestVc)) {
      internalOptions = {
        ...internalOptions,
        purpose:
          requestOverride?.purpose ?? getPurposeFromConsentRequest(requestVc),
        expirationDate:
          requestOverride?.expirationDate ??
          getExpirationFromConsentRequest(requestVc),
      };
    }
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
  requestVc: VerifiableCredential | UrlString,
  requestOverride?: Partial<{
    requestor: WebId;
    access: Partial<Access>;
    resources: Array<UrlString>;
    requestorInboxIri: UrlString;
  }>,
  options?: ConsentGrantBaseOptions
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
  options?: ConsentGrantBaseOptions
): Promise<VerifiableCredential>;
export async function approveAccessRequest(
  requestVc?: VerifiableCredential | UrlString,
  requestOverride?: Partial<{
    requestor: WebId;
    access: Partial<Access>;
    resources: Array<UrlString>;
    requestorInboxIri: UrlString;
  }>,
  options: ConsentGrantBaseOptions = {}
): Promise<VerifiableCredential> {
  const fetcher = options.fetch ?? (await getDefaultSessionFetch());
  let requestCredential;
  if (typeof requestVc === "string") {
    requestCredential = await dereferenceVcIri(requestVc, fetcher);
  } else {
    requestCredential = requestVc;
  }
  if (requestCredential !== undefined && !isAccessRequest(requestCredential)) {
    throw new Error(
      `Unexpected VC provided for approval: ${JSON.stringify(requestVc)}`
    );
  }
  const internalOptions = initializeGrantParameters(
    requestCredential,
    requestOverride
  );
  const requestBody = getGrantBody({
    access: internalOptions.access,
    requestor: internalOptions.requestor,
    resources: internalOptions.resources,
    requestorInboxUrl: internalOptions.requestorInboxIri,
    status: CONSENT_STATUS_EXPLICITLY_GIVEN,
  });
  return issueAccessOrConsentVc(internalOptions.requestor, requestBody, {
    fetch: fetcher,
    consentEndpoint: options.consentEndpoint,
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
  requestVc: VerifiableCredential | UrlString,
  requestOverride?: Partial<{
    requestor: WebId;
    access: Partial<Access>;
    resources: Array<UrlString>;
    requestorInboxIri: UrlString;
    purpose: Array<UrlString>;
    issuanceDate: Date;
    expirationDate: Date;
  }>,
  options?: ConsentGrantBaseOptions
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
  options?: ConsentGrantBaseOptions
): Promise<VerifiableCredential>;
export async function approveAccessRequestWithConsent(
  requestVc?: VerifiableCredential | UrlString,
  requestOverride?: Partial<{
    requestor: WebId;
    access: Partial<Access>;
    resources: Array<UrlString>;
    purpose: Array<UrlString>;
    requestorInboxIri: UrlString;
    issuanceDate: Date;
    expirationDate: Date;
  }>,
  options: ConsentGrantBaseOptions = {}
): Promise<VerifiableCredential> {
  const fetcher = options.fetch ?? (await getDefaultSessionFetch());
  let requestCredential;
  if (typeof requestVc === "string") {
    requestCredential = await dereferenceVcIri(requestVc, fetcher);
  } else {
    requestCredential = requestVc;
  }
  if (
    requestCredential !== undefined &&
    !(isAccessRequest(requestCredential) && isConsentRequest(requestCredential))
  ) {
    throw new Error(
      `Unexpected VC provided for approval: ${JSON.stringify(requestVc)}`
    );
  }
  const initialisedOptions = initializeGrantParameters(
    requestCredential,
    requestOverride
  );
  const requestBody = getGrantBody({
    access: initialisedOptions.access,
    requestor: initialisedOptions.requestor,
    resources: initialisedOptions.resources,
    requestorInboxUrl: initialisedOptions.requestorInboxIri,
    status: CONSENT_STATUS_EXPLICITLY_GIVEN,
    purpose: initialisedOptions.purpose,
    issuanceDate: initialisedOptions.issuanceDate,
    expirationDate: initialisedOptions.expirationDate,
  });
  return issueAccessOrConsentVc(initialisedOptions.requestor, requestBody, {
    fetch: fetcher,
    consentEndpoint: options.consentEndpoint,
  });
}
