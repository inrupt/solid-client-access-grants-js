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

import { fetch as crossFetch } from "cross-fetch";
import { ldp, rdf } from "rdf-namespaces";

import parseLinkHeader from "parse-link-header";

import {
  Access,
  SolidDataset,
  WithResourceInfo,
  access as accessFns,
  createSolidDataset,
  createThing,
  getSolidDataset,
  getThing,
  getIri,
  addIri,
  asUrl,
  addStringNoLocale,
  addStringWithLocale,
  setThing,
  saveSolidDatasetInContainer,
  deleteSolidDataset,
} from "@inrupt/solid-client";

export type ConsentGrantBaseOptions = {
  fetch?: typeof crossFetch;
  consentEndpoint?: string;
};

export type ConsentGrantRequestOptions = {
  resourceUrl: string;
  resourceOwnerWebId: string;
  expiryDate: Date;
  purpose: string;
  requestingAgentWebId: string;
  responseContainerUrl: string;
  inboxIri?: string;
} & ConsentGrantBaseOptions;

export type GetAllConsentGrantOptions = {
  pagedUrl?: string;
} & ConsentGrantBaseOptions;

export type ConsentGrantList = {
  grants: string[];
  nextPage: string | undefined;
  prevPage: string | undefined;
};

export type ConsentGrantListResponse = {
  items: string[];
  type: string;
};

export type ConsentRequest = {
  resourceUrl: string;
  purpose: string;
  expiryDate: Date;
  requestingAgentWebId: string;
  inboxIri?: string;
  resourceOwnerWebId: string;
};

export type ConsentGrant = {
  "@context": string[];
  id: string;
  issuanceDate: string;
  type: string[];

  credentialSubject: {
    id: string;
    type: string;
    "@context": {
      "@vocab": string;
    };
    providedConsent: {
      hasExpiry?: string;
      forPurpose?: string;
      forPersonalData: string;
      isProvidedTo: string;
    };
  };

  proof: {
    created: string;
    domai: string;
    proofPurpose: string;
    proofvalue: string;
    type: string;
    verificationMethod: string;
  };
};

/* Vocab URLs */
const AS_ANNOUNCE = "https://www.w3.org/ns/activitystreams#Announce";
const AS_SUMMARY = "https://www.w3.org/ns/activitystreams#summary";
const AS_ACTOR = "https://www.w3.org/ns/activitystreams#actor";
const AS_OBJECT = "https://www.w3.org/ns/activitystreams#object";
const GC_CONSENT = "https://w3id.org/GConsent#Consent";
const GC_HAS_STATUS = "https://w3id.org/GConsent#hasStatus";
const GC_STATUS_REQUESTED = "https://w3id.org/GConsent#ConsentStatusRequested";
const GC_FOR_PERSONAL_DATA = "https://w3id.org/GConsent#forPersonalData";
const GC_FOR_PURPOSE = "https://w3id.org/GConsent#forPurpose";
const GC_HAS_EXPIRY = "https://w3id.org/GConsent#hasExpiry";
const GC_IS_PROVIDED_TO = "https://w3id.org/GConsent#isProvidedTo";

const DEAFULT_CONSENT_GRANT_BASE_OPTIONS = {
  consentEndpoint: "https://consent.pod.inrupt.com",
};

export function createLDNDataset(
  options: ConsentGrantRequestOptions
): SolidDataset {
  const {
    inboxIri,
    resourceUrl,
    purpose,
    expiryDate,
    requestingAgentWebId,
  } = options;

  let dataset = createSolidDataset();
  let activity = createThing();
  let activityObject = createThing();

  // Set up the object
  activityObject = addIri(activityObject, rdf.type, GC_CONSENT);
  activityObject = addIri(activityObject, GC_HAS_STATUS, GC_STATUS_REQUESTED);
  activityObject = addIri(activityObject, GC_FOR_PERSONAL_DATA, resourceUrl);
  activityObject = addStringNoLocale(activityObject, GC_FOR_PURPOSE, purpose);

  activityObject = addIri(
    activityObject,
    GC_IS_PROVIDED_TO,
    requestingAgentWebId
  );

  if (expiryDate) {
    activityObject = addStringNoLocale(
      activityObject,
      GC_HAS_EXPIRY,
      expiryDate.toISOString()
    );
  }

  if (inboxIri) {
    activityObject = addIri(activityObject, ldp.inbox, inboxIri);
  }

  dataset = setThing(dataset, activityObject);

  // Set up the activity
  activity = addIri(activity, rdf.type, AS_ANNOUNCE);
  activity = addIri(activity, AS_ACTOR, requestingAgentWebId);
  activity = addStringWithLocale(
    activity,
    AS_SUMMARY,
    `${requestingAgentWebId} has requested access to ${resourceUrl}`,
    "en"
  );

  // add link to object
  activity = addIri(activity, AS_OBJECT, activityObject);

  return setThing(dataset, activity);
}

// Dynamically import solid-client-authn-browser so that this library doesn't have a hard
// dependency.
export async function getDefaultSessionFetch(): Promise<typeof crossFetch> {
  try {
    const { fetch: fetchFn } = await import(
      "@inrupt/solid-client-authn-browser"
    );

    return fetchFn;
  } catch (e) {
    return crossFetch;
  }
}

export async function getInboxFromWebId(
  webId: string,
  fetchFn: typeof fetch
): Promise<string> {
  const profileDataset = await getSolidDataset(webId, {
    fetch: fetchFn,
  });

  const profile = getThing(profileDataset, webId);

  if (!profile) {
    throw new Error("Profile unreachable.");
  }

  const inboxIri = getIri(profile, ldp.inbox);

  if (!inboxIri) {
    throw new Error("Inbox IRI not accessible from profile.");
  }

  return inboxIri;
}

export async function createConsentGrantRequest(
  options: ConsentGrantRequestOptions
): Promise<SolidDataset & WithResourceInfo> {
  const fetchFn = options.fetch || (await getDefaultSessionFetch());

  const inboxIri =
    options.inboxIri ||
    (await getInboxFromWebId(options.resourceOwnerWebId, fetchFn));

  const ldnDataset = createLDNDataset({
    ...options,
    inboxIri,
  });

  return saveSolidDatasetInContainer(inboxIri, ldnDataset, { fetch: fetchFn });
}

export function isSolidDataset(
  consentRequest: SolidDataset | ConsentRequest
): consentRequest is SolidDataset {
  return (consentRequest as SolidDataset).graphs !== undefined;
}

export async function approveConsentGrant(
  consentRequest: SolidDataset | ConsentRequest,
  access?: Access,
  options: ConsentGrantBaseOptions = DEAFULT_CONSENT_GRANT_BASE_OPTIONS
): Promise<ConsentGrant> {
  const fetchFn = options.fetch || (await getDefaultSessionFetch());

  let resourceUrl;
  let purpose;
  let expiryDate;
  let requestingAgentWebId;
  let inboxIri;
  let resourceOwnerWebId;

  if (isSolidDataset(consentRequest)) {
    throw new Error("Not implemented; please pass in a ConsentRequest object.");
  } else {
    resourceUrl = consentRequest.resourceUrl;
    purpose = consentRequest.purpose;
    expiryDate = consentRequest.expiryDate;
    requestingAgentWebId = consentRequest.requestingAgentWebId;
    resourceOwnerWebId = consentRequest.resourceOwnerWebId;

    inboxIri =
      consentRequest.inboxIri ||
      (await getInboxFromWebId(resourceOwnerWebId, fetchFn));
  }

  const grantJSONLD = {
    credential: {
      credentialSubject: {
        "@context": {
          "@vocab": "https://w3id.org/GConsent#",
          inbox: {
            "@id": "http://www.w3.org/ns/ldp#inbox",
            "@type": "@id",
          },
        },
        type: "Consent",
        inbox: inboxIri,
        providedConsent: {
          hasStatus: "ExplicitlyGiven",
          forPersonalData: resourceUrl,
          forPurpose: purpose,
          hasExpiry: expiryDate.toISOString(),
          isProvidedTo: requestingAgentWebId,
        },
      },
    },
  };

  const response = await fetchFn(`${options.consentEndpoint}/issue`, {
    method: "POST",
    body: JSON.stringify(grantJSONLD),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (response.ok && access) {
    await accessFns.setAgentAccess(resourceUrl, requestingAgentWebId, access, {
      fetch: fetchFn,
    });
  }

  return (await response.json()) as ConsentGrant;
}

export async function rejectConsentGrant(
  consentRequest: SolidDataset & WithResourceInfo,
  options: ConsentGrantBaseOptions = DEAFULT_CONSENT_GRANT_BASE_OPTIONS
): Promise<void> {
  const fetchFn = options.fetch || (await getDefaultSessionFetch());
  return deleteSolidDataset(consentRequest, { fetch: fetchFn });
}

export async function getAllConsentGrants(
  options: GetAllConsentGrantOptions = DEAFULT_CONSENT_GRANT_BASE_OPTIONS
): Promise<ConsentGrantList> {
  const fetchFn = options.fetch || (await getDefaultSessionFetch());

  const response = await fetchFn(
    options.pagedUrl || `${options.consentEndpoint}/vc/`
  );

  const { headers } = response;
  const pagingHeaders = parseLinkHeader(headers.get("link") || "");

  const json = (await response.json()) as ConsentGrantListResponse;
  const { items } = json;

  return Promise.resolve({
    nextPage: pagingHeaders?.next?.url,
    prevPage: pagingHeaders?.prev?.url,
    grants: items,
  });
}

export async function getConsentGrant(
  consentGrantUrl: string,
  options: ConsentGrantBaseOptions = DEAFULT_CONSENT_GRANT_BASE_OPTIONS
): Promise<ConsentGrant> {
  const fetchFn = options.fetch || (await getDefaultSessionFetch());
  const response = await fetchFn(consentGrantUrl);
  return (await response.json()) as ConsentGrant;
}

export async function revokeConsentGrant(
  consentGrantUrl: string,
  options: ConsentGrantBaseOptions = DEAFULT_CONSENT_GRANT_BASE_OPTIONS
): Promise<Response> {
  const fetchFn = options.fetch || (await getDefaultSessionFetch());

  return fetchFn(consentGrantUrl, {
    method: "DELETE",
  });
}
