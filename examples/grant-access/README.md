# Access request flow demo

## Install and build

- Run `npm ci` and `npm run build` in the current directory to build the demo app.
- (Optional, requires node16+) Run the app using the local repository's code:
  - run `npm ci` and `npm run build` in the root repository to make sure the library is built,
  - run `npm ci` and `npm run build:local` in the current directory to build the demo app.


## Run the two services

- Create a `.env.local` file based on `.env.local.example`. You'll need two client ID/secret pair
  statically registered at your Solid-OIDC provider of choice: one for the resource
  owner, and one for the requestor. For instance, you can register clients at
  [Inrupt's app registration page](https://broker.pod.inrupt.com/registration.html).
- Run `npm start`
- (Optional) Run the services separately:
  - `node dist/request-access.js`
  - `node dist/grant-access.js`
- (Optional) Alternatively, you can use Podbrowser as an access management app. In that case,
  make sure to edit `src/request-access.ts` appropriately.


## Go through the access request flow

- Go to the requestor service, running on `http://localhost:3001` by default. You'll
  be prompted for a target resource and its owner's WebID. Note that currently,
  a non-RDF resource IRI is expected (a plain text document for instance).
- Submitting the requested information will redirect you to the access management service,
  running on `http://localhost:3002` by default. Make sure to authenticate there as the
  resource owner.
- On the access management service, the access request is displayed. You can approve
  or deny it.
- Once the access request has been approved or denied by the resource owner, the
  resulting Access Grant is sent back to the requestor service. It uses the grant
  to fetch the resource it has requested access to.
