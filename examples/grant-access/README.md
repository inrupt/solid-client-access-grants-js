# Access request manager demo

## Install and build

- Run `npm ci` and `npm run build` in the root repository to make sure the library is built.
- Run `npm ci` and `npm run build` in the current directory to build the demo app

## Run

- Create a `.env.local` file based on `.env.local.example`. You'll need a client ID/secret pair
  statically registered at your Solid-OIDC provider of choice. For instance, you can
  register a client at [Inrupt's app registration page](https://broker.pod.inrupt.com/registration.html)
- Run `node dist/serverSideApp.js`

## Use

- This shoud run before you initiate the access request with the requestor app.
- When receiving an access request, this displays the VC and allows the user to approve or deny it.
- Once approved or denied, the result is sent back to the requestor.
