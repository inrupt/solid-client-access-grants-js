// Verify that imports from the main export work:
import { requestAccess as mainModuleFn } from "@inrupt/solid-client-access-grants";
// Verify that submodule imports work:
import { requestAccess } from "@inrupt/solid-client-access-grants/request";

console.log(typeof mainModuleFn);
console.log(typeof requestAccess);
