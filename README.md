# Solid Access Grants - solid-client-access-grants

`@inrupt/solid-client-access-grants` is a JavaScript library for requesting and managing
access given to an agent for a resource. These access grants are signed by a
Solid Pod owner's private key, which itself is managed by the Solid Pod server.

`@inrupt/solid-client-access-grants` is part of a family open source JavaScript
libraries designed to support developers building Solid applications.

# Server support

This experimental feature is currently only available in ESS.

# Browser support

Our JavaScript Client Libraries use relatively modern JavaScript features that
will work in all commonly-used browsers, except Internet Explorer. If you need
support for Internet Explorer, it is recommended to pass them through a tool
like [Babel](https://babeljs.io), and to add polyfills for e.g. `Map`, `Set`,
`Promise`, `Headers`, `Array.prototype.includes`, `Object.entries` and
`String.prototype.endsWith`.

# Node support

Our JavaScript Client Libraries track Node.js LTS releases, and support 12.x,
14.x, and 16.x.

# Installation

For the latest stable version of solid-client-access-grants:

```bash
npm install @inrupt/solid-client-access-grants
```

# Overview

This is a non-exhaustive list of features exposed by this library.

## Requesting access

This function will be used by an agent who wishes to acquire access to access
data on another agent's Solid Pod. To request access, a number of details are
required:

- The resource being requested;
- The WebID of the owner of the resource;
- The expiration date for the access grant;
- The purpose the access is being requested;
- The WebID of the agent requesting the access grant;
- Finally, the container URL that a access grant receipt should be written to.

```typescript
await createConsentGrantRequest({
  resource: "https://pod.inrupt.com/some-username/some-resource",
  resourceOwnerWebId: "https://pod.inrupt.com/some-username/profile/card#me",
  expiryDate: new Date("2022-05-03"),
  purpose: "For job applications to MyCompany, Inc.",
  requestingAgentWebId: "https://pod.inrupt.com/my-username/profile/card#me",
  responseContainerUrl: "https://pod.inrupt.com/my-username/consent-receipts/",
});
```

## Approving access requests

This function will be used by the end-user to approve access to their data to
another agent. It takes the original access request (saved as a Dataset to their
Pod as a LDN), or the access grant information can be manually passed in.

Optionally as a second parameter, the owner of the resource may apply permissions
directly to the resource for the requesting agent.

```typescript
const consentRequest = await fetchSolidDataset(
  "https://pod.inrupt.com/some-username/inbox/ldn-dataset-resource-url"
);

await approveConsentGrant(consentRequest, {
  access: { read: true },
});

// or

await approveConsentGrant(
  {
    resourceOwnerWebId: "https://pod.inrupt.com/some-username/profile/card#me",
    resourceUrl: "https://pod.inrupt.com/some-username/some-resource",
    purpose: "For job applications to MyCompany, Inc.",
    expirationDate: new Date("2022-05-03"),
    requestingAgentWebId: "https://pod.inrupt.com/my-username/profile/card#me",
  },
  {
    access: { read: true },
  }
);
```

## Rejecting an access request

This function will be used by the end-user to reject access to their data to
another agent. This deletes the LDN from the end-user's inbox.

```typescript
const consentRequest = await fetchSolidDataset(
  "https://consent.inrupt.com/vc/some-guid-access-grants-id"
);

await rejectConsentGrant(consentRequest);
```

## Fetching all access grants

This function will be used by the end-user to see a list of access grants made
on their behalf. This will be a list of links and metadata - not the grants
themselves. The function can take a "page" parameter as well as a filter, which
can be used to filter for properties such as the resource URL or the requesting
agent. Links to the previous and next page, if they exist, will be returned in
the JSON from the `getAllConsentGrants` call.

```typescript
const consentGrants = await getAllConsentGrants();

// or

const consentGrants = await getAllConsentGrants(nextPage);

/* returns:
{
  nextPage: "https://consent.inrupt.com/vc/some-url"
  prevPage: "https://consent.inrupt.com/vc/some-other-url"
  grants: [
    "https://consent.inrupt.com/vc/some-guid-access-grants-id",
    ...
  ]
*/
```

## Fetching a single access grant

Information about granted access can be read by calling `getConsentGrant()`. It
returns all stored information about the consent grant, such as the purpose,
the expiry date, etc., as well as the signature proof.

```typescript
const consentGrant = getConsentGrant(
  "https://consent.inrupt.com/vc/some-guid-access-grants-id"
);
```

## Revoking access grant

A resource owner may revoke access at any time.

```typescript
await revokeConsentGrant(consentGrantUrl);
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

# Changelog

See [the release notes](https://github.com/inrupt/solid-client-js/blob/main/CHANGELOG.md).

# License

MIT © [Inrupt](https://inrupt.com)
