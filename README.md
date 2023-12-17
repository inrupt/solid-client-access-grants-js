# Solid Access Grants - solid-client-access-grants

[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](CODE-OF-CONDUCT.md)

This project adheres to the Contributor Covenant [code of conduct](CODE-OF-CONDUCT.md).
By participating, you are expected to uphold this code. Please report unacceptable
behavior to [engineering@inrupt.com](mailto:engineering@inrupt.com).

`@inrupt/solid-client-access-grants` is a JavaScript library for requesting
and managing access given to an agent for a resource. These access grants are
represented by Verifiable Credentials, signed by an Issuer associated to the Pod
server where the resources are hosted.

It is part of a [family open source JavaScript
libraries](https://docs.inrupt.com/developer-tools/javascript/client-libraries/)
designed to support developers building Solid applications.

# Server support

This experimental feature is currently only available in ESS.

# Supported environments

Our JavaScript Client Libraries use relatively modern JavaScript, aligned with
the [ES2018](https://262.ecma-international.org/9.0/) Specification features, we
ship both [ESM](https://nodejs.org/docs/latest-v16.x/api/esm.html) and
[CommonJS](https://nodejs.org/docs/latest-v16.x/api/modules.html), with type
definitions for TypeScript alongside.

This means that out of the box, we only support environments (browsers or
runtimes) that were released after mid-2018, if you wish to target other (older)
environments, then you will need to cross-compile our SDKs via the use of
[Babel](https://babeljs.io), [webpack](https://webpack.js.org/),
[SWC](https://swc.rs/), or similar.

If you need support for Internet Explorer, it is recommended to pass them
through a tool like [Babel](https://babeljs.io), and to add polyfills for e.g.
`Map`, `Set`, `Promise`, `Headers`, `Array.prototype.includes`, `Object.entries`
and `String.prototype.endsWith`.

## Node.js Support

Our JavaScript Client Libraries track Node.js [LTS
releases](https://nodejs.org/en/about/releases/), and support 18.x and 20.x.

# Installation

For the latest stable version of solid-client-access-grants:

```bash
npm install @inrupt/solid-client-access-grants
```

# Issues & Help

## Solid Community Forum

If you have questions about working with Solid or just want to share what you’re
working on, visit the [Solid forum](https://forum.solidproject.org/). The Solid
forum is a good place to meet the rest of the community.

## Bugs and Feature Requests

- For public feedback, bug reports, and feature requests please file an issue
  via [GitHub](https://github.com/inrupt/solid-client-access-grants-js/issues/).
- For non-public feedback or support inquiries please use the
  [Inrupt Service Desk](https://inrupt.atlassian.net/servicedesk).

## Documentation

- [Inrupt Solid Javascript Client Libraries](https://docs.inrupt.com/developer-tools/javascript/client-libraries/)
- [Homepage](https://docs.inrupt.com/)
- [Examples](./examples)
- [Security policy and vulnerability reporting](./SECURITY.md)

# Changelog

See [the release notes](https://github.com/inrupt/solid-client-js/blob/main/CHANGELOG.md).

# License

MIT © [Inrupt](https://inrupt.com)
