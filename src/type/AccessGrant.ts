import type { VerifiableCredential } from "@inrupt/solid-client-vc";
import type { AccessGrantBody } from "./AccessVerifiableCredential";

export type AccessGrant = VerifiableCredential & AccessGrantBody;