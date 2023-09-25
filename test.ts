import { mockConsentRequestVc } from './src/gConsent/util/access.mock'

mockConsentRequestVc().then(vc => {
  console.log(JSON.stringify(vc, null, 2))
})

// const data = {
//   "@context": [
//     "https://www.w3.org/2018/credentials/v1",
//     "https://schema.inrupt.com/credentials/v1.jsonld",
//     "https://w3id.org/security/data-integrity/v1",
//     "https://w3id.org/vc-revocation-list-2020/v1",
//     "https://w3id.org/vc/status-list/2021/v1",
//     "https://w3id.org/security/suites/ed25519-2020/v1"
//   ],
//   "id": "https://some.credential",
//   "credentialSubject": {
//     "id": "https://some.requestor",
//     // "hasConsent": {
//     //   "forPersonalData": [
//     //     "https://some.resource"
//     //   ],
//     //   "hasStatus": "https://w3id.org/GConsent#ConsentStatusRequested",
//     //   "mode": [
//     //     "http://www.w3.org/ns/auth/acl#Read"
//     //   ],
//     //   "isConsentForDataSubject": "https://some.pod/profile#you"
//     // },
//     // "inbox": "https://some.inbox"
//   },
//   // "issuanceDate": "2022-02-22T00:00:00.000Z",
//   // "issuer": "https://some.issuer",
//   // "proof": {
//   //   "created": "2022-06-08T15:28:51.810Z",
//   //   "proofPurpose": "https://example.org/some/proof/purpose",
//   //   "proofValue": "some proof",
//   //   "type": "Ed25519Signature2020",
//   //   "verificationMethod": "https://example.org/some/verification/method"
//   // },
//   "type": [
//     "VerifiableCredential"
//   ]
// }

// const data = {
//   "@context": [
//     "https://www.w3.org/2018/credentials/v1",
//     "https://schema.inrupt.com/credentials/v1.jsonld",
//     "https://w3id.org/security/data-integrity/v1",
//     "https://w3id.org/vc-revocation-list-2020/v1",
//     "https://w3id.org/vc/status-list/2021/v1",
//     "https://w3id.org/security/suites/ed25519-2020/v1"
//   ],
//   "id": "https://some.credential",
//   "credentialSubject": {
//     "id": "https://some.requestor",
//     "hasConsent": {
//       "forPersonalData": [
//         "https://some.resource"
//       ],
//       "hasStatus": "https://w3id.org/GConsent#ConsentStatusRequested",
//       "mode": [
//         "http://www.w3.org/ns/auth/acl#Read"
//       ],
//       "isConsentForDataSubject": "https://some.pod/profile#you"
//     },
//     "inbox": "https://some.inbox"
//   },
//   "issuanceDate": "2022-02-22T00:00:00.000Z",
//   "issuer": "https://some.issuer",
//   "proof": {
//     "created": "2022-06-08T15:28:51.810Z",
//     "proofPurpose": "https://example.org/some/proof/purpose",
//     "proofValue": "some proof",
//     "type": "Ed25519Signature2020",
//     "verificationMethod": "https://example.org/some/verification/method"
//   },
//   "type": [
//     "VerifiableCredential"
//   ]
// }


    // "https://schema.inrupt.com/credentials/v1.jsonld",
    // "https://w3id.org/security/data-integrity/v1",
    // "https://w3id.org/vc-revocation-list-2020/v1",
    // "https://w3id.org/vc/status-list/2021/v1",
    // "https://w3id.org/security/suites/ed25519-2020/v1"


// import { FetchDocumentLoader } from "jsonld-context-parser";
// import { JsonLdParser } from "jsonld-streaming-parser"
// import { JsonLdSerializer } from "jsonld-streaming-serializer";
// import { response } from './mocks/data';
// import { fetch } from "@inrupt/universal-fetch";

// const parser = new JsonLdParser({
//   documentLoader: new FetchDocumentLoader(async (...args) => {
//     // console.log('document loader called with', args[0].toString(), args[0].toString() in response, response)
//     if (args[0].toString() in response) {
//       // console.log('response is', await response[args[0].toString() as keyof typeof response]().text())
//       return response[args[0] as keyof typeof response]()
//     }
//     return fetch(...args);
//   })
// });

// let i = 0;

// const serializer = new JsonLdSerializer({
//   context: [
//     "https://www.w3.org/2018/credentials/v1",
//     "https://schema.inrupt.com/credentials/v1.jsonld"
//   ]
// });

// parser.on('data', (quad) => {
//   serializer.write(quad)
// })

// parser.on('end', () => {
//   serializer.end();
// })

// serializer.on('data', console.log)

// parser.write(JSON.stringify(data));
