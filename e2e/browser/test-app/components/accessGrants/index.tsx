//
// Copyright 2022 Inrupt Inc.
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
import {
  approveAccessRequest,
  revokeAccessGrant,
  redirectToAccessManagementUi,
  issueAccessRequest,
  GRANT_VC_URL_PARAM_NAME,
} from "@inrupt/solid-client-access-grants";
import {
  getPodUrlAll,
  saveFileInContainer,
  getSourceUrl,
  deleteFile,
} from "@inrupt/solid-client";
import React, { useState } from "react";

const session = getDefaultSession();
const SHARED_FILE_CONTENT = "Some content.\n";
// This is the endpoint our NodeJS demo app listens on to receive incoming login
// const redirectUrl = new URL("/redirect", process.env.APP_URL);
// const REDIRECT_URL = redirectUrl.href;
const expirationDate = new Date(Date.now() + 180 * 6000);

const REACT_APP_BACKEND_PORT = 3001;

export default function AccessGrant({
  setErrorMessage,
}: {
  setErrorMessage: (msg: string) => void;
}) {
  const [accessGrant, setAccessGrant] = useState<string>();
  const [sharedResourceIri, setSharedResourceIri] = useState<string>();

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
      new Blob([SHARED_FILE_CONTENT], { type: "text/plain" }),
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

  const handleAccessRequest = () => {
    // const { webId } = session.info;
    const webId = "https://id.inrupt.com/cpinkafly1";
    console.log(webId);
    const urlResource =
      "https://storage.inrupt.com/a008ce30-b7c5-4e5b-a15d-f95903aacfa4/628f6a59-96e3-4f9c-ad50-7dfaea3a1ea8.txt";
    console.log(sharedResourceIri);
    console.log(
      JSON.stringify({
        resource: urlResource,
        owner: webId,
        expirationDate,
      })
    );
    return fetch(`/api/request`, {
      method: "POST",
      headers: {
        Accept: "application.json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resource: urlResource,
        owner: webId,
        expirationDate,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("got here");
        console.log(data);
        redirectToAccessManagementUi(
          data.accessRequest,
          `http://localhost:3000/home`,
          {
            redirectCallback: (url: any) => {
              console.log(`redirecting to PB ${url}`);
              window.location.replace(url);
            },
            fallbackAccessManagementUi: `https://podbrowser.inrupt.com/privacy/access/requests/`,
          }
        );
      });
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
        <button onClick={handleAccessRequest} data-testid="redirect-for-access">
          Redirect to PodBrowser to Grant Access
        </button>
      </div>
      <p>
        Granted access: <pre data-testid="access-grant">{accessGrant}</pre>
      </p>
    </>
  );
}
