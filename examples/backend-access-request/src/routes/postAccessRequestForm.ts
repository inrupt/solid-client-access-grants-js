import type { Request, Response } from "express";

import { issueAccessRequest, redirectToAccessManagementUi } from "@inrupt/solid-client-access-grants";
import { Session } from "@inrupt/solid-client-authn-node";
import { getEnvironment } from "../utils/getEnvironment";

export async function postAccessRequestForm(req: Request, res: Response): Promise<void> {
  const env = getEnvironment();
  const session = new Session();
  await session.login({
    clientId: env.clientId,
    clientSecret: env.clientSecret,
    oidcIssuer: env.oidcIssuer.href,
  });

  const accessRequest = await issueAccessRequest(
    {
      access: {
        read: !!req.body.read,
      },
      purpose: req.body.purpose,
      resourceOwner: req.body.owner,
      resources: [req.body.resource],
    },
    {
      fetch: session.fetch as typeof fetch,
      accessEndpoint: "https://vc.inrupt.com",
    }
  );

  await redirectToAccessManagementUi(
    accessRequest.id,
    new URL("/redirect", env.url.href).href,
    {
      redirectCallback: (url) => {
        res.redirect(url);
      },
      fallbackAccessManagementUi: env.managementApp.href,
      fetch: session.fetch as typeof fetch,
    }
  );
}