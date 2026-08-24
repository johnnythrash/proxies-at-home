import fs from "fs";
import { Router, type Request, type Response } from "express";
import { getPalworldImagePath, lookupPalworldCard } from "../services/palworldCardService.js";

const palworldRouter = Router();

palworldRouter.get("/search", (req: Request, res: Response) => {
  try {
    const name = typeof req.query.name === "string" ? req.query.name.trim() : "";
    if (!name) {
      res.json({ data: [] });
      return;
    }
    const card = lookupPalworldCard({ name });
    res.json({ data: card ? [card] : [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Palworld catalog unavailable";
    res.status(503).json({ error: message });
  }
});

palworldRouter.get("/images/:identifier", (req: Request, res: Response) => {
  try {
    const imagePath = getPalworldImagePath(req.params.identifier);
    if (!imagePath || !fs.existsSync(imagePath)) {
      res.status(404).json({ error: "Palworld card image not found" });
      return;
    }

    res.setHeader("Cache-Control", "public, max-age=86400");
    res.sendFile(imagePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Palworld card image unavailable";
    res.status(503).json({ error: message });
  }
});

export { palworldRouter };
