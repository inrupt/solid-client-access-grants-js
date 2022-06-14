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

export function displayRequestForm() {
  return `<form action="/" , method="post">
    <fieldset>
        <legend>Solid resource access request form</legend>
        <p>
            <label for="resource">Resource URL</label>
            <input type="url" name="resource" id="resource" required>
        </p>
        <p>
            <label for="owner">Resource Owner's WebID</label>
            <input type="url" name="owner" id="owner" required>
        </p>
        <fieldset>
            <legend>Access modes</legend>
            <label>Read</label>
            <input type="checkbox" name="read" onclick="return false;" checked>
        </fieldset>
        <fieldset>
            <legend>Purposes</legend>
            <p>
                <label>Accademic research</label>
                <input type="checkbox" name="purpose" value="https://w3id.org/dpv#AcademicResearch" onclick="return false;" checked>
            </p>
            <p>
                <label>Personel hiring</label>
                <input type="checkbox" name="purpose" value="https://w3id.org/dpv#PersonnelHiring" onclick="return false;" checked>
            </p>
        </fieldset>
        <p>
            <input type="submit" value="Request Access">
        </p>
        <p>Note: purposes are for <a href="https://gdpr-info.eu/issues/consent/">informed consent</a>, here taken from <a href="https://w3c.github.io/dpv/dpv/#vocab-purpose">Purposes defined by the Data Privacy Vocabulary</a>.</p>
    </fieldset>
</form>`;
}
