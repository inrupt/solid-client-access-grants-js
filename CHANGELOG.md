# Changelog

This project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## Unreleased

### Other Changes

- Added a more extensive demo app.

## [1.0.2](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v1.0.2) - 2022-06-21

### New features

- `approveAccessRequest`, `getAccessGrant`, `getAccessGrantFromRedirectUrl` now accurately return an `AccessGrant`.
- `getAccessRequestFromRedirectUrl` now accurately return an `AccessRequest`.

### Bugfix

- Fix Node 14 atob/btoa compatibility issue.
- The JSON-LD context of issued VCs was hard-coded, instead of being relative to
the issuer domain as mandated by the [ESS documentation](https://docs.inrupt.com/ess/latest/services/service-vc/#ess-vc-service-endpoints).

## [1.0.1](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v1.0.1) - 2022-06-06

### New features

- `GRANT_VC_URL_PARAM_NAME` is now exported from the base package. This is the name of the parameter
  used in URL redirects to an access grant management application.

The following changes have been implemented but not released yet:

## [1.0.0](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v1.0.0) - 2022-06-06

### Other Changes

- Release major version of package

## [0.6.1](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v0.6.1) - 2022-06-06

### Bugfix

- Export all types via Rollup.
- Fix demo application.

### Breaking change

- Drop Node 12 support.

## [0.6.0](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v0.6.0) - 2022-04-05

### New features

- `getAccessGrantAll` supports a new option, `includeExpired`. By default,
  only grants that are still valid are returned by the VC provider. If set to true,
  grants that have expired will also be included in the response.
- `issueAccessRequest` now generates an access request VC including the resource
  owner in the `hasConsent` field with the `isConsentForDataSubject` predicate. This
  will enable resource owners to dereference access requests IRIs to their resources.

### Bugfix

- When type-checking an Access Grant (e.g. using `getAccessGrant`), only accepted
  Grants were supported. Support for denied Grant has now been added.
- When using an Access Grant to get an Access Token, one of the claims from the
  server response was unaligned with the spec. This inconsistency has been fixed on
  the server-side with backwards-compatibility, and now on the client side too. This
  change is transparent to users.
- `approveAccessRequest` wasn't using the default session from `@inrupt/solid-client-authn-browser`
  to set the ACR access appropriately, resulting in `401 Unauthenticated` errors.
- `getAccessRequestFromRedirectUrl` was deserializing the received VC expecting
  an URL-encoded value, instead of a base64-encoded value, which is how it is serialized
  when redirecting the user to the VC management app.

## [0.5.0](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v0.5.0) - 2022-03-01

### New features

- `redirectToRequestor` has been added to the `./manage` module to help access management
  apps redirect their users to the clients which requested access to a Resource.
- `getAccessRequestFromRedirectUrl`: a function exported by the `./manage` module to
  get the Access Request and requestor redirect URL from the redirect to the Access
  Management App from the requestor.
- `getAccessGrantFromRedirectUrl`: a function exported by the `./request` module to get
  the Access Grant from the redirect to the requestor from the Access Management App.

### Bugfixes

- The JSON-LD context URL has changed from https://vc.inrupt.com/credentials/v1 to https://vc.inrupt.com/credentials/v1.
- `redirectToAccessManagementUi` now returns a promise that never resolves. This
  prevents from `await`ing on it, have it resolve, and start running code in the undeterministic
  time between the moment when `window.location.href` is set (or the redirect callback
  is called) and the moment the redirection actually happens.

### Deprecation

- `approveAccessRequest` and `denyAccessRequest` no longer requires the `resourceOwner` parameter.
- `issueAccessRequest` options no longer include the `requestor` field.

## [0.4.1](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v0.4.1) - 2022-01-28

### Bugfixes

- Some dependencies have been updated to mitigate vulnerabilities.

## [0.4.0](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v0.4.0) - 2021-11-30

### Demo

- Runnable examples are available in `examples/requestor` and `examples/grant-access`.

### Feature change

Rename APIs to remove the connotations that "consent" could imply. All previous
APIs still exist, but are undocumented and deprecated, and will be removed in
the future.

- Deprecate `approveAccessRequestWithConsent` in favour of `approveAccessRequest` (which now supports `purpose`)
- Deprecate `requestAccessWithConsent` in favour of `issueAccessRequest` (which now supports `purpose`)
- Deprecate `RequestAccessWithConsentParameters` in favour of `IssueAccessRequestParameters`
- Rename type `RequestAccessParameters` to `IssueAccessRequestParameters`
- Rename type `ConsentApiBaseOptions` to `AccessBaseOptions`
- Rename `requestAccess` to `issueAccessRequest`
- Rename `isValidConsentGrant` to `isValidAccessGrant`
- Rename `getAccessWithConsent` to `getAccessGrant`
- Rename `getAccessWithConsentAll` to `getAccessGrantAll`
- Rename `revokeAccess` to `revokeAccessGrant`
- Rename `getConsentApiEndpoint` to `getAccessApiEndpoint`
- Rename `getConsentManagementUi` to `getAccessManagementUi`
- Rename `getConsentManagementUiFromWellKnown` to `getAccessManagementUiFromWellKnown`
- Rename `redirectToConsentManagementUi` to `redirectToAccessManagementUi`
- Change `consentEndpoint` property in `ConsentApiBaseOptions`/`AccessBaseOptions` to `accessEndpoint` (backwards compatible)

Other changes:

- Explicitly document the `IssueAccessRequestParameters` type, such that it doesn't end up on the `manage` module documentation.
- Ensure only the exported modules are documented by typedoc, making our documentation clearer to read.
- Fix typo in error message thrown from `getBaseAccessVerifiableCredential`
- Reduce iterations needed for calculating consent guards (minor performance gain)

### New Feature

- `getSolidDataset`, `getFile`, and `saveSolidDatasetAt` have been implemented as
  wrappers around their solid-client function calls. These take an access grant
  and use it to authenticate against a resource. `fetchWithVc` is a generic
  function that uses an access grant and returns a pre-authenticated `fetch`
  method.

### Bugfix

- Approving an Access Request did not update the target resources' ACR, resulting
  in a useless Access Grant.
- Discovering the verification endpoint was relying on incorrect assumptions, and
  failed when calling `isValidConsentGrant`.
- Specifying an inbox when requesting/granting access is no longer mandatory.

## [0.3.2](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v0.3.2) - 2021-10-29

### Bugfix

- Looking up access grants for a given resource was issuing incorrect requests.

## [0.3.1](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v0.3.1) - 2021-10-21

### Bugfix

- The property for access issuer discovery has been aligned with the one used on
  the server side, i.e. `http://www.w3.org/ns/solid/terms#accessIssuer`.
- The discovery for the access issuer no longer relies on the Pod server, but rather
  on the UMA server.

## [0.3.0](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v0.3.0) - 2021-10-15

### Feature change

- `redirectToConsentManagementUi` redirects to the consent management app adding
  the base-64 encoded VC to the IRI as a query parameter named `requestVc`, instead
  of the previous `requestVcUrl` which only contained the VC IRI.

### Bugfix

- Fix and re-enable VC type checking.
- Consent endpoint discovery from `.well-known/solid` now supports both the legacy
  property, and the new `solid:consent` one.
- The credential subject of a grant is now the resource owner, instead of the requestor.
  The requestor is still the credential subject of requests.

## [0.2.1](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v0.2.1) - 2021-10-12

- An [NPM incident](https://status.npmjs.org/incidents/wy4002vc8ryc) made version
  0.2.0 uninstallable, and publishing a new version was necessary to resolve the issue.

## [0.2.0](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v0.2.0) - 2021-10-11

### Bugfix

- The 0.1.0 version had been accidentally released some time ago, creating a conflict.
  This just bumpts the version number to clean this up.

## [0.1.0](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v0.1.0) - 2021-10-11

### Bugfix

- The shape of the consent VC obtained when approving a request wasn't valid as
  per the consent service expectations.
- `getConsentApiEndpoint` had an incorrect assumption about some behaviour of
  `solid-client`, which resulted in throwing an exception, and was fixed in its
  version 1.13.1.

### New feature

- `getAccessWithConsent` looks up an access grant from its IRI, and performs some
  validation on it.
- `getSolidDataset` fetches a dataset from a Solid Pod, using an Acces Grant to
  prove the caller is entitled to access to the target resource.
- `getAccessWithConsentAll` enables retrieving all consent grants issued over a
  specific resource.
- `redirectToConsentManagementUi` enables discovering a user's preferred consent
  management app, and redirecting them to it.

## [0.0.3](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v0.0.3) - 2021-10-01

### Bugfix

- Use complete IRIs as values for VC properties instead of shorthand that are not
  expanded, and therefore fail shape validation of the consent service.
- Fixes node imports as well as webpack, rollup and parcel builds

## [0.0.2](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v0.0.2) - 2021-09-30

### Bugfix

- Fixed missing dependencies which failed the build using bundlers such as Webpack or Parcel.

## [0.0.1](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v0.0.1) - 2021-09-29

### New features

- `requestAccess` and `requestAccessWithConsent`: As an entity wanting to access
  data under a user's control, create an access request. The access request may
  be associated to an explicit user consent for a given purpose.
- `approveAccessRequest` and `approveAccessRequestWithConsent`: As a person controlling
  some data, grant access to an entity to this data, potentially with your explicit
  consent for a given purpose.
- `cancelAccessRequest`: Cancel a pending access request.
- `denyAccessRequest`: As a person controlling some data, deny access to an entity
  to this data.
- `getConsentApiEndpoint`: Discover the URL where access requests may be created for
  a given resource.
- `getConsentManagementUi`: Discover the URL of a consent app where a user prefers
  to be redirected when prompted for consent.
- `isValidConsentGrant`: Verify if a consent grant is valid (correct signature, issuer key match...).
  The verification is done at a remote endpoint, and not client-side.
- `revokeAccess`: Revoke a consent grant.
