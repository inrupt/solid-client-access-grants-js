import type { VerifiableCredential } from "@inrupt/solid-client-vc";
import type { AccessRequestBody } from "./AccessVerifiableCredential";

export type AccessRequest = VerifiableCredential & AccessRequestBody;