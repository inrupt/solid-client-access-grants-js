/**
 * Copyright 2022 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { spawn } from "child_process";
import { resolve } from "path";

async function globalSetup() {
  const childProcess = spawn("npm", ["run", "dev", "--", "-p", "1234"], {
    cwd: resolve(__dirname, "../src"),
    shell: true,
  });
  const devServerOutput = childProcess.stdout;

  console.debug("Spawned process ", childProcess.pid);

  await new Promise((resolve) => {
    const chunks = [];
    devServerOutput.on("data", (data) => {
      chunks.push(data);
      const dataSoFar = Buffer.concat(chunks).toString("utf8");
      // Wait until NextJS is satisfied with the dev server.
      if (dataSoFar.indexOf("compiled client and server successfully") !== -1) {
        resolve(undefined);
      }
    });
  });

  // Return the teardown function.
  return () => {
    console.debug("Killing child process");
    childProcess.kill("SIGINT");
  };
}
export default globalSetup;
