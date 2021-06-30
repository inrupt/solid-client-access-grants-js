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
  getIriAll,
  getSolidDataset,
  getThing,
  UrlString,
  WebId,
} from "@inrupt/solid-client";
import { CONTEXT_CONSENT, SOLID_VC_ISSUER } from "./constants";

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

async function getConsentEndpointForIssuer(
  issuer: UrlString,
  fetcher: typeof fetch
): Promise<UrlString> {
  const issuerUrl = new URL(issuer);
  const issuerOrigin = issuerUrl.origin;
  const vcConfigurationUrl = new URL(issuerOrigin);
  vcConfigurationUrl.pathname = "/.well-known/vc-configuration";
  const response = await fetcher(vcConfigurationUrl.href);
  const data: { issuer?: string } = await response.json();
  if (typeof data.issuer !== "string") {
    throw new Error(
      `The Issuer at [${issuer}] did not list a Consent Issuer URL.`
    );
  }
  return data.issuer;
}

async function getIssuersForWebId(
  webId: WebId,
  fetcher: typeof fetch
): Promise<UrlString[]> {
  const profileDoc = await getSolidDataset(webId, { fetch: fetcher });
  const profile = getThing(profileDoc, webId);
  if (profile === null) {
    throw new Error(`No profile found at the WebID [${webId}].`);
  }
  const issuers = getIriAll(profile, SOLID_VC_ISSUER);
  return issuers;
}

export async function getConsentEndpointForWebId(
  webId: WebId,
  fetcher: typeof fetch
): Promise<UrlString> {
  // TODO: According to the draft documentation, apps should let users choose an
  //       Issuer if there are multiple. We could export the functions called
  //       here so that developers can implement that, although we should then
  //       also provide the ability to pass in a custom Issuer instead of the
  //       requestee's WebID.
  const issuers = await getIssuersForWebId(webId, fetcher);
  if (issuers.length === 0) {
    throw new Error(`The WebID [${webId}] does not list VS Issuers.`);
  }
  const consentEndpoint = await getConsentEndpointForIssuer(
    issuers[0],
    fetcher
  );
  return consentEndpoint;
}

// TODO: Check that these are actually the modes you can request.
//       The Server API doc does refer to `acl:` as a prefix,
//       although that is not listed in the example context.
type ConsentRequestModes = "Read" | "Append" | "Write" | "Control";

export type ConsentRequestBody = {
  credential: {
    "@context": typeof CONTEXT_CONSENT;
    type: ["VerifiableCredential", "SolidCredential", "SolidConsentRequest"];
    credentialSubject: {
      id: UrlString;
      hasConsent: {
        mode: ConsentRequestModes[];
        hasStatus: "ConsentStatusRequested";
        forPersonalData: UrlString[];
        forPurpose?: UrlString[];
      };
      inbox?: UrlString;
    };
    issuanceDate?: string;
    expirationDate?: string;
  };
};

export type ConsentRequestParameters = {
  requestor: UrlString;
  access: Partial<access.Access>;
  resources: Array<UrlString>;
  purpose?: UrlString;
  requestorInboxUrl?: UrlString;
  issuanceDate?: Date;
  expirationDate?: Date;
};

export function getConsentRequestBody(
  params: ConsentRequestParameters
): ConsentRequestBody {
  const modes = accessToConsentRequestModes(params.access);
  const consentRequest: ConsentRequestBody = {
    credential: {
      "@context": CONTEXT_CONSENT,
      type: ["VerifiableCredential", "SolidCredential", "SolidConsentRequest"],
      credentialSubject: {
        id: params.requestor,
        hasConsent: {
          mode: modes,
          hasStatus: "ConsentStatusRequested",
          forPersonalData: params.resources,
        },
      },
    },
  };
  if (params.issuanceDate) {
    consentRequest.credential.issuanceDate = params.issuanceDate.toISOString();
  }
  if (params.expirationDate) {
    consentRequest.credential.expirationDate = params.expirationDate.toISOString();
  }
  if (params.purpose) {
    consentRequest.credential.credentialSubject.hasConsent.forPurpose = [
      params.purpose,
    ];
  }
  if (params.requestorInboxUrl) {
    consentRequest.credential.credentialSubject.inbox =
      params.requestorInboxUrl;
  }

  return consentRequest;
}
