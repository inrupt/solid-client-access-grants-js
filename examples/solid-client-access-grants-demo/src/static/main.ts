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

/* eslint-disable camelcase, import/no-unresolved */
import { GRANT_VC_URL_PARAM_NAME } from "@inrupt/solid-client-access-grants";
import {
  ACCESS_GRANT_FETCHER_PATHNAME,
  RESOURCE_FETCHER_PATHNAME,
} from "./constants.js";

const accessGrantParam = GRANT_VC_URL_PARAM_NAME;

const accessGrantUrl =
  new URLSearchParams(document.location.search).get(accessGrantParam) ?? "";

// Construct the backend resource fetch URL
const accessGrantFetcherUrl = new URL(
  ACCESS_GRANT_FETCHER_PATHNAME,
  document.location.href,
);
accessGrantFetcherUrl.searchParams.append(accessGrantParam, accessGrantUrl);

// Display the issued Access Grant in an iframe
const access_grant_object_url = URL.createObjectURL(
  await (await fetch(accessGrantFetcherUrl)).blob(),
);

document
  .getElementById("access-grant-viewer")
  ?.setAttribute("src", access_grant_object_url);

URL.revokeObjectURL(access_grant_object_url);

// Construct the backend resource fetch URL
const resourceFetcherUrl = new URL(
  RESOURCE_FETCHER_PATHNAME,
  document.location.href,
);

resourceFetcherUrl.searchParams.append(accessGrantParam, accessGrantUrl);

// Display the fetched resource in an iframe
const resource_object_url = URL.createObjectURL(
  await (await fetch(resourceFetcherUrl)).blob(),
);

document
  .getElementById("resource-viewer")
  ?.setAttribute("src", resource_object_url);

URL.revokeObjectURL(resource_object_url);
