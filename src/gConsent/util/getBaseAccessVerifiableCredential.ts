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

import type { DatasetWithId } from "@inrupt/solid-client-vc";
import { getId } from "@inrupt/solid-client-vc";
import type { NamedNode } from "@rdfjs/types";
import { DataFactory } from "n3";
import { TYPE, gc } from "../../common/constants";
import type { AccessBaseOptions } from "../type/AccessBaseOptions";
import { getConsent } from "../../common/getters";

const { quad, namedNode } = DataFactory;

export async function getBaseAccess(
  vc: DatasetWithId,
  options: AccessBaseOptions,
  type?: NamedNode,
  hasStatus?: NamedNode,
) {
  if (type && !vc.has(quad(namedNode(getId(vc)), TYPE, type))) {
    throw new Error(
      `An error occurred when type checking the VC: Not of type [${type.value}].`,
    );
  }
  if (hasStatus && !vc.has(quad(getConsent(vc), gc.hasStatus, hasStatus))) {
    throw new Error(
      `An error occurred when type checking the VC: status not [${hasStatus.value}].`,
    );
  }
  return vc;
}
