// Verify that imports from the main export work:
import { issueAccessRequest as mainModuleFn } from "@inrupt/solid-client-access-grants";
// Verify that submodule imports work:
import { issueAccessRequest } from "@inrupt/solid-client-access-grants/request";

console.log(typeof mainModuleFn);
console.log(typeof issueAccessRequest);
