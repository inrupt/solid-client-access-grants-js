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

export const ACL_RESOURCE_ACCESS_MODE_APPEND =
  "http://www.w3.org/ns/auth/acl#Append";
export const ACL_RESOURCE_ACCESS_MODE_READ =
  "http://www.w3.org/ns/auth/acl#Read";
export const ACL_RESOURCE_ACCESS_MODE_WRITE =
  "http://www.w3.org/ns/auth/acl#Write";

export const ACL_RESOURCE_ACCESS_MODE_APPEND_ABBREV = "Append";
export const ACL_RESOURCE_ACCESS_MODE_READ_ABBREV = "Read";
export const ACL_RESOURCE_ACCESS_MODE_WRITE_ABBREV = "Write";

export const RESOURCE_ACCESS_MODE = new Set([
  ACL_RESOURCE_ACCESS_MODE_APPEND,
  ACL_RESOURCE_ACCESS_MODE_READ,
  ACL_RESOURCE_ACCESS_MODE_WRITE,
  // The following are linked to the previous through our JSON-LD context.
  ACL_RESOURCE_ACCESS_MODE_READ_ABBREV,
  ACL_RESOURCE_ACCESS_MODE_WRITE_ABBREV,
  ACL_RESOURCE_ACCESS_MODE_APPEND_ABBREV,
]);

export type ResourceAccessMode =
  typeof RESOURCE_ACCESS_MODE extends Set<infer T> ? T : never;
