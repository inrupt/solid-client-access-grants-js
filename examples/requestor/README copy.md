# Access request manager demo

## Install and build

- Run `npm ci` and `npm run build` in the root repository to make sure the library is built.
- Run `npm ci` and `npm run build` in the current directory to build the demo app

## Run

- Create a `.env.local` file based on `.env.local.example`. You'll need a client ID/secret pair
  statically registered at your Solid-OIDC provider of choice.
- Run `node dist/serverSideApp.js`

## Use

- Make sure the `grant-access` demo app runs before using this. Alternatively, you can
  edit the source code in `src/serverSideApp.ts` to use Podbrowser as your access management app.
- Go to `http://localhost:3001`. You'll be prompted for a target resource and its owner's WebID.
  Note that currently, a non-RDF resource IRI is expected (a plain text document for instance).
- Submitting the requested information will redirect you to the access management app. Make
  sure to log in there as the resource owner.
- Once the access request has been approved by the resource owner, the Access Grant is
  sent back to this application. It uses it to fetch the requested resource.
