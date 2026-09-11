import type { Request, Response } from "express";
import app from "../server";

export default function handler(req: Request, res: Response) {
  try {
    const urlObj = new URL(req.url || "/", "http://localhost");
    const routeParam = urlObj.searchParams.get("__route");

    if (routeParam) {
      const cleanParam = routeParam.replace(/^\/+/, "");
      req.url = `/api/${cleanParam}`;
    } else {
      const routeMatches = (req.headers["x-now-route-matches"] || "") as string;
      const m = routeMatches.match(/(?:^|&)1=([^&]+)/);
      if (m && m[1]) {
        const captured = decodeURIComponent(m[1]).replace(/^\/+/, "");
        req.url = `/api/${captured}`;
      }
    }

    if (req.url && !req.url.startsWith("/api")) {
      req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
    }
  } catch (e) {
    console.warn("Vercel handler URL normalization warning:", e);
  }

  return app(req, res);
}
