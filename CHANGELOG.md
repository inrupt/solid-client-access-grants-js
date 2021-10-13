# Changelog

This project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

The following changes have been implemented but not released yet:

## [Unreleased]

### Bugfix

- Fix and re-enable VC type checking.

The following changes have been released:

## [0.2.1] - 2021-10-12

- An [NPM incident](https://status.npmjs.org/incidents/wy4002vc8ryc) made version
  0.2.0 uninstallable, and publishing a new version was necessary to resolve the issue.

## [0.2.0] - 2021-10-11

### Bugfix

- The 0.1.0 version had been accidentally released some time ago, creating a conflict.
  This just bumpts the version number to clean this up.

## [0.1.0] - 2021-10-11

### Bugfix

- The shape of the consent VC obtained when approving a request wasn't valid as
  per the consent service expectations.
- `getConsentApiEndpoint` had an incorrect assumption about some behaviour of
  `solid-client`, which resulted in throwing an exception, and was fixed in its
  version 1.13.1.

### New feature

- `getAccessWithConsent` looks up an access grant from its IRI, and performs some
  validation on it.
- `getAccessWithConsentAll` enables retrieving all consent grants issued over a
  specific resource.
- `redirectToConsentManagementUi` enables discovering a user's preferred consent
  management app, and redirecting them to it.

## [0.0.3] - 2021-10-01

### Bugfix

- Use complete IRIs as values for VC properties instead of shorthand that are not
  expanded, and therefore fail shape validation of the consent service.
- Fixes node imports as well as webpack, rollup and parcel builds

## [0.0.2] - 2021-09-30

### Bugfix

- Fixed missing dependencies which failed the build using bundlers such as Webpack or Parcel.

## [0.0.1] - 2021-09-29

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
