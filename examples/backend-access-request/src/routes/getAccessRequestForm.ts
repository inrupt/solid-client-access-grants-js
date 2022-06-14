import type { Request, Response } from "express";

import { displayRequestForm } from "../views/displayRequestForm";

export async function getAccessRequestForm(req: Request, res: Response): Promise<void> {
    res.send(displayRequestForm());
}