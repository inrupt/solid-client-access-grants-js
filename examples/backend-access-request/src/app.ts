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

import express from "express";
import { getConfig } from "./utils/getConfig";
import { getAccessRequestForm } from "./routes/getAccessRequestForm";
import { postAccessRequestForm } from "./routes/postAccessRequestForm";
import { getResourceFromAccessGrant } from "./routes/getResourceFromAccessGrant";

// Load env variables
const config = getConfig();

// Setup app
const app = express();
// Support parsing application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// Home route: get or post the access request form
app.get("/", getAccessRequestForm);
app.post("/", postAccessRequestForm);

// Redirect: get resource using the issued Access Grant
app.get("/redirect", getResourceFromAccessGrant);

app.listen(config.url.port, async () => {
  /* eslint-disable-next-line no-console */
  console.log(`Running on [${config.url.href}]...`);
});
