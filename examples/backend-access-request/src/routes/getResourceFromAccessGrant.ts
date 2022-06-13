import type { Request, Response } from "express";

import { Session } from "@inrupt/solid-client-authn-node";
import { getConfig } from "../utils/getConfig";
import { getAccessGrantFromRedirectUrl, getFile } from "@inrupt/solid-client-access-grants";
import { displayGrantedAccess } from "../views/displayGrantedAccess";

// Load env variables
const config = getConfig();

export async function getResourceFromAccessGrant(req: Request, res: Response): Promise<void> {
    const session = new Session();
    await session.login({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      oidcIssuer: config.oidcIssuer.href,
      // Note that using a Bearer token is mandatory for the UMA access token to be valid.
      tokenType: "Bearer",
    });
  
    const accessGrant = await getAccessGrantFromRedirectUrl(
      new URL(req.url, config.url.href).toString(),
      {
        fetch: session.fetch as typeof fetch,
      }
    );
  
    const targetResource = (
      accessGrant.credentialSubject.providedConsent as {
        forPersonalData: Array<string>;
      }
    ).forPersonalData[0];
  
    const file = await getFile(targetResource, accessGrant, {
      fetch: session.fetch as typeof fetch,
    });
  
    const fileContent = await file.text();
  
    res.send(displayGrantedAccess(accessGrant, fileContent));
}