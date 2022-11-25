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
} from "@inrupt/solid-client-access-grants";
import {
  getPodUrlAll,
  saveFileInContainer,
  getSourceUrl,
  deleteFile,
} from "@inrupt/solid-client";
import { useState } from "react";
import React from "react";

const session = getDefaultSession();
const SHARED_FILE_CONTENT = "Some content.\n";

export default function AccessGrant({
  setErrorMessage,
}: {
  setErrorMessage: (msg: string) => void;
}) {
  const [accessGrant, setAccessGrant] = useState<string>();
  const [sharedResourceIri, setSharedResourceIri] = useState<string>();

  const handleCreate = (e) => {
    // This prevents the default behaviour of the button, i.e. to resubmit, which reloads the page.
    e.preventDefault();
    if (typeof sharedResourceIri === "string") {
      // If a resource already exist, do nothing
      return;
    }
    (async () => {
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
        Buffer.from(SHARED_FILE_CONTENT),
        {
          // The session ID is a random string, used here as a unique slug.
          slug: `${session.info.sessionId}.txt`,
          fetch: session.fetch,
        }
      );
      setSharedResourceIri(getSourceUrl(savedFile));
    })();
  };

  const handleDelete = (e) => {
    // This prevents the default behaviour of the button, i.e. to resubmit, which reloads the page.
    e.preventDefault();
    (async () => {
      if (typeof sharedResourceIri !== "string") {
        // If no resource exist, do nothing
        return;
      }
      await deleteFile(sharedResourceIri, {
        fetch: session.fetch,
      });
      setSharedResourceIri(undefined);
    })();
  };

  const handleGrant = (e) => {
    // This prevents the default behaviour of the button, i.e. to resubmit, which reloads the page.
    e.preventDefault();
    if (typeof sharedResourceIri !== "string") {
      // If the resource does not exist, do nothing.
      return;
    }
    (async () => {
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
    })();
  };

  const handleRevoke = (e) => {
    // This prevents the default behaviour of the button, i.e. to resubmit, which reloads the page.
    e.preventDefault();
    if (typeof accessGrant !== "string") {
      // If the resource does not exist, do nothing.
      return;
    }
    (async () => {
      await revokeAccessGrant(JSON.parse(accessGrant), {
        fetch: session.fetch,
      });
      setAccessGrant(undefined);
    })();
  };
  return (
    <>
      <div>
        <button onClick={(e) => handleCreate(e)} data-testid="create-resource">
          Create resource
        </button>
        <button onClick={(e) => handleDelete(e)} data-testid="delete-resource">
          Delete resource
        </button>
      </div>
      <p>
        Created resource:{" "}
        <span data-testid="resource-iri">{sharedResourceIri}</span>
      </p>
      <div>
        <button onClick={(e) => handleGrant(e)} data-testid="grant-access">
          Grant access
        </button>
        <button onClick={(e) => handleRevoke(e)} data-testid="revoke-access">
          Revoke access
        </button>
      </div>
      <p>
        Granted access: <pre data-testid="access-grant">{accessGrant}</pre>
      </p>
    </>
  );
}
