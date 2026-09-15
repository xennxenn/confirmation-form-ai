import type { Request, Response } from "express";
import app from "../server";

export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    const urlObj = new URL(req.url || "/", "http://localhost");
    const routeParam = urlObj.searchParams.get("__route") || (req.query as any)?.__route;

    if (routeParam && typeof routeParam === "string") {
      const cleanParam = routeParam.replace(/^\/+/, "");
      urlObj.searchParams.delete("__route");
      const search = urlObj.searchParams.toString();
      req.url = `/api/${cleanParam}${search ? `?${search}` : ""}`;
    } else {
      const routeMatches = (req.headers["x-now-route-matches"] || "") as string;
      const m = routeMatches.match(/(?:^|&)1=([^&]+)/);
      if (m && m[1]) {
        const captured = decodeURIComponent(m[1]).replace(/^\/+/, "");
        const search = urlObj.searchParams.toString();
        req.url = `/api/${captured}${search ? `?${search}` : ""}`;
      }
    }

    if (req.url && !req.url.startsWith("/api")) {
      req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
    }
  } catch (e) {
    console.warn("Vercel handler URL normalization warning:", e);
  }

  return new Promise<void>((resolve) => {
    let resolved = false;
    const finish = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };
    res.on("finish", finish);
    res.on("close", finish);

    try {
      app(req, res);
    } catch (handlerErr: any) {
      console.error("Vercel Express invocation error:", handlerErr);
      if (!res.headersSent) {
        res.status(500).json({
          error: "INTERNAL_SERVER_ERROR",
          message: handlerErr?.message || "เกิดข้อผิดพลาดในการประมวลผลบนเซิร์ฟเวอร์",
        });
      }
      finish();
    }
  });
}
