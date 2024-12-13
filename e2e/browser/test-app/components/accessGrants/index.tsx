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

import { getDefaultSession } from "@inrupt/solid-client-authn-browser";
import type {
  AccessGrant,
  DatasetWithId,
} from "@inrupt/solid-client-access-grants";
import {
  issueAccessRequest,
  redirectToAccessManagementUi,
  getAccessGrant,
  cancelAccessRequest,
  getCustomFields,
  getResourceOwner,
  getResources,
  getAccessModes,
} from "@inrupt/solid-client-access-grants";
import {
  getPodUrlAll,
  saveFileInContainer,
  getSourceUrl,
  deleteFile,
} from "@inrupt/solid-client";
import React, { useState } from "react";
import { useRouter } from "next/router";

const session = getDefaultSession();
const SHARED_FILE_CONTENT = "Some content.\n";

function AccessCredential({
  vc,
  testId,
}: {
  vc: DatasetWithId | undefined;
  testId: "access-request" | "access-grant";
}) {
  if (vc === undefined) {
    return undefined;
  }
  return (
    <div data-testid={testId}>
      <p>
        Resource owner:{" "}
        <span data-testid="crendential-owner">{getResourceOwner(vc)}</span>
      </p>
      <p>
        Requested resources:{" "}
        <span data-testid="crendential-resources">{getResources(vc)}</span>
      </p>
      <p>
        Requested modes:{" "}
        <span data-testid="crendential-modes">
          {JSON.stringify(getAccessModes(vc))}
        </span>
      </p>
      <p>
        Custom fields:{" "}
        <span data-testid="credential-custom">
          {JSON.stringify(getCustomFields(vc))}
        </span>
      </p>
    </div>
  );
}

export default function AccessController({
  setErrorMessage,
}: {
  setErrorMessage: (msg: string) => void;
}) {
  const [accessGrant, setAccessGrant] = useState<AccessGrant>();
  const [accessRequestUrl, setAccessRequestUrl] = useState<string>();
  const [accessRequest, setAccessRequest] = useState<DatasetWithId>();
  const [sharedResourceIri, setSharedResourceIri] = useState<string>();
  const [customInt, setCustomInt] = useState<number>();
  const [customIntUrl, setCustomIntUrl] = useState<string>(
    "https://example.org/my-int",
  );
  const [customStr, setCustomStr] = useState<string>();
  const [customStrUrl, setCustomStrUrl] = useState<string>(
    "https://example.org/my-string",
  );
  const [customBoolean, setCustomBoolean] = useState<boolean>();
  const [customBooleanUrl, setCustomBooleanUrl] = useState<string>(
    "https://example.org/my-boolean",
  );
  const router = useRouter();

  const handleCreate = async () => {
    if (typeof sharedResourceIri === "string") {
      // If a resource already exist, do nothing
      return;
    }

    if (typeof session.info.webId !== "string") {
      setErrorMessage("You must be authenticated to create a resource.");
      return;
    }
    // Create a file in the resource owner's Pod
    const resourceOwnerPodAll = await getPodUrlAll(session.info.webId);
    if (resourceOwnerPodAll.length === 0) {
      setErrorMessage(
        "The Resource Owner WebID Profile is missing a link to at least one Pod root.",
      );
    }

    const savedFile = await saveFileInContainer(
      resourceOwnerPodAll[0],
      new File([SHARED_FILE_CONTENT], "fileForGrant", { type: "text/plain" }),
      {
        // The session ID is a random string, used here as a unique slug.
        slug: `${session.info.sessionId}.txt`,
        fetch: session.fetch,
      },
    );
    setSharedResourceIri(getSourceUrl(savedFile));
  };

  const handleDelete = async () => {
    if (typeof sharedResourceIri !== "string") {
      // If no resource exist, do nothing
      return;
    }
    await deleteFile(sharedResourceIri, {
      fetch: session.fetch,
    });
    setSharedResourceIri(undefined);
  };

  const handleRequest = async () => {
    if (typeof sharedResourceIri !== "string" || !session.info.webId) {
      // If the resource does not exist, do nothing.
      return;
    }
    const accessRequestReturned = await issueAccessRequest(
      {
        resourceOwner: session.info.webId,
        access: { read: true },
        resources: [sharedResourceIri],
      },
      {
        fetch: session.fetch,
        returnLegacyJsonld: false,
        customFields: new Set([
          {
            key: new URL(customIntUrl),
            value: customInt!,
          },
          {
            key: new URL(customStrUrl),
            value: customStr!,
          },
          {
            key: new URL(customBooleanUrl),
            value: customBoolean!,
          },
        ]),
      },
    );
    setAccessRequest(accessRequestReturned);
    setAccessRequestUrl(accessRequestReturned.id);
  };

  const handleRevoke = async () => {
    if (typeof accessRequest === "undefined") {
      // If the resource does not exist, do nothing.
      return;
    }
    await cancelAccessRequest(accessRequest, {
      fetch: session.fetch,
    });
    setAccessRequest(undefined);
    setAccessRequestUrl(undefined);
  };

  const handleCallAuthedGrant = async () => {
    if (typeof accessGrant === "undefined") {
      // If the resource does not exist, do nothing.
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await getAccessGrant(accessGrant.id, { fetch: session.fetch });
  };

  const handleAccessRequest = async () => {
    if (accessRequestUrl === undefined || !URL.canParse(accessRequestUrl)) {
      console.error(
        "Please issue an Access Request and provide its URL before being redirected.",
      );
      return;
    }
    await redirectToAccessManagementUi(
      accessRequestUrl,
      `http://localhost:3000/`,
      {
        redirectCallback: (url: string) => {
          window.location.replace(url);
        },
        fallbackAccessManagementUi: "https://amc.inrupt.com/accessRequest/",
        fetch: session.fetch,
      },
    );
  };

  const handleGrantResponse = async () => {
    if (
      (router.query.accessGrantUrl !== "" &&
        typeof router.query.accessGrantUrl === "string") ||
      window.localStorage.getItem("accessGrantUrl") !== null
    ) {
      setAccessGrant(
        await getAccessGrant(
          window.localStorage.getItem("accessGrantUrl") ??
            (router.query.accessGrantUrl as string),
          { fetch: session.fetch },
        ),
      );
    }
  };

  return (
    <>
      <div>
        <button
          type="button"
          onClick={handleCreate}
          data-testid="create-resource"
        >
          Create resource
        </button>
        <button
          type="button"
          onClick={handleDelete}
          data-testid="delete-resource"
        >
          Delete resource
        </button>
      </div>
      <p>
        Created resource:{" "}
        <span data-testid="resource-iri">{sharedResourceIri}</span>
      </p>
      <p>
        Custom fields:{" "}
        <form>
          <input
            id="customIntUrl"
            name="customIntUrl"
            value={customIntUrl}
            onChange={(e) => setCustomIntUrl(e.currentTarget.value)}
          />
          {": "}
          <input
            type="number"
            id="customInt"
            name="customInt"
            value={customInt}
            onChange={(e) =>
              setCustomInt(Number.parseInt(e.currentTarget.value, 10))
            }
          />
          <br />
          <input
            data-testid="input-custom-string-url"
            id="customStrUrl"
            name="customStrUrl"
            value={customStrUrl}
            onChange={(e) => setCustomStrUrl(e.currentTarget.value)}
          />
          {": "}
          <input
            data-testid="input-custom-string"
            id="customText"
            name="customText"
            value={customStr}
            onChange={(e) => setCustomStr(e.currentTarget.value)}
          />
          <br />
          <input
            id="customBooleanUrl"
            name="customBooleanUrl"
            value={customBooleanUrl}
            onChange={(e) => setCustomBooleanUrl(e.currentTarget.value)}
          />
          {": "}
          <input
            id="customBoolean"
            name="customBoolean"
            type="checkbox"
            checked={customBoolean}
            onClick={() => setCustomBoolean((prev) => !prev)}
          />
          <br />
        </form>
      </p>
      <p>
        Access Request to Approve:{" "}
        <input
          id="request-id"
          data-testid="access-request-id"
          placeholder="Access Request URL"
          onChange={(e) => {
            setAccessRequestUrl(e.currentTarget.value);
          }}
          value={accessRequestUrl}
        />
      </p>
      <div>
        <button
          type="button"
          onClick={handleRequest}
          data-testid="issue-access"
        >
          Issue access request
        </button>
        <button
          type="button"
          onClick={handleRevoke}
          data-testid="revoke-access"
        >
          Revoke access request
        </button>
        <button
          type="button"
          onClick={handleAccessRequest}
          data-testid="redirect-for-access"
        >
          Redirect to AMC to Grant Access
        </button>
      </div>
      <p>
        Issued access request:{" "}
        <AccessCredential vc={accessRequest} testId="access-request" />
      </p>
      <p>
        Granted access:{" "}
        <AccessCredential vc={accessGrant} testId="access-grant" />
      </p>

      <button
        type="button"
        onClick={handleCallAuthedGrant}
        data-testid="get-authed-grant"
      >
        Authenticated Fetch of Grant
      </button>
      <button
        type="button"
        onClick={handleGrantResponse}
        data-testid="handle-grant-response"
      >
        Handle Grant Response
      </button>
    </>
  );
}
