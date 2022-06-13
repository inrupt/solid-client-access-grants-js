import { issueAccessRequest, redirectToAccessManagementUi } from "@inrupt/solid-client-access-grants";
import { Session } from "@inrupt/solid-client-authn-node";
import type { Request, Response } from "express";
import { getConfig } from "../utils/getConfig";

// Load env variables
const config = getConfig();

export async function postAccessRequestForm(req: Request, res: Response): Promise<void> {
    const session = new Session();
    await session.login({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      oidcIssuer: config.oidcIssuer.href,
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
      new URL("/redirect", config.url.href).href,
      {
        redirectCallback: (url) => {
          res.redirect(url);
        },
        fallbackAccessManagementUi: config.managementApp.href,
        fetch: session.fetch as typeof fetch,
      }
    );
}