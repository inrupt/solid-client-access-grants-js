# Changelog

This project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Deprecation notice]

The following changes are pending, and will be applied on the next major release:

- The `getAccessGrantAll` function is deprecated. It can be replaced with `query`.
  Although the two functions' behavior is different, they can be used to achieve
  similar results.
- The `gConsent` and all of `gConsent/*` submodules are deprecated. The former can
  be replaced by a regular import of the library, and the latter can be replaced
  with the equivalent non-gConsent submodules (e.g. `gConsent/manage` can be replaced
  with `manage`). There is no functionality change between the two.

## Unreleased

### Patch changes

- When issuing an Access Grant from an Access Request using `approveAccessRequest`,
  the resulting Access Request now references the source Access Request. A new
  `getRequest` getter has been added to get this value from an Access Grant.
  This will result in the `query` module no longer showing approved Access Requests
  as "Pending".
- The `query` function now supports the `type` filter not being set, which will result
  in both Access Grants and Access Requests matching the provided filters being returned.

## [3.2.1](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v3.2.1) - 2025-01-13

### New feature

- Passes the v2 of the JSON-LD context for Access Grants when issuing and using the
  `/derive` endpoint for VC providers supporting it. This allows the server to return
  all Access Credentials understood by the client, both v1 and v2. Clients prior to
  this version will issue and retrieve Access Credentials with a v1 context (and will
  not be able to use features introduced in v2).

### Bugfix

- Type declarations have been altered so that internal type declarations are no longer
  partially exposed in the type declaration files. This prevents issues with some
  frameworks, such as Angular, in particular with `revokeAccessCredential` being internal.

## [3.2.0](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v3.2.0) - 2024-12-23

### New feature

- Add support for custom fields. Applications are now able to read and write custom fields
  into Access Credentials (both Access Requests and Access Grants). This feature is available
  via a new option introduced in `issueAccessRequest` and `approveAccessRequest` to write the
  custom fields, and via a set of dedicated getters in the `getters/` module. A generic getter
  is introduced, `getCustomFields`, as well as a set of typed helpers, such as `getCustomInteger`.
  Typed helpers are available for integers, floats, strings and booleans.
- Support new query endpoint: the new `query` function enables querying for Access Credentials using
  the newly introduced ESS endpoint.

## [3.1.1](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v3.1.1) - 2024-10-23

### Patch change

- Added support for the `https://schema.inrupt.com/credentials/v2.jsonld` JSON-LD context.

## [3.1.0](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v3.1.0) - 2024-09-16

### New Feature

- Node 22 is now supported

### Bugfix

- The `/resources` module function have their signature now aligned with the underlying `@inrupt/solid-client` functions.
  Namely, the `options` parameter for `saveSolidDatasetAt` and `getSolidDataset` support additional entries that were
  already available in `@inrupt/solid-client`.

## [3.0.5](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v3.0.5) - 2024-07-31

### Bugfixes

- Removed base64url dependency due to potential issues with the browser environment.
- A descriptive error is now thrown when trying to create an access request/approve an access grant for no resources. Note that previously, such call may not have thrown, but it resulted in an Access Grant granting access to nothing, which would have caused confusion when trying to use it.
- The error thrown when the issuer endpoint for an access grant/request cannot be computed is more comprehensive.

## [3.0.4](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v3.0.4) - 2024-02-12

### Bugfixes

- Extend predicate supported by `getRequestor`: `getRequestor` now supports the `gc:isProvidedToPerson` and `gc:isProvidedToController`
  predicates in addition to the current `gc:isProvidedTo` predicate.

## [3.0.3](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v3.0.3) - 2024-02-06

### Bugfix

- Internal function `getConsent` is no longer part of the exports, which was causing TS to not build in some setups.

## [3.0.2](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v3.0.2) - 2024-01-22

### Bugfix

- `getAccessGrantAll` no longer includes duplicates in the result set when using a container
  filtering by resource.

## [3.0.1](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v3.0.1) - 2024-01-10

### Bugfix

- `getAccessGrantAll` incorrectly excluded non-recursive grants if not filtering on target resource.

## [3.0.0](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v3.0.0) - 2023-12-22

### Breaking Changes

- **Parsing Access Grants and Access Requests as RDF from JSON-LD**: This allows the Access Grants
  and Access Requests to be read using the RDF/JS DatasetCore API. This is a breaking change,
  because their type also now extends the `DatasetCore` type. Importantly, this dataset is not
  preserved when converting a Verifiable Credential to a string and back doing
  `JSON.parse(JSON.stringify(verifiableCredential))`. We reccomend that developers set
  `returnLegacyJsonld` to `false` in functions such as `getAccessGrant` in order to avoid
  returning deprecated object properties. Instead developers should make use of the exported
  `getter` functions to get these attributes.
- **Node 16 is no longer supported**: The global `fetch` function is now used instead of
  `@inrupt/universal-fetch`. This means this library now only works with Node 18 and higher.
- **Deprecated signatures removed**:
  - `denyAccessRequest` no longer supports the `resourceOwner` argument, it must be removed.
  - `approveAccessRequest` no longer supports the `resourceOwner` argument, it must be removed.
  - `getAccessGrantAll` no longer supports the `resource` argument, which should be merged into
    the `params` argument along the other `AccessParameter`.

## [2.6.2](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v2.6.2) - 2023-11-16

### Removed features (non-breaking)

- Support for `odrl` access grants has been removed. The ODRL data model was in as an experimental feature,
  and wasn't deployed in any supported Access Grant issuers. Removing it will not break apps using the currently
  supported gConsent-based Access Grants.

### Bugfixes

- Denied Access Grant expiration date: When denying an access grant based on an access request, the exipration
  date of the access request wasn't being picked up as the expiration date for the denied grant.

## [2.6.1](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v2.6.1) - 2023-09-25

### Bugfixes

- `denyAccessRequest` didn't normalize the returned denied Access Grant, resulting in it having a
  JSON-LD frame different from the value returned by `approveAccessRequest`. The value is now normalized,
  and both functions return a similarly shaped object. This also fixes the return type of `denyAccessRequest`,
  which now returns the more strict `AccessGrant` type rather than the `VerifiableCredential` type.
- add `types` entry in the package.json exports so that bundlers such as esbuild can discover type definitions.

## [2.6.0](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v2.6.0) - 2023-09-18

### New feature

- Export `getAccessGrantAll` has a new `status` parameter which allows selection of `granted`, `denied` or `all` access grants.
  By default only `granted` access grants are returned as this is the existing behavior. In the next major version of this
  library the default will be to return `all` access grants.

## [2.5.0](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v2.5.0) - 2023-08-11

### New feature

- Export `CredentialIsAccessGrantAny` which checks if a `VerifiableCredential` is an `AccessGrantAny`.

## [2.4.0](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v2.4.0) - 2023-07-24

### New feature

- `deleteSolidDataset` and `deleteFile`: Add functions to the `resource` module
  to delete resources, following the interface of `@inrupt/solid-client`.
- `getAccessRequest`: a function exported by the `./manage` module to
  get the Access Request from the Access Request URL.

## [2.3.2](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v2.3.2) - 2023-06-05

### Deprecation notice

- `resource` marked as deprecated for `getAccessGrantAll`. It can be optionally passed along with `params`.

## [2.3.1](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v2.3.1) - 2023-05-24

### Documentation

- Buffer API marked as deprecated for `saveFileInContainer` and `overwriteFileInContainer`.

### Bugfixes

- Denied Access Grants now preserve the purpose set in the original Access Request.

## [2.3.0](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v2.3.0) - 2023-05-09

### New feature

- Node 20 support

## [2.2.0](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v2.2.0) - 2023-04-14

### New feature

- Node 18 support

## [2.1.2](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v2.1.2) - 2023-02-06

### Bugfixes

- The JSON-LD/JSON normalization is now applied not only when issuing an Access Request
  or an Access Grant, but also when dereferencing one.

## [2.1.1](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v2.1.1) - 2023-02-01

### Bugfixes

- JSON-LD/JSON alignment: We are processing Verifiable Credentials as plain JSON,
  while they actually are JSON-LD. This creates some discrepancies:

  - The Access Grants and Access Requests status is now accepted in its abbreviated
    form, and not only as a fully qualified IRI, as allowed by the JSON-LD context.
  - Arrays containing a single value are also accepted as a literal equal to said
    single value.

  This is a stopgap solution: a proper fix would be to do full JSON-LD parsing,
  but we aren't doing it for the moment because of issues between existing libraries
  and our build setup.

## [2.1.0](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v2.1.0) - 2023-01-06

### New Features

- Added the `createContainerInContainer` method.
- Added `saveSolidDatasetInContainer` method.
- Added the `updateAcr` flag to the options that can be included when calling
  the `approveAccessRequest` method. `updateAcr` will default to `true`. Note that
  this is an advanced feature, and only users having a good understanding of the
  relationship between Access Grants and ACRs should deviate from the default.
  Additional information is available in [the ESS documentation](https://docs.inrupt.com/ess/latest/security/access-requests-grants/#acp)
- Added the `inherit` flag to `issueAccessRequest` and `approveAccessRequest` to
  allow controlling whether the issued Access Grant should apply recursively to
  the target containers' contained resources.
- The `getAccessGrantAll` method now allows discovering recursive Access Grants
  issued for an ancestor container.

### Minor changes

- The `getters` module contains functions and a class to interact with Verifiable
  Credentials without having to hard-code the data model in your application.

## [2.0.0](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v2.0.0) - 2022-11-03

### Breaking change

- `getAccessRequestFromRedirectUrl` and `getAccessGrantFromRedirectUrl` no longer
  pick up VC passed by value, and only support passing by IRI. This is for security
  reasons, as passing a VC by value in the IRI leaks information. This removes a
  behavior that has been deprecated in v0.5.0. This change doesn't affect you if
  you are using the query parameters accessors (`getAccessRequestFromRedirectUrl`
  and `getAccessGrantFromRedirectUrl`).

### New features

- The `getters` module functions now support ODRL Access Grants.
- `AccessGrantOdrl`, `AccessGrantGConsent` and `AccessGrantAny` types: Both the
  ODRL-based and the GConsent-based Access Grants now have an explicit associated
  type. Functions that support both data model may use the `AccessGrantAllAny` union
  type.
- `gConsent` and `odrl` API objects: in order to support a new schema for Access
  Grants, new functions will be added to the API. They will not be compatible with
  the current data model, so the new API will be exported via the `odrl` object
  for backwards compatibility. After the current API is deprecated, the default
  exports will point to `odrl`.
- `getAccessRequestFromRedirectUrl` and `getAccessGrantFromRedirectUrl` now accept URL
  objects as well as plain strings.
- `approveAccessRequest` now accepts a `null` expiration date override, resulting
  in the expiration date from the Access Request not being applied to the Access Grant.

## [1.1.0](https://github.com/inrupt/solid-client-access-grants-js/releases/tag/v1.1.0) - 2022-09-02

### New Features

- Added resource APIs for `overwriteFile` and `saveFileInContainer`, these
  compliment the existing `getFile` method.

### Other Changes

- Refactored resource APIs (`getFile`, `getSolidDataset`, `saveSolidDatasetAt`)
  and added end-to-end test coverage of these APIs.
- Improved jest setup for node & browser unit tests.
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
