# Solid Access Requests and Access Grants Demo

## Run the demo app

- Run `npm ci` and `npm run build` in the current directory to build the demo app.
- Create a `.env.local` file based on `.env.local.example`.
- Fill in the required settings following the instructions in `.env.local.example`.
- Start the app `npm start`.

## Run the demo app using the local library

- Instead of `npm run build`, use `npm run build:local` to build the demo app using
  the local `solid-client-access-grant-js` code (instead of the installed dependency
  `@inrupt/solid-client-access-grants`).
- All other steps remain the same as in "[Run the app](#run-the-app)"

## Access flow

Let the application be ACME.
Let the user be Alice.
Let the access management app be PodBrowser).
Let X be a resource Alice owns (it is a resource in Alice's Pod).

1. ACME has a WebID and a set of client credentials.
2. Alice also has a WebID and uses PodBrowser for access management.
3. Alice wants to share access to X with ACME.
4. Alice fills ACME's create Access Request form.
5. The application needs to know:
   - Alice's WebID in order for Alice to have access to ACME's Access Request, and,
   - the URI of the resource Alice intends to share.
6. ACME's server uses its client credentials to obtain a session.
7. ACME's server discovers the VC endpoint via the resource URI.
   - Get the resource
   - Check for the WWW-Authenticate header's UMA challenge
   - Retrieve UMA well known configuration
   - Retrieve the VC issuer service URI from the well known UMA configuration
   - Retrieve the VC service well known configuration (for VC endpoints)
8. ACME uses the VC issuer endpoint to create an Access Request.
9. ACME redirects Alice to PodBrowser with the Access Request URI as parameter.
10. Alice uses PodBrowser to create an Access Grant from ACME's Access Request.
11. PodBrowser redirects Alice to ACME with the Access Grant URI as parameter.
12. ACME uses the Access Grant to access X.
13. ACME displays the Access Grant and X.

Note: PodBrowser is the assumed Access Management app for the sake of simplicity.

## See also

Purposes: https://w3c.github.io/dpv/dpv/#purpose-classes
