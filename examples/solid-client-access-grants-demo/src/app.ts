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

import express from "express";
import { config } from "dotenv-flow";
import { postAccessRequestForm } from "./routes/postAccessRequestForm";
import { getResourceFromAccessGrantUrl } from "./routes/getResourceFromAccessGrantUrl";
import { getEnvironment } from "./utils/getEnvironment";
import {
  ACCESS_GRANT_FETCHER_PATHNAME,
  RESOURCE_FETCHER_PATHNAME,
  RESOURCE_REDIRECT_FETCHER_PATHNAME,
} from "./static/constants";
import { getAccessGrantFromUrl } from "./routes/getAccessGrantFromUrl";
import { getResourceFromRedirectUrl } from "./routes/getResourceFromRedirectUrl";

// Load env
config();
const env = getEnvironment();

// Setup app
const app = express();
// Support parsing application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
app.use(express.static("static"));

// Post the access request form
app.post("/request", postAccessRequestForm);

// Get an issued Access Grant from its URL
app.get(ACCESS_GRANT_FETCHER_PATHNAME, getAccessGrantFromUrl);

// Get resource using an Access Grant URL
app.get(RESOURCE_FETCHER_PATHNAME, getResourceFromAccessGrantUrl);

// Get resource from the redirect URL
app.get(RESOURCE_REDIRECT_FETCHER_PATHNAME, getResourceFromRedirectUrl);

app.listen(env.url.port, async () => {
  /* eslint-disable-next-line no-console */
  console.log(`Running on [${env.url.href}]...`);
});
