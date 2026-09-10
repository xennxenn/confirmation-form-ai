import dotenv from "dotenv";
dotenv.config({ override: true });

import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

// Interface for monthly quota persistence
interface QuotaStore {
  defaultMonthlyLimit: number;
  monthlyLimits: Record<string, number>;
  usage: Record<string, Record<string, number>>; // YYYY-MM -> username -> count
}

const DATA_DIR = process.env.VERCEL ? "/tmp" : path.join(process.cwd(), "data");
const QUOTA_FILE = path.join(DATA_DIR, "ai_quotas.json");

let memoryQuotaStore: QuotaStore = {
  defaultMonthlyLimit: 20,
  monthlyLimits: {},
  usage: {},
};

function getQuotaStore(): QuotaStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(QUOTA_FILE)) {
      const raw = fs.readFileSync(QUOTA_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Could not read quota file, using memory store:", e);
  }
  return memoryQuotaStore;
}

function saveQuotaStore(data: QuotaStore) {
  memoryQuotaStore = data;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(QUOTA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not save quota file, preserved in memory:", e);
  }
}

let currentApiKey: string | null = null;
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("ระบบยังไม่ได้ตั้งค่า GEMINI_API_KEY บน Server กรุณาตั้งค่าใน Environment Variables");
  }
  if (!aiClient || currentApiKey !== apiKey) {
    currentApiKey = apiKey;
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

async function convertImageToBuffer(imageInput: string): Promise<{ data: string; mimeType: string }> {
  if (imageInput.startsWith("data:")) {
    const matches = imageInput.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      return { mimeType: matches[1], data: matches[2] };
    }
  }

  if (imageInput.startsWith("http://") || imageInput.startsWith("https://")) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(imageInput, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const arrayBuffer = await res.arrayBuffer();
      const mimeType = res.headers.get("content-type") || "image/jpeg";
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      return { mimeType, data: base64 };
    } catch (fetchErr: any) {
      clearTimeout(timer);
      throw new Error(`ไม่สามารถโหลดรูปภาพผ่านเครือข่ายได้: ${fetchErr?.message || fetchErr}`);
    }
  }

  // Handle local filesystem paths (e.g. /uploads/... or /assets/...)
  if (imageInput.startsWith("/")) {
    const publicPath = path.join(process.cwd(), "public", imageInput);
    const distPath = path.join(process.cwd(), "dist", imageInput);
    const resolvedPath = fs.existsSync(publicPath) ? publicPath : fs.existsSync(distPath) ? distPath : null;

    if (resolvedPath) {
      const buf = fs.readFileSync(resolvedPath);
      const ext = path.extname(resolvedPath).toLowerCase();
      const mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
      return { mimeType, data: buf.toString("base64") };
    }
  }

  throw new Error("รูปแบบรูปภาพไม่ถูกต้อง ต้องเป็น URL หรือ Base64 data URI");
}

export const app = express();

// Enable CORS for Vercel/external domains
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// Body parser with 50MB limit for image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Create API Router
const apiRouter = express.Router();

// Health check
apiRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", geminiKeyAvailable: !!process.env.GEMINI_API_KEY });
});

// Get quota for a user
apiRouter.get("/ai-quota", (req, res) => {
  try {
    const username = (req.query.username as string) || "anonymous";
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    const store = getQuotaStore();

    const userLimit = store.monthlyLimits[username] ?? store.defaultMonthlyLimit ?? 20;
    const userUsage = store.usage[month]?.[username] ?? 0;

    res.json({
      success: true,
      month,
      username,
      usage: userUsage,
      limit: userLimit,
      defaultLimit: store.defaultMonthlyLimit ?? 20,
      monthlyLimits: store.monthlyLimits,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Set quota limit (Admin action)
apiRouter.post("/ai-quota/limit", (req, res) => {
  try {
    const { username, limit } = req.body;
    if (typeof limit !== "number" || limit < 0) {
      return res.status(400).json({ error: "ค่า limit ต้องเป็นตัวเลขมากกว่าหรือเท่ากับ 0" });
    }

    const store = getQuotaStore();
    if (username === "__default__") {
      store.defaultMonthlyLimit = limit;
    } else if (username) {
      store.monthlyLimits[username] = limit;
    }

    saveQuotaStore(store);
    res.json({
      success: true,
      defaultLimit: store.defaultMonthlyLimit,
      monthlyLimits: store.monthlyLimits,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Generate realistic curtain preview with Gemini
apiRouter.post("/generate-ai-curtain", async (req, res) => {
  try {
    const { image, prompt, username, swatch1, swatch2, aspectRatio } = req.body;

    if (!image) {
      return res.status(400).json({ error: "ไม่พบรูปภาพหน้างานต้นฉบับสำหรับส่งให้ AI" });
    }
    if (!prompt) {
      return res.status(400).json({ error: "ไม่พบคำสั่งระบุสเปกผ้าม่าน (Prompt)" });
    }

    const user = username || "anonymous";
    const month = new Date().toISOString().slice(0, 7);
    const store = getQuotaStore();

    const userLimit = store.monthlyLimits[user] ?? store.defaultMonthlyLimit ?? 20;
    const currentUsage = store.usage[month]?.[user] ?? 0;

    if (currentUsage >= userLimit) {
      return res.status(429).json({
        error: "QUOTA_EXCEEDED",
        message: `คุณใช้โควต้าสร้างรูป AI ประจำเดือน ${month} ครบกำหนดแล้ว (${currentUsage}/${userLimit} ครั้ง) กรุณาติดต่อผู้ดูแลระบบเพื่อขอเพิ่มโควต้า`,
        usage: currentUsage,
        limit: userLimit,
        month,
      });
    }

    // Convert image
    const { data: base64Data, mimeType } = await convertImageToBuffer(image);

    const allowedAspectRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
    const chosenAspectRatio = allowedAspectRatios.includes(aspectRatio) ? aspectRatio : "1:1";
    const generateConfig: any = {
      imageConfig: {
        aspectRatio: chosenAspectRatio,
      },
    };

    const ai = getGenAI();
    const isVenetianRequest = prompt.includes("HORIZONTAL VENETIAN BLINDS") || prompt.includes("มู่ลี่");
    const isRollerRequest = prompt.includes("ROLLER SHADES") || prompt.includes("ม่านม้วน");
    const isRomanRequest = prompt.includes("ROMAN SHADES") || prompt.includes("ม่านพับ");

    const parts: any[] = [
      {
        text: isVenetianRequest
          ? "IMAGE 1 (PRIMARY REAL ROOM PHOTOGRAPH TO INPAINT/EDIT):\nThis is the base room photograph. Inpaint custom HORIZONTAL VENETIAN BLINDS onto the designated window area. DO NOT generate fabric drapery or pinch pleat curtains. Strictly preserve this exact room architecture, window frame dimensions, perspective, and orientation without cropping, shrinking the window, or rotating."
          : isRollerRequest
            ? "IMAGE 1 (PRIMARY REAL ROOM PHOTOGRAPH TO INPAINT/EDIT):\nThis is the base room photograph. Inpaint custom FLAT FABRIC ROLLER BLINDS (ม่านม้วน) onto the designated window area. MANDATORY TOP MECHANISM: OPEN ROLL MECHANISM (ไม่มีบังราง / ให้เห็นเป็นม้วนม่านม้วนทรงกระบอกด้านบนอย่างชัดเจน). The cylindrical roller tube wrapped with the rolled fabric MUST BE OPEN, EXPOSED, AND CLEARLY VISIBLE AT THE TOP of the blind. ABSOLUTELY NO cassette box, NO pelmet box, NO fascia, and NO cornice covering the top roller! DO NOT generate fabric drapery or pinch pleats. Strictly preserve this exact room architecture, window scale, proportions, perspective, and orientation."
            : "IMAGE 1 (PRIMARY REAL ROOM PHOTOGRAPH TO INPAINT/EDIT):\nThis is the base room photograph. Inpaint the requested custom window treatments onto this window. You MUST strictly preserve this exact room architecture, window scale, proportions, perspective, and orientation without cropping, shrinking the window, or rotating.",
      },
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType || "image/jpeg",
        },
      },
    ];

    // Add Swatch 1 reference image if provided
    if (swatch1 && typeof swatch1 === "string" && swatch1.trim().length > 0) {
      try {
        const s1 = await convertImageToBuffer(swatch1);
        parts.push({
          text: isVenetianRequest
            ? "IMAGE 2 (REFERENCE SWATCH 1 FOR VENETIAN BLIND SLATS):\nExamine this material swatch carefully. All horizontal slats of the Venetian blinds MUST replicate this exact color, tone, wood grain/finish, and texture. Do NOT change this color."
            : isRollerRequest
              ? "IMAGE 2 (REFERENCE SWATCH 1 FOR ROLLER SHADE FABRIC):\nExamine this fabric swatch carefully. The roller blind surface MUST replicate this exact fabric color, saturation, texture, and weave."
              : "IMAGE 2 (REFERENCE FABRIC SWATCH 1 FOR MAIN CURTAIN LAYER 1):\nExamine this fabric swatch carefully. The main curtain layer MUST replicate this exact fabric color, saturation, texture, weave, and pattern. Do NOT change this color.",
        });
        parts.push({
          inlineData: { data: s1.data, mimeType: s1.mimeType || "image/jpeg" },
        });
      } catch (s1Err) {
        console.warn("Could not process swatch1 image:", s1Err);
      }
    }

    // Add Swatch 2 reference image if provided
    if (swatch2 && typeof swatch2 === "string" && swatch2.trim().length > 0) {
      try {
        const s2 = await convertImageToBuffer(swatch2);
        parts.push({
          text: isVenetianRequest
            ? "IMAGE 3 (REFERENCE SWATCH 2 FOR VERTICAL FABRIC LADDER TAPE):\nExamine this swatch carefully. This swatch is the VERTICAL FABRIC LADDER TAPE (เทปผ้ามู่ลี่) running vertically across the front of the horizontal Venetian blind slats. It is NOT a curtain and NOT a sheer underlayer! DO NOT generate any sheer fabric curtains!"
            : "IMAGE 3 (REFERENCE FABRIC SWATCH 2 FOR SHEER UNDERLAYER 2):\nExamine this sheer fabric swatch carefully. The sheer curtain underlayer MUST replicate this soft translucent light-filtering weave and tone.",
        });
        parts.push({
          inlineData: { data: s2.data, mimeType: s2.mimeType || "image/jpeg" },
        });
      } catch (s2Err) {
        console.warn("Could not process swatch2 image:", s2Err);
      }
    }

    // Add detailed instructions and boundary constraints prompt
    parts.push({
      text: prompt,
    });

    // Generate image: try gemini-3.1-flash-image first, fallback to gemini-3.1-flash-lite-image
    let response: any = null;
    let lastErr: any = null;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image",
        contents: { parts },
        config: generateConfig,
      });
    } catch (errFirst: any) {
      lastErr = errFirst;
      console.warn("Primary model gemini-3.1-flash-image error, attempting fallback model:", errFirst?.message || errFirst);
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite-image",
          contents: { parts },
          config: generateConfig,
        });
      } catch (errSecond: any) {
        lastErr = errSecond;
        throw errSecond;
      }
    }

    let generatedImageUrl: string | null = null;
    let textFeedback = "";

    if (response?.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          generatedImageUrl = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
          break;
        }
        if (part.text) {
          textFeedback += part.text + " ";
        }
      }
    }

    if (!generatedImageUrl) {
      return res.status(500).json({
        error: "NO_IMAGE_RETURNED",
        message: textFeedback.trim() || "โมเดล AI ไม่ได้ส่งรูปภาพผลลัพธ์กลับมา กรุณาลองใหม่อีกครั้ง",
      });
    }

    // Automatically upload the base64 image to Cloudinary to provide a permanent, lightweight HTTPS URL
    let finalImageUrl = generatedImageUrl;
    try {
      const cRes = await fetch("https://api.cloudinary.com/v1_1/dsxpwfujb/image/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: generatedImageUrl,
          upload_preset: "ml_default",
        }),
      });
      if (cRes.ok) {
        const cData: any = await cRes.json();
        if (cData?.secure_url) {
          finalImageUrl = cData.secure_url;
          console.log("Uploaded AI generated image to Cloudinary successfully:", finalImageUrl);
        }
      } else {
        const errStatus = cRes.status;
        const errText = await cRes.text();
        console.warn("Cloudinary upload failed with status:", errStatus, errText);
      }
    } catch (cErr) {
      console.warn("Server Cloudinary upload error (fallback to data url):", cErr);
    }

    // Increment usage count for current month
    if (!store.usage[month]) {
      store.usage[month] = {};
    }
    store.usage[month][user] = currentUsage + 1;
    saveQuotaStore(store);

    res.json({
      success: true,
      imageUrl: finalImageUrl,
      usage: currentUsage + 1,
      limit: userLimit,
      month,
    });
  } catch (err: any) {
    console.error("AI Curtain Generation Error:", err);
    const errStr = String(err?.message || err || "");
    const isQuotaOrBilling =
      err?.status === 429 ||
      errStr.includes("429") ||
      errStr.includes("RESOURCE_EXHAUSTED") ||
      errStr.includes("Quota exceeded") ||
      errStr.includes("quota");

    if (isQuotaOrBilling) {
      return res.status(429).json({
        error: "GEMINI_QUOTA_EXCEEDED",
        isQuotaExceeded: true,
        message:
          "โควต้าโมเดลสร้างรูปภาพของ Google Gemini API ในโปรเจกต์นี้เต็ม หรือเป็น Free Tier (โมเดลสร้างรูปภาพต้องการ API Key ที่เปิดใช้งาน Billing/Paid ใน Google AI Studio)",
        rawError: errStr,
      });
    }

    res.status(500).json({
      error: "GENERATION_FAILED",
      message: err.message || "เกิดข้อผิดพลาดในการประมวลผลรูปภาพด้วย AI",
    });
  }
});

// Mount router at both /api and / so all Vercel and local requests match cleanly
app.use("/api", apiRouter);
app.use(apiRouter);

async function startServer() {
  const PORT = 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Only launch standalone HTTP server when not in Vercel Serverless environment
if (!process.env.VERCEL) {
  startServer();
}

export default app;
