export default {
  "@context": {
    "@version": 1.1,
    "@protected": true,
    "ldp": "http://www.w3.org/ns/ldp#",
    "acl": "http://www.w3.org/ns/auth/acl#",
    "gc": "https://w3id.org/GConsent#",
    "vc": "http://www.w3.org/ns/solid/vc#",
    "xsd": "http://www.w3.org/2001/XMLSchema#",
    "issuerService": { "@id": "vc:issuerService", "@type": "@id" },
    "statusService": { "@id": "vc:statusService", "@type": "@id" },
    "verifierService": { "@id": "vc:verifierService", "@type": "@id" },
    "derivationService": { "@id": "vc:derivationService", "@type": "@id" },
    "proofService": { "@id": "vc:proofService", "@type": "@id" },
    "availabilityService": { "@id": "vc:availabilityService", "@type": "@id" },
    "submissionService": { "@id": "vc:submissionService", "@type": "@id" },
    "supportedSignatureTypes": {
      "@id": "vc:supportedSignatureTypes",
      "@type": "@id"
    },
    "include": { "@id": "vc:include", "@type": "@id" },
    "SolidAccessGrant": "vc:SolidAccessGrant",
    "SolidAccessRequest": "vc:SolidAccessRequest",
    "ExpiredVerifiableCredential": "vc:ExpiredVerifiableCredential",
    "inbox": { "@id": "ldp:inbox", "@type": "@id" },
    "Read": "acl:Read",
    "Write": "acl:Write",
    "Append": "acl:Append",
    "mode": { "@id": "acl:mode", "@type": "@vocab" },
    "Consent": "gc:Consent",
    "ConsentStatusExpired": "gc:ConsentStatusExpired",
    "ConsentStatusExplicitlyGiven": "gc:ConsentStatusExplicitlyGiven",
    "ConsentStatusGivenByDelegation": "gc:ConsentStatusGivenByDelegation",
    "ConsentStatusImplicitlyGiven": "gc:ConsentStatusImplicitlyGiven",
    "ConsentStatusInvalidated": "gc:ConsentStatusInvalidated",
    "ConsentStatusNotGiven": "gc:ConsentStatusNotGiven",
    "ConsentStatusRefused": "gc:ConsentStatusRefused",
    "ConsentStatusRequested": "gc:ConsentStatusRequested",
    "ConsentStatusUnknown": "gc:ConsentStatusUnknown",
    "ConsentStatusWithdrawn": "gc:ConsentStatusWithdrawn",
    "forPersonalData": { "@id": "gc:forPersonalData", "@type": "@id" },
    "forProcessing": { "@id": "gc:forProcessing", "@type": "@id" },
    "forPurpose": { "@id": "gc:forPurpose", "@type": "@id" },
    "hasConsent": { "@id": "gc:hasConsent", "@type": "@id" },
    "hasContext": { "@id": "gc:hasContext", "@type": "@id" },
    "hasStatus": { "@id": "gc:hasStatus", "@type": "@vocab" },
    "inMedium": { "@id": "gc:inMedium", "@type": "@id" },
    "isConsentForDataSubject": {
      "@id": "gc:isConsentForDataSubject",
      "@type": "@id"
    },
    "isProvidedTo": { "@id": "gc:isProvidedTo", "@type": "@id" },
    "isProvidedToPerson": { "@id": "gc:isProvidedToPerson", "@type": "@id" },
    "isProvidedToController": {
      "@id": "gc:isProvidedToController",
      "@type": "@id"
    },
    "providedConsent": { "@id": "gc:providedConsent", "@type": "@id" },
    "inherit": {
      "@id": "urn:uuid:71ab2f68-a68b-4452-b968-dd23e0570227",
      "@type": "xsd:boolean"
    }
  }
}
