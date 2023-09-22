import vc from './vc';
import integrity from './data-integrity';
import ed25519 from './ed25519-2020';
import revocation from './revocation-list';
import status from './status-list';

export const data =  {
  "https://vc.inrupt.com/credentials/v1": vc,
  "https://w3id.org/security/data-integrity/v1": integrity,
  "https://w3id.org/vc-revocation-list-2020/v1": revocation,
  "https://w3id.org/vc/status-list/2021/v1": status,
  "https://w3id.org/security/suites/ed25519-2020/v1": ed25519,
}

export const response = Object.fromEntries(Object.entries(data).map(([key, value]) => [
  key,
  () => new Response(JSON.stringify(value), {
  headers: new Headers([
    ['content-type', 'application/ld+json']
  ])
})]));
