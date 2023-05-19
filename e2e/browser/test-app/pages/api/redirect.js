import { Access } from "rdf-namespaces/dist/acl";

const { Session } = require("@inrupt/solid-client-authn-node");

const { issueAccessRequest } = require("@inrupt/solid-client-access-grants");
const expirationDate = new Date(Date.now() + 180 * 6000);
const session = new Session();
const loginServerSide = async () => {
  await session.login({
    clientId: process.env.E2E_TEST_REQUESTOR_CLIENT_ID,
    clientSecret: process.env.E2E_TEST_REQUESTOR_CLIENT_SECRET,
    oidcIssuer: process.env.E2E_TEST_IDP,
  });
};

export default async function handler(req, res) {
  const session = new Session();
  await session.login({
    clientId: process.env.E2E_TEST_REQUESTOR_CLIENT_ID,
    clientSecret: process.env.E2E_TEST_REQUESTOR_CLIENT_SECRET,
    oidcIssuer: process.env.E2E_TEST_IDP,
    // Note that using a Bearer token is mandatory for the UMA access token to be valid.
    tokenType: "Bearer",
  });

  const accessGrant = await getAccessGrantFromRedirectUrl(
    new URL(req.url, config.request.href).toString(),
    {
      fetch: session.fetch,
    }
  );
  const targetResource =
    accessGrant.credentialSubject.providedConsent.forPersonalData[0];
  const file = await getFile(targetResource, accessGrant, {
    fetch: session.fetch,
  });
  const fileContent = await file.text();

  res.render("granted", { accessGrant, fileContent });
}
