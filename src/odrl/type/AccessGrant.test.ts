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

import { it, describe, expect } from "@jest/globals";
import type {
  AccessGrantOdrl,
  OdrlConstraint,
  OdrlPermission,
} from "./AccessGrant";
import { isCredentialAccessGrantOdrl } from "./AccessGrant";

const mockAccessGrantOdrl: AccessGrantOdrl = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/security/suites/ed25519-2020/v1",
    "https://www.w3.org/ns/odrl.jsonld",
    "https://www.w3.org/ns/dpv.jsonld",
    "https://www.w3.org/ns/solid/access.jsonld",
  ],
  id: "https://vc.inrupt.com/credentials/{UUID}",
  type: ["VerifiableCredential", "SolidAccessGrant"],
  issuer: "https://vc.inrupt.com",
  holder: "{WebID-friend}",
  issuanceDate: "2022-06-15T00:00:00Z",
  expirationDate: "2022-06-30T00:00:00Z",
  credentialSubject: {
    id: "{WebID-owner}",
    type: "Agreement",
    profile: "https://www.w3.org/ns/solid/odrl/access",
    assigner: "{WebID-owner}",
    assignee: "{WebID-friend}",
    permission: [
      {
        target: "https://storage.inrupt.com/{UUID}/data/",
        action: ["Read", "Write"],
        constraint: [
          {
            leftOperand: "purpose",
            operator: "eq",
            rightOperand: "InnovativeUseOfNewTechnologies",
          },
          {
            leftOperand: "application",
            operator: "eq",
            rightOperand: "https://app.example/id",
          },
        ],
      },
    ],
    prohibition: [
      {
        target: "https://storage.inrupt.com/{UUID}/data/private/",
        action: ["Read", "Write"],
      },
    ],
  },
  proof: {
    type: "Ed25519Signature2020",
    created: "2022-06-15T00:00:00Z",
    proofValue: "z5SpZtDGGz5a89PJbQT2sg...zmw1jMAR9PJU9mowshQFFdGmDN14D",
    proofPurpose: "assertionMethod",
    verificationMethod: "https://issuer.example/key-1",
  },
};

const mockConstraint = (
  mockAccessGrantOdrl.credentialSubject.permission[0]
    .constraint as OdrlConstraint[]
)[0];

describe("Valid Access Grants are recognized", () => {
  it("Validates a full ODRL-based Access Grant VC", () => {
    expect(isCredentialAccessGrantOdrl(mockAccessGrantOdrl)).toBe(true);
  });

  it("Validates an ODRL-based Access Grant VC without a prohibition.", () => {
    expect(
      isCredentialAccessGrantOdrl({
        ...mockAccessGrantOdrl,
        credentialSubject: {
          ...mockAccessGrantOdrl.credentialSubject,
          prohibition: undefined,
        },
      }),
    ).toBe(true);
  });

  it("Validates an ODRL-based Access Grant VC without a constraint.", () => {
    expect(
      isCredentialAccessGrantOdrl({
        ...mockAccessGrantOdrl,
        credentialSubject: {
          ...mockAccessGrantOdrl.credentialSubject,
          permission: [
            {
              ...mockAccessGrantOdrl.credentialSubject.permission[0],
              constraint: undefined,
            },
          ],
        },
      }),
    ).toBe(true);
  });
});

describe("Invalid Access Grants are rejected", () => {
  it("Rejects an ODRL-based Access Grant missing the SolidAccessGrant type", () => {
    expect(
      isCredentialAccessGrantOdrl({
        ...mockAccessGrantOdrl,
        type: [],
      }),
    ).toBe(false);
  });

  describe("Rejects ODRL-based Access Grant with an invalid credentialSubject", () => {
    it("Rejects an ODRL-based Access Grant subject missing the SolidAccessGrant type", () => {
      expect(
        isCredentialAccessGrantOdrl({
          ...mockAccessGrantOdrl,
          credentialSubject: {
            ...mockAccessGrantOdrl.credentialSubject,
            type: "InvalidType",
          },
        }),
      ).toBe(false);
    });

    it("Rejects an ODRL-based Access Grant subject without the Agreement type", () => {
      expect(
        isCredentialAccessGrantOdrl({
          ...mockAccessGrantOdrl,
          credentialSubject: {
            ...mockAccessGrantOdrl.credentialSubject,
            type: "InvalidType",
          },
        }),
      ).toBe(false);
    });

    it("Rejects an ODRL-based Access Grant subject without the odrl:access profile", () => {
      expect(
        isCredentialAccessGrantOdrl({
          ...mockAccessGrantOdrl,
          credentialSubject: {
            ...mockAccessGrantOdrl.credentialSubject,
            profile: "https://some.invalid/profile",
          },
        }),
      ).toBe(false);
    });

    it("Rejects an ODRL-based Access Grant subject without an assigner", () => {
      expect(
        isCredentialAccessGrantOdrl({
          ...mockAccessGrantOdrl,
          credentialSubject: {
            ...mockAccessGrantOdrl.credentialSubject,
            assigner: undefined,
          },
        }),
      ).toBe(false);
    });

    it("Rejects an ODRL-based Access Grant subject without an assignee", () => {
      expect(
        isCredentialAccessGrantOdrl({
          ...mockAccessGrantOdrl,
          credentialSubject: {
            ...mockAccessGrantOdrl.credentialSubject,
            assignee: undefined,
          },
        }),
      ).toBe(false);
    });

    it("Rejects an ODRL-based Access Grant subject without a permission array", () => {
      expect(
        isCredentialAccessGrantOdrl({
          ...mockAccessGrantOdrl,
          credentialSubject: {
            ...mockAccessGrantOdrl.credentialSubject,
            permission: undefined,
          },
        }),
      ).toBe(false);
    });
  });

  describe("Rejects ODRL-based Access Grant with invalid permissions", () => {
    it("Rejects an ODRL-based Access Grant permission without a target", () => {
      expect(
        isCredentialAccessGrantOdrl({
          ...mockAccessGrantOdrl,
          credentialSubject: {
            ...mockAccessGrantOdrl.credentialSubject,
            permission: [
              {
                ...mockAccessGrantOdrl.credentialSubject.permission[0],
                target: undefined,
              },
            ],
          },
        }),
      ).toBe(false);
    });

    it("Rejects an ODRL-based Access Grant permission without an action array", () => {
      expect(
        isCredentialAccessGrantOdrl({
          ...mockAccessGrantOdrl,
          credentialSubject: {
            ...mockAccessGrantOdrl.credentialSubject,
            permission: [
              {
                ...mockAccessGrantOdrl.credentialSubject.permission[0],
                action: undefined,
              },
            ],
          },
        }),
      ).toBe(false);
    });

    it("Rejects an ODRL-based Access Grant permission with unknown actions", () => {
      expect(
        isCredentialAccessGrantOdrl({
          ...mockAccessGrantOdrl,
          credentialSubject: {
            ...mockAccessGrantOdrl.credentialSubject,
            permission: [
              {
                ...mockAccessGrantOdrl.credentialSubject.permission[0],
                action: ["some invalid action"],
              },
            ],
          },
        }),
      ).toBe(false);
    });

    it("Rejects an ODRL-based Access Grant permission with unknown constraints", () => {
      expect(
        isCredentialAccessGrantOdrl({
          ...mockAccessGrantOdrl,
          credentialSubject: {
            ...mockAccessGrantOdrl.credentialSubject,
            permission: [
              {
                ...mockAccessGrantOdrl.credentialSubject.permission[0],
                constraint: "some invalid constraint",
              },
            ],
          },
        }),
      ).toBe(false);
    });
  });

  describe("Rejects ODRL-based Access Grant with invalid constraints", () => {
    it("Rejects an ODRL-based Access Grant permission with an unknown left operand", () => {
      expect(
        isCredentialAccessGrantOdrl({
          ...mockAccessGrantOdrl,
          credentialSubject: {
            ...mockAccessGrantOdrl.credentialSubject,
            permission: [
              {
                ...mockAccessGrantOdrl.credentialSubject.permission[0],
                constraint: [
                  {
                    ...mockConstraint,
                    leftOperand: "Some unknown operand",
                  },
                ],
              },
            ],
          },
        }),
      ).toBe(false);
    });

    it("Rejects an ODRL-based Access Grant permission with an unknown operator", () => {
      expect(
        isCredentialAccessGrantOdrl({
          ...mockAccessGrantOdrl,
          credentialSubject: {
            ...mockAccessGrantOdrl.credentialSubject,
            permission: [
              {
                ...mockAccessGrantOdrl.credentialSubject.permission[0],
                constraint: [
                  {
                    ...mockConstraint,
                    operator: "Some unknown operator",
                  },
                ],
              },
            ],
          },
        }),
      ).toBe(false);
    });

    it("Rejects an ODRL-based Access Grant permission without a right operand", () => {
      expect(
        isCredentialAccessGrantOdrl({
          ...mockAccessGrantOdrl,
          credentialSubject: {
            ...mockAccessGrantOdrl.credentialSubject,
            permission: [
              {
                ...mockAccessGrantOdrl.credentialSubject.permission[0],
                constraint: [
                  {
                    ...mockConstraint,
                    rightOperand: undefined,
                  },
                ],
              },
            ],
          },
        }),
      ).toBe(false);
    });
  });

  describe("Rejects ODRL-based Access Grant with invalid prohibitions", () => {
    it("Rejects an ODRL-based Access Grant prohibitions with a malformed prohibition", () => {
      expect(
        isCredentialAccessGrantOdrl({
          ...mockAccessGrantOdrl,
          credentialSubject: {
            ...mockAccessGrantOdrl.credentialSubject,
            prohibition: "some invalid prohibition",
          },
        }),
      ).toBe(false);
    });

    it("Rejects an ODRL-based Access Grant prohibitions without a target", () => {
      expect(
        isCredentialAccessGrantOdrl({
          ...mockAccessGrantOdrl,
          credentialSubject: {
            ...mockAccessGrantOdrl.credentialSubject,
            prohibition: [
              {
                ...(
                  mockAccessGrantOdrl.credentialSubject
                    .prohibition as OdrlPermission[]
                )[0],
                target: undefined,
              },
            ],
          },
        }),
      ).toBe(false);
    });

    it("Rejects an ODRL-based Access Grant permission without an action array", () => {
      expect(
        isCredentialAccessGrantOdrl({
          ...mockAccessGrantOdrl,
          credentialSubject: {
            ...mockAccessGrantOdrl.credentialSubject,
            prohibition: [
              {
                ...(
                  mockAccessGrantOdrl.credentialSubject
                    .prohibition as OdrlPermission[]
                )[0],
                action: undefined,
              },
            ],
          },
        }),
      ).toBe(false);
    });
  });
});
