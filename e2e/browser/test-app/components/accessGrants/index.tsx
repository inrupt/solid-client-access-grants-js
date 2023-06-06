import { getDefaultSession } from "@inrupt/solid-client-authn-browser";

import {
  approveAccessRequest,
  revokeAccessGrant,
  redirectToAccessManagementUi,
  getAccessGrant,
} from "@inrupt/solid-client-access-grants";
import {
  getPodUrlAll,
  saveFileInContainer,
  getSourceUrl,
  deleteFile,
} from "@inrupt/solid-client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";

const session = getDefaultSession();
const SHARED_FILE_CONTENT = "Some content.\n";

export default function AccessGrant({
  setErrorMessage,
}: {
  setErrorMessage: (msg: string) => void;
}) {
  const [accessGrant, setAccessGrant] = useState<string>();
  const [accessRequest, setAccessRequest] = useState<string>();
  const [sharedResourceIri, setSharedResourceIri] = useState<string>();
  const router = useRouter();

  const handleGrantResponse = async () => {
    if (router.query.accessGrantUrl != "") {
      setAccessGrant(router.query.accessGrantUrl as string);
    }
  };

  const handleCreate = async (e) => {
    // This prevents the default behaviour of the button, i.e. to resubmit, which reloads the page.
    e.preventDefault();
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
        "The Resource Owner WebID Profile is missing a link to at least one Pod root."
      );
    }

    const savedFile = await saveFileInContainer(
      resourceOwnerPodAll[0],
      new File([SHARED_FILE_CONTENT], "myFile", { type: "text/plain" }),
      {
        // The session ID is a random string, used here as a unique slug.
        slug: `${session.info.sessionId}.txt`,
        fetch: session.fetch,
      }
    );
    setSharedResourceIri(getSourceUrl(savedFile));
  };

  const handleDelete = async (e) => {
    // This prevents the default behaviour of the button, i.e. to resubmit, which reloads the page.
    e.preventDefault();
    if (typeof sharedResourceIri !== "string") {
      // If no resource exist, do nothing
      return;
    }
    await deleteFile(sharedResourceIri, {
      fetch: session.fetch,
    });
    setSharedResourceIri(undefined);
  };

  const handleGrant = async (e) => {
    // This prevents the default behaviour of the button, i.e. to resubmit, which reloads the page.
    e.preventDefault();
    if (typeof sharedResourceIri !== "string") {
      // If the resource does not exist, do nothing.
      return;
    }
    const accessGrantRequest = await approveAccessRequest(
      undefined,
      {
        requestor: "https://johndoe.webid",
        access: { read: true },
        resources: [sharedResourceIri],
      },
      {
        fetch: session.fetch,
      }
    );
    setAccessGrant(JSON.stringify(accessGrantRequest, null, "  "));
  };

  const handleRevoke = async (e) => {
    // This prevents the default behaviour of the button, i.e. to resubmit, which reloads the page.
    e.preventDefault();
    if (typeof accessGrant !== "string") {
      // If the resource does not exist, do nothing.
      return;
    }
    await revokeAccessGrant(JSON.parse(accessGrant), {
      fetch: session.fetch,
    });
    setAccessGrant(undefined);
  };

  const handleCallAuthedGrant = async () => {
    await getAccessGrant(accessGrant as string, { fetch: session.fetch });
  };

  const handleAccessRequest = async () => {
    await redirectToAccessManagementUi(
      accessRequest as string,
      `http://localhost:3000/`,
      {
        redirectCallback: (url: any) => {
          console.log(`redirecting to PB ${url}`);
          window.location.replace(url);
        },
        fallbackAccessManagementUi: `https://podbrowser.inrupt.com/privacy/access/requests/`,
        fetch: session.fetch,
      }
    );
  };

  return (
    <>
      <div>
        <button
          onClick={async (e) => handleCreate(e)}
          data-testid="create-resource"
        >
          Create resource
        </button>
        <button
          onClick={async (e) => handleDelete(e)}
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
        Access Request to Approve:{" "}
        <input
          id="request-id"
          data-testid="request-id"
          placeholder="Access Request URL"
          onChange={(e) => {
            setAccessRequest(e.currentTarget.value);
          }}
        >
          {}
        </input>
      </p>
      <div>
        <button
          onClick={async (e) => handleGrant(e)}
          data-testid="grant-access"
        >
          Grant access
        </button>
        <button
          onClick={async (e) => handleRevoke(e)}
          data-testid="revoke-access"
        >
          Revoke access
        </button>
        <button
          onClick={async () => handleAccessRequest()}
          data-testid="redirect-for-access"
        >
          Redirect to PodBrowser to Grant Access
        </button>
      </div>
      <p>
        Granted access: <pre data-testid="access-grant">{accessGrant}</pre>
      </p>

      <button
        onClick={async () => handleCallAuthedGrant()}
        data-testid="get-authed-grant"
      >
        Authenticated Fetch of Grant
      </button>
      <button
        onClick={async () => handleGrantResponse()}
        data-testid="handle-grant-response"
      >
        Handle Grant Response
      </button>
    </>
  );
}
