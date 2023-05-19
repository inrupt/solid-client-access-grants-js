const { Session } = require("@inrupt/solid-client-authn-node");

const {
  issueAccessRequest,
  redirectToAccessManagementUi,
} = require("@inrupt/solid-client-access-grants");
const expirationDate = new Date(Date.now() + 180 * 6000);

export default async function handler(req, res) {
  const serverSession = new Session();
  console.log("created sessions");
  await serverSession.login({
    clientId: process.env.E2E_TEST_REQUESTOR_CLIENT_ID,
    clientSecret: process.env.E2E_TEST_REQUESTOR_CLIENT_SECRET,
    oidcIssuer: process.env.E2E_TEST_IDP,
  });
  console.log(`owner: ${req.body.owner}`);
  console.log(`requestor: ${serverSession.info.webId}`);
  console.log(`resource: ${req.body.resource}`);

  try {
    const accessRequest = await issueAccessRequest(
      {
        access: { read: true },
        resourceOwner: req.body.owner,
        resources: [req.body.resource],
        purpose: [
          "https://some.purpose/not-a-nefarious-one/i-promise",
          "https://some.other.purpose/",
        ],
        expirationDate,
      },
      {
        fetch: serverSession.fetch,
      }
    );
    console.log(accessRequest);
    res.json({ accessRequest });
  } catch (error) {
    console.log("ERRORRRRRRRRR!!!!!");
    console.log(error);
    res.status(200).send({ result: "sssa" });
  }
}
