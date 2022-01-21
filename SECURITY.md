# Security policy

This library intends supporting the development of Solid applications requesting
and granted access to data stored on Solid servers. Granting access to data on a
Solid server will result in the recipient of the grant getting some level of access
to potentially private resources, and should be done with care.

This library only implements the client-side logic of requesting and granting access
to resources. To work, these flows need to be supported by server-side components
which are out of the scope of the current library.

For a better separation of concerns, this library does not deal directly with
authentication. In order to make authenticated requests, one should inject a `fetch`
function compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters)
dealing with authentication. This may be done using Inrupt's authentication libraries
[for Node](https://www.npmjs.com/package/@inrupt/solid-client-authn-node) or [for
the browser](https://www.npmjs.com/package/@inrupt/solid-client-authn-browser).
The security policy for these libraries is available in the associated [GitHub repository](https://github.com/inrupt/solid-client-authn-js/blob/main/SECURITY.md).

# Reporting a vulnerability

If you discover a vulnerability in our code, or experience a bug related to security,
please report it following the instructions provided on [Inrupt’s security page](https://inrupt.com/security/).
