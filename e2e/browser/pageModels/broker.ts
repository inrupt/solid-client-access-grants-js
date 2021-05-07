/**
 * Copyright 2020 Inrupt Inc.
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

import { t, Selector } from "testcafe";
import { screen } from "@testing-library/testcafe";

export class BrokerPage {
  accessOpenIdCheckbox: Selector;
  accessOfflineCheckbox: Selector;
  accessWebIdCheckbox: Selector;
  rememberForeverRadioButton: Selector;
  rememberOneHourRadioButton: Selector;
  rememberNotRadioButton: Selector;
  authoriseButton: Selector;
  denyButton: Selector;

  constructor() {
    this.accessOpenIdCheckbox = screen.getByLabelText(
      "log in using your identity"
    );
    this.accessOfflineCheckbox = screen.getByLabelText("offline access");
    this.accessWebIdCheckbox = screen.getByLabelText("solid webid");
    this.rememberForeverRadioButton = screen.getByLabelText(
      "remember this decision until I revoke it"
    );
    this.rememberOneHourRadioButton = screen.getByLabelText(
      "remember this decision for one hour"
    );
    this.rememberNotRadioButton = screen.getByLabelText(
      "prompt me again next time"
    );
    this.authoriseButton = screen.getByText("Authorize");
    this.denyButton = screen.getByText("Deny");
  }

  async authoriseOnce() {
    await onAuthorisePage();
    await t.click(this.rememberNotRadioButton).click(this.authoriseButton);
  }
}

export async function onAuthorisePage() {
  await t.expect(Selector("form[name=confirmationForm]").exists).ok();
}
