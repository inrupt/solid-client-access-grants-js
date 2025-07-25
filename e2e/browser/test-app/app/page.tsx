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

"use client";

import {
  login,
  logout,
  handleIncomingRedirect,
  events,
} from "@inrupt/solid-client-authn-browser";
import type { ISessionInfo } from "@inrupt/solid-client-authn-browser";
import {
  TESTID_ERROR_MESSAGE,
  TESTID_LOGIN_BUTTON,
  TESTID_LOGOUT_BUTTON,
  TESTID_OPENID_PROVIDER_INPUT,
  TESTID_SESSION_STATUS,
} from "@inrupt/internal-playwright-testids";
import { useState, useEffect } from "react";
import AccessController from "../components/accessGrants";

// This is the content of the file uploaded manually at SHARED_FILE_IRI.
const DEFAULT_ISSUER = "https://login.inrupt.com/";
const REDIRECT_URL = "http://localhost:3000/";
const APP_NAME = "Access Grants browser-based tests app";
function AccessGrantContainer({
  sessionInfo,
  setErrorMessage,
}: {
  sessionInfo?: ISessionInfo;
  setErrorMessage: (msg: string) => void;
}) {
  if (sessionInfo?.isLoggedIn) {
    return <AccessController setErrorMessage={setErrorMessage} />;
  }
  return <div />;
}

AccessGrantContainer.defaultProps = {
  sessionInfo: undefined,
};

export default function Home() {
  // Kill the app if an error occurs
  events().on("error", (err, errDescription) => {
    throw new Error(`An error happened: ${err}, ${errDescription}`);
  });

  const [sessionInfo, setSessionInfo] = useState<ISessionInfo>();
  const [issuer, setIssuer] = useState<string>(DEFAULT_ISSUER);
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    handleIncomingRedirect()
      .then(setSessionInfo)
      .catch((err) => {
        throw new Error(err);
      });
  }, []);

  const handleLogin = async () => {
    try {
      const currentURL = new URL(window.location.href);
      if (currentURL.searchParams.has("accessGrantUrl")) {
        window.localStorage.setItem(
          "accessGrantUrl",
          // The search param presence has been verified.
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          decodeURIComponent(currentURL.searchParams.get("accessGrantUrl")!),
        );
      }
      // Login will redirect the user away so that they can log in the OIDC issuer,
      // and back to the provided redirect URL (which should be controlled by your app).
      await login({
        redirectUrl: REDIRECT_URL,
        oidcIssuer: issuer,
        clientName: APP_NAME,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await logout();
    setSessionInfo(undefined);
  };

  return (
    <div>
      <h1>
        <code>@inrupt/solid-client-access-grants</code> test browser app
      </h1>
      <p data-testid={TESTID_SESSION_STATUS}>
        {sessionInfo?.isLoggedIn
          ? `Logged in as ${sessionInfo.webId}`
          : "Not logged in yet"}
      </p>
      <form>
        <input
          data-testid={TESTID_OPENID_PROVIDER_INPUT}
          type="text"
          value={issuer}
          onChange={(e) => {
            setIssuer(e.target.value);
          }}
        />
        <button
          type="button"
          data-testid={TESTID_LOGIN_BUTTON}
          onClick={async () => {
            await handleLogin();
          }}
        >
          Log In
        </button>

        <button
          type="button"
          data-testid={TESTID_LOGOUT_BUTTON}
          onClick={async () => {
            await handleLogout();
          }}
        >
          Log Out
        </button>
      </form>
      <p data-testid={TESTID_ERROR_MESSAGE}>
        <strong>{errorMessage}</strong>
      </p>
      <AccessGrantContainer
        sessionInfo={sessionInfo}
        setErrorMessage={setErrorMessage}
      />
    </div>
  );
}
