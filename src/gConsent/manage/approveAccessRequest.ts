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

import type { UrlString } from "@inrupt/solid-client";
// eslint-disable-next-line camelcase
import { acp_ess_2 } from "@inrupt/solid-client";
import type {
  DatasetWithId,
  VerifiableCredential,
  VerifiableCredentialBase,
} from "@inrupt/solid-client-vc";
import { gc, solidVc } from "../../common/constants";
import { getSessionFetch } from "../../common/util/getSessionFetch";
import type { AccessModes } from "../../type/AccessModes";
import {
  ACL_RESOURCE_ACCESS_MODE_APPEND,
  ACL_RESOURCE_ACCESS_MODE_READ,
  ACL_RESOURCE_ACCESS_MODE_WRITE,
} from "../../type/ResourceAccessMode";
import { isAccessGrant } from "../guard/isAccessGrant";
import {
  isBaseAccessGrantVerifiableCredential,
  isRdfjsBaseAccessGrantVerifiableCredential,
} from "../guard/isBaseAccessGrantVerifiableCredential";
import type {
  AccessBaseOptions,
  WithLegacyJsonFlag,
} from "../type/AccessBaseOptions";
import type { AccessGrant } from "../type/AccessGrant";
import type { AccessGrantBody } from "../type/AccessVerifiableCredential";
import type { AccessGrantParameters } from "../type/Parameter";
import { getBaseAccess } from "../util/getBaseAccessVerifiableCredential";
import { initializeGrantParameters } from "../util/initializeGrantParameters";
import { getGrantBody, issueAccessVc } from "../util/issueAccessVc";

export type ApproveAccessRequestOverrides = Omit<
  Omit<AccessGrantParameters, "status">,
  "expirationDate"
> & { expirationDate?: Date | null };

/**
 * Internal function. This is a stopgap until we have proper JSON-LD parsing.
 * It enforces the shape of the JSON returned by the issuer service, which may
 * vary while still serializing the same data.
 *
 * In particular, this transforms some literals into a one-value array.
 *
 * @hidden
 * @param accessGrant The grant returned by the VC issuer
 * @returns An equivalent JSON-LD document framed according to our typing.
 */
export function normalizeAccessGrant<T extends VerifiableCredentialBase>(
  accessGrant: T,
): T {
  // Proper type checking is performed after normalization, so casting here is fine.
  const normalized = { ...accessGrant } as unknown as AccessGrant;
  if (normalized.credentialSubject.providedConsent === undefined) {
    throw new Error(
      `[${normalized.id}] is not an Access Grant: missing field "credentialSubject.providedConsent".`,
    );
  }
  if (!Array.isArray(normalized.credentialSubject.providedConsent.mode)) {
    normalized.credentialSubject.providedConsent.mode = [
      normalized.credentialSubject.providedConsent.mode,
    ];
  }
  if (
    !Array.isArray(normalized.credentialSubject.providedConsent.forPersonalData)
  ) {
    normalized.credentialSubject.providedConsent.forPersonalData = [
      normalized.credentialSubject.providedConsent.forPersonalData,
    ];
  }
  if (
    typeof normalized.credentialSubject.providedConsent.inherit === "string"
  ) {
    // Literals are also interpreted based on the JSON-LD context, so a "true" value
    // could map to a "true"^^xsd:boolean, which is a boolean.
    normalized.credentialSubject.providedConsent.inherit =
      normalized.credentialSubject.providedConsent.inherit === "true";
  }
  // Cast back to the original type
  return normalized as unknown as T;
}

function getAccessModesFromAccessGrant(request: AccessGrantBody): AccessModes {
  const accessMode: AccessModes = {};
  const requestModes = request.credentialSubject.providedConsent.mode;

  accessMode.append = requestModes.includes(ACL_RESOURCE_ACCESS_MODE_APPEND);
  accessMode.read = requestModes.includes(ACL_RESOURCE_ACCESS_MODE_READ);
  accessMode.write = requestModes.includes(ACL_RESOURCE_ACCESS_MODE_WRITE);

  return accessMode;
}

async function addVcMatcher(
  targetResources: Array<UrlString>,
  accessMode: AccessModes,
  options?: { fetch?: typeof global.fetch; inherit?: boolean },
) {
  return Promise.all(
    targetResources.map(async (targetResource) => {
      // eslint-disable-next-line camelcase
      const resourceInfo = await acp_ess_2.getResourceInfoWithAcr(
        targetResource,
        options,
      );
      // eslint-disable-next-line camelcase
      if (!acp_ess_2.hasAccessibleAcr(resourceInfo)) {
        throw new Error(
          "The current user does not have access to the resource's Access Control Resource. Either they have insufficiant credentials, or the resource is not controlled using ACP. In either case, an Access Grant cannot be issued.",
        );
      }
      // eslint-disable-next-line camelcase
      const updatedResource = acp_ess_2.setVcAccess(resourceInfo, accessMode, {
        inherit: options?.inherit ?? true,
      });
      // eslint-disable-next-line camelcase
      return acp_ess_2.saveAcrFor(updatedResource, options);
    }),
  );
}

/**
 * Approve an access request. The content of the approved access request is provided
 * as a Verifiable Credential which properties may be overridden if necessary.
 *
 * @param requestVc The Verifiable Credential representing the Access Request. If
 * not conform to an Access Request, the function will throw.
 * @param requestOverride Elements overriding information from the provided Verifiable
 * Credential.
 * @param options Optional properties to customizes the access grant behavior. Options
 * include `updateAcr` which defaults to true. If this flag is set to true, the ACR
 * of the Resource will be updated when the access grant is approved. If this flag is
 * set to false, the ACR of the Resource will remain unchanged. This is an advanced
 * feature, and only users having a good understanding of the relationship between
 * Access Grants and ACRs should deviate from the default. Additional information is
 * available in [the ESS documentation](https://docs.inrupt.com/ess/latest/security/access-requests-grants/#acp)
 * @returns A Verifiable Credential representing the granted access.
 * @since 0.0.1.
 */
export async function approveAccessRequest(
  // If the VC is specified, all the overrides become optional
  requestVc: DatasetWithId | VerifiableCredential | URL | UrlString,
  requestOverride: Partial<ApproveAccessRequestOverrides>,
  options: AccessBaseOptions & {
    returnLegacyJsonld: false;
  },
): Promise<DatasetWithId>;

/**
 * Approve an access request. The content of the approved access request is provided
 * as a Verifiable Credential which properties may be overridden if necessary.
 *
 * @param requestVc The Verifiable Credential representing the Access Request. If
 * not conform to an Access Request, the function will throw.
 * @param requestOverride Elements overriding information from the provided Verifiable
 * Credential.
 * @param options Optional properties to customizes the access grant behavior. Options
 * include `updateAcr` which defaults to true. If this flag is set to true, the ACR
 * of the Resource will be updated when the access grant is approved. If this flag is
 * set to false, the ACR of the Resource will remain unchanged. This is an advanced
 * feature, and only users having a good understanding of the relationship between
 * Access Grants and ACRs should deviate from the default. Additional information is
 * available in [the ESS documentation](https://docs.inrupt.com/ess/latest/security/access-requests-grants/#acp)
 * @returns A Verifiable Credential representing the granted access.
 * @since 0.0.1.
 * @deprecated Set the options flag `returnLegacyJsonLd` to false, and prefer using the RDFJS interfaces.
 */
export async function approveAccessRequest(
  // If the VC is specified, all the overrides become optional
  requestVc: DatasetWithId | VerifiableCredential | URL | UrlString,
  requestOverride?: Partial<ApproveAccessRequestOverrides>,
  options?: AccessBaseOptions & {
    returnLegacyJsonld?: true;
  },
): Promise<AccessGrant>;

/**
 * Approve an access request. The content of the approved access request is provided
 * as a Verifiable Credential which properties may be overridden if necessary.
 *
 * @param requestVc The Verifiable Credential representing the Access Request. If
 * not conform to an Access Request, the function will throw.
 * @param requestOverride Elements overriding information from the provided Verifiable
 * Credential.
 * @param options Optional properties to customizes the access grant behavior. Options
 * include `updateAcr` which defaults to true. If this flag is set to true, the ACR
 * of the Resource will be updated when the access grant is approved. If this flag is
 * set to false, the ACR of the Resource will remain unchanged. This is an advanced
 * feature, and only users having a good understanding of the relationship between
 * Access Grants and ACRs should deviate from the default. Additional information is
 * available in [the ESS documentation](https://docs.inrupt.com/ess/latest/security/access-requests-grants/#acp)
 * @returns A Verifiable Credential representing the granted access.
 * @since 0.0.1.
 * @deprecated Set the options flag `returnLegacyJsonLd` to false, and prefer using the RDFJS interfaces.
 */
export async function approveAccessRequest(
  // If the VC is specified, all the overrides become optional
  requestVc: DatasetWithId | VerifiableCredential | URL | UrlString,
  requestOverride?: Partial<ApproveAccessRequestOverrides>,
  options?: AccessBaseOptions & {
    returnLegacyJsonld?: boolean;
  },
): Promise<DatasetWithId>;

/**
 * Approve an access request. The content of the approved access request is provided
 * as a set of claims, and no input Verifiable Credential is expected.
 *
 * @param requestVc A Verifiable Credential that would represent the Access Request if provided.
 * @param requestOverride Claims constructing the Access Grant.
 * @param options Optional properties to customise the access grant behaviour.
 * @returns A Verifiable Credential representing the granted access.
 * @since 0.0.1.
 */
export async function approveAccessRequest(
  requestVc: undefined,
  // If the VC is undefined, then some of the overrides become mandatory
  requestOverride: ApproveAccessRequestOverrides,
  options: AccessBaseOptions & {
    returnLegacyJsonld: false;
  },
): Promise<DatasetWithId>;
/**
 * Approve an access request. The content of the approved access request is provided
 * as a set of claims, and no input Verifiable Credential is expected.
 *
 * @param requestVc A Verifiable Credential that would represent the Access Request if provided.
 * @param requestOverride Claims constructing the Access Grant.
 * @param options Optional properties to customise the access grant behaviour.
 * @returns A Verifiable Credential representing the granted access.
 * @since 0.0.1.
 * @deprecated Set the options flag `returnLegacyJsonLd` to false, and prefer using the RDFJS interfaces.
 */
export async function approveAccessRequest(
  requestVc: undefined,
  // If the VC is undefined, then some of the overrides become mandatory
  requestOverride: ApproveAccessRequestOverrides,
  options?: AccessBaseOptions & {
    returnLegacyJsonld?: true;
  },
): Promise<AccessGrant>;
/**
 * Approve an access request. The content of the approved access request is provided
 * as a set of claims, and no input Verifiable Credential is expected.
 *
 * @param requestVc A Verifiable Credential that would represent the Access Request if provided.
 * @param requestOverride Claims constructing the Access Grant.
 * @param options Optional properties to customise the access grant behaviour.
 * @returns A Verifiable Credential representing the granted access.
 * @since 0.0.1.
 * @deprecated Set the options flag `returnLegacyJsonLd` to false, and prefer using the RDFJS interfaces.
 */
export async function approveAccessRequest(
  requestVc: undefined,
  // If the VC is undefined, then some of the overrides become mandatory
  requestOverride: ApproveAccessRequestOverrides,
  options?: AccessBaseOptions & WithLegacyJsonFlag,
): Promise<DatasetWithId>;
export async function approveAccessRequest(
  requestVc: DatasetWithId | VerifiableCredential | URL | UrlString | undefined,
  requestOverride?: Partial<ApproveAccessRequestOverrides>,
  options: AccessBaseOptions & WithLegacyJsonFlag = {},
): Promise<DatasetWithId> {
  const internalOptions = {
    ...options,
    fetch: options.fetch ?? (await getSessionFetch(options)),
    updateAcr: options.updateAcr ?? true,
  };

  const internalGrantOptions = initializeGrantParameters(
    typeof requestVc !== "undefined"
      ? await getBaseAccess(
          requestVc,
          options,
          solidVc.SolidAccessRequest,
          gc.ConsentStatusRequested,
        )
      : undefined,
    requestOverride,
  );

  const grantBody = getGrantBody({
    access: internalGrantOptions.access,
    requestor: internalGrantOptions.requestor,
    resources: internalGrantOptions.resources,
    requestorInboxUrl: internalGrantOptions.requestorInboxUrl,
    purpose: internalGrantOptions.purpose,
    issuanceDate: internalGrantOptions.issuanceDate,
    expirationDate: internalGrantOptions.expirationDate ?? undefined,
    status: gc.ConsentStatusExplicitlyGiven.value,
    inherit: internalGrantOptions.inherit,
  });

  const grantedAccess = getAccessModesFromAccessGrant(grantBody);

  if (internalOptions.updateAcr === true) {
    await addVcMatcher(
      grantBody.credentialSubject.providedConsent.forPersonalData,
      grantedAccess,
      internalOptions,
    );
  }

  const accessGrant = await issueAccessVc(grantBody, {
    ...internalOptions,
    returnLegacyJsonld: options.returnLegacyJsonld,
    normalize: normalizeAccessGrant,
  });

  if (
    options.returnLegacyJsonld !== false
      ? !isBaseAccessGrantVerifiableCredential(accessGrant) ||
        !isAccessGrant(accessGrant)
      : !isRdfjsBaseAccessGrantVerifiableCredential(accessGrant)
  ) {
    throw new Error(
      `Unexpected response when approving Access Request, the result is not an Access Grant: ${JSON.stringify(
        accessGrant,
      )}`,
    );
  }

  return accessGrant;
}

export default approveAccessRequest;
export type { UrlString, VerifiableCredential };
