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

function getApiKey(): string {
  const key = (
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.API_KEY ||
    ""
  ).trim();
  return key;
}

let currentApiKey: string | null = null;
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("ระบบยังไม่ได้ตั้งค่า GEMINI_API_KEY บน Server กรุณาตั้งค่าใน Environment Variables (ชื่อตัวแปร GEMINI_API_KEY)");
  }
  if (!aiClient || currentApiKey !== apiKey) {
    currentApiKey = apiKey;
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
          'x-goog-api-key': apiKey,
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

// Restore original path if Vercel altered req.url during rewrite
app.use((req, _res, next) => {
  const queryRoute = (req.query as any)?.__route;
  if (queryRoute && typeof queryRoute === "string") {
    req.url = `/api/${queryRoute.replace(/^\/+/, "")}`;
    return next();
  }

  const routeMatches = (req.headers["x-now-route-matches"] || "") as string;
  if (routeMatches) {
    const m = routeMatches.match(/(?:^|&)1=([^&]+)/);
    if (m && m[1]) {
      const captured = decodeURIComponent(m[1]).replace(/^\/+/, "");
      req.url = `/api/${captured}`;
      return next();
    }
  }

  const matchedPath = (req.headers["x-matched-path"] || "") as string;
  if (matchedPath && matchedPath.startsWith("/api") && matchedPath !== "/api") {
    req.url = matchedPath;
    return next();
  }

  const fwdUrl = (req.headers["x-forwarded-url"] || req.headers["x-original-url"] || "") as string;
  if (fwdUrl && fwdUrl.startsWith("/api")) {
    req.url = fwdUrl;
    return next();
  }

  next();
});

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

// Body parser with 50MB limit for image uploads (guard against re-parsing in Vercel)
app.use((req, res, next) => {
  if (req.body) {
    if (Buffer.isBuffer(req.body)) {
      try {
        req.body = JSON.parse(req.body.toString("utf-8"));
        return next();
      } catch {}
    } else if (typeof req.body === "string") {
      try {
        req.body = JSON.parse(req.body);
        return next();
      } catch {}
    } else if (typeof req.body === "object" && !Array.isArray(req.body)) {
      return next();
    }
  }
  express.json({ limit: "50mb" })(req, res, next);
});
app.use((req, res, next) => {
  if (req.body && typeof req.body === "object" && !Array.isArray(req.body) && !Buffer.isBuffer(req.body)) {
    return next();
  }
  express.urlencoded({ extended: true, limit: "50mb" })(req, res, next);
});

// Create API Router
const apiRouter = express.Router();

// Health check
const healthHandler = (_req: express.Request, res: express.Response) => {
  const hasKey = !!getApiKey();
  res.json({
    status: "ok",
    geminiKeyAvailable: hasKey,
    geminiKeyConfigured: hasKey,
  });
};
apiRouter.get("/health", healthHandler);
app.get("/health", healthHandler);

// Get quota for a user
const aiQuotaHandler = (req: express.Request, res: express.Response) => {
  try {
    const username = (req.query.username as string) || "anonymous";
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    const store = getQuotaStore();

    const userLimit = store.monthlyLimits[username] ?? store.defaultMonthlyLimit ?? 20;
    const userUsage = store.usage[month]?.[username] ?? 0;
    const remaining = Math.max(0, userLimit - userUsage);
    const hasKey = !!getApiKey();

    res.json({
      success: true,
      month,
      username,
      usage: userUsage,
      limit: userLimit,
      remaining,
      defaultLimit: store.defaultMonthlyLimit ?? 20,
      monthlyLimits: store.monthlyLimits,
      allUsage: store.usage[month] || {},
      geminiKeyConfigured: hasKey,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message, geminiKeyConfigured: !!getApiKey() });
  }
};
apiRouter.get("/ai-quota", aiQuotaHandler);
app.get("/ai-quota", aiQuotaHandler);

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

// Generate realistic curtain preview with Gemini (support both endpoint names)
const generateCurtainHandler = async (req: express.Request, res: express.Response) => {
  try {
    const { image, guideImage, prompt, username, swatch1, swatch2, aspectRatio } = req.body;

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
        message: `คุณใช้โควต้าสร้างรูป AI ประจำเดือน ${month} ครบกำหนดแล้ว (${currentUsage}/${userLimit} ครั้ง คงเหลือ 0 ครั้ง) กรุณาติดต่อผู้ดูแลระบบเพื่อขอเพิ่มโควต้า`,
        usage: currentUsage,
        limit: userLimit,
        remaining: 0,
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
    const isGrommetRequest = prompt.includes("GROMMET") || prompt.includes("ม่านเจาะห่วง") || prompt.includes("eyelet") || prompt.includes("ห่วงตาไก่");
    const isRippleFoldRequest = prompt.includes("RIPPLE FOLD") || prompt.includes("ม่านลอน") || prompt.includes("S-Fold");
    const isPinchPleatRequest = prompt.includes("PINCH PLEAT") || prompt.includes("ม่านจีบ");

    const parts: any[] = [
      {
        text: isVenetianRequest
          ? "IMAGE 1 (PRIMARY REAL ROOM PHOTOGRAPH TO INPAINT/EDIT):\nThis is the base room photograph. Inpaint custom HORIZONTAL VENETIAN BLINDS onto the designated window area. DO NOT generate fabric drapery or pinch pleat curtains. Strictly preserve this exact room architecture, window frame dimensions, perspective, and orientation without cropping, shrinking the window, or rotating."
          : isRollerRequest
            ? "IMAGE 1 (PRIMARY REAL ROOM PHOTOGRAPH TO INPAINT/EDIT):\nThis is the base room photograph. Inpaint custom FLAT FABRIC ROLLER BLINDS (ม่านม้วน) onto the designated window area. MANDATORY TOP MECHANISM: OPEN ROLL MECHANISM (ไม่มีบังราง / ให้เห็นเป็นม้วนม่านม้วนทรงกระบอกด้านบนอย่างชัดเจน). The cylindrical roller tube wrapped with the rolled fabric MUST BE OPEN, EXPOSED, AND CLEARLY VISIBLE AT THE TOP of the blind. ABSOLUTELY NO cassette box, NO pelmet box, NO fascia, and NO cornice covering the top roller! DO NOT generate fabric drapery or pinch pleats. Strictly preserve this exact room architecture, window scale, proportions, perspective, and orientation."
            : isGrommetRequest
              ? "IMAGE 1 (PRIMARY REAL ROOM PHOTOGRAPH TO EDIT):\nThis is the original base room photograph.\n\n*** MANDATORY ROOM PRESERVATION (คงต้นฉบับห้องไว้ 100% ห้ามเปลี่ยนแปลงเด็ดขาด) ***\n- You MUST preserve this exact room with 100% fidelity: maintain the wall art / picture frame on the left wall, the corner floor lamp, the brown leather armchair, the baby crib and canopy structure on the right, the bedding, the wood flooring, and the exact ceiling/walls outside the window area.\n- ABSOLUTELY DO NOT re-generate, alter, replace, or distort any furniture, objects, or room architecture from the original photo!\n\n*** WINDOW CURTAIN SPECIFICATION (ติดตั้งเฉพาะบริเวณหน้าต่างตามกรอบที่กำหนด) ***\n- Inpaint custom GROMMET / EYELET CURTAINS (ม่านเจาะห่วง) with circular metal grommet rings threaded onto an exposed decorative titanium curtain pole. ABSOLUTELY NO PINCH PLEATS, NO 3-FINGER PLEATS!\n- MOUNTING LEVEL: Mount the titanium pole directly on the plaster wall at the top boundary of the red guide box (approx 20 cm above the window frame), NOT at the ceiling! The wall space above this new pole up to the ceiling is smooth painted wall.\n- BOTTOM HEM: Terminates cleanly at the designated bottom hem line of the red guide box."
              : isRippleFoldRequest
                ? "IMAGE 1 (PRIMARY REAL ROOM PHOTOGRAPH TO EDIT):\nThis is the original base room photograph.\n\n*** MANDATORY ROOM PRESERVATION (คงต้นฉบับห้องไว้ 100% ห้ามเปลี่ยนแปลงเด็ดขาด) ***\n- You MUST preserve this exact room with 100% fidelity: maintain the wall art / picture frame on the left wall, the corner floor lamp, the brown leather armchair, the baby crib and canopy structure on the right, the bedding, the wood flooring, and the exact ceiling/walls outside the window area.\n- ABSOLUTELY DO NOT re-generate, alter, replace, or distort any furniture, objects, or room architecture from the original photo!\n\n*** WINDOW CURTAIN SPECIFICATION ***\n- Inpaint custom RIPPLE FOLD / S-FOLD CURTAINS (ม่านลอน) with continuous uniform S-wave ripple folds. ABSOLUTELY NO PINCH PLEATS!\n- MOUNTING LEVEL: Mount the track directly at the top boundary of the red guide box, NOT at the ceiling! The wall above is smooth painted wall."
                : isPinchPleatRequest
                  ? "IMAGE 1 (PRIMARY REAL ROOM PHOTOGRAPH TO EDIT):\nThis is the original base room photograph.\n\n*** MANDATORY ROOM PRESERVATION (คงต้นฉบับห้องไว้ 100% ห้ามเปลี่ยนแปลงเด็ดขาด) ***\n- You MUST preserve this exact room with 100% fidelity: maintain the wall art / picture frame on the left wall, the corner floor lamp, the brown leather armchair, the baby crib and canopy structure on the right, the bedding, the wood flooring, and the exact ceiling/walls outside the window area.\n- ABSOLUTELY DO NOT re-generate, alter, replace, or distort any furniture, objects, or room architecture from the original photo!\n\n*** WINDOW CURTAIN SPECIFICATION ***\n- Inpaint custom PINCH PLEAT CURTAINS (ม่านจีบ 3 จีบ) with crisp 3-finger pleats along the heading tape. ABSOLUTELY NO GROMMET EYELET RINGS!\n- MOUNTING LEVEL: Mount the track directly at the top boundary of the red guide box, NOT at the ceiling! The wall above is smooth painted wall."
                  : "IMAGE 1 (PRIMARY REAL ROOM PHOTOGRAPH TO EDIT):\nThis is the original base room photograph. Strictly preserve this exact room with 100% fidelity: maintain all furniture, wall art, lamps, and flooring. Inpaint the requested custom window treatments onto the designated window boundary.",
      },
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType || "image/jpeg",
        },
      },
    ];

    // Add Guide Image / Installation Mask reference if provided
    if (guideImage && typeof guideImage === "string" && guideImage.trim().length > 0) {
      try {
        const guide = await convertImageToBuffer(guideImage);
        parts.push({
          text:
            "IMAGE (TARGET INSTALLATION MASK & EXACT CURTAIN STACK POSITIONING GUIDE):\n" +
            "This guide image shows the original room photo with the user's EXACT TARGET INSTALLATION ZONE (red outline polygon) and EXACT CURTAIN STACK POSITIONS.\n" +
            "CRITICAL MANDATORY RULES (ยึดตามขนาดกรอบพื้นที่ผ้าม่านเป๊ะ 100% ไม่คิดไปเอง):\n" +
            "1. TOP ROD / TRACK MOUNTING LEVEL (ตำแหน่งติดตั้งรางม่าน):\n" +
            "   - Mount the curtain track/rod PRECISELY at the top boundary edge of the red polygon (approx 20 cm above the window frame).\n" +
            "   - The wall section above this rod up to the ceiling is clean, bare, smooth painted wall matching the room's wall paint.\n" +
            "   - ABSOLUTELY DO NOT move or snap the rod up to the ceiling or ceiling moulding! Keep that space as bare wall identical to the original photo.\n" +
            "2. EXACT BOTTOM HEM TERMINATION (ระยะชายผ้าม่านด้านล่าง ต้องตรงตามกรอบเป๊ะ 100%):\n" +
            "   - The bottom hem of the curtain fabric MUST terminate PRECISELY at the bottom boundary edge of the red polygon.\n" +
            "   - If the red box ends halfway down the wall (e.g., above the floor or window apron), the curtain fabric MUST STOP IN MID-AIR AT THAT EXACT LINE! ABSOLUTELY DO NOT extend the curtain fabric down to touch or hover above the floor! The wall/floor below the bottom edge MUST remain completely exposed.\n" +
            "   - If the red box extends below the window frame, the curtain fabric MUST NOT be cut short at the window sill. It MUST hang all the way down to the bottom boundary line of the red box!\n" +
            "3. FOREGROUND OBJECT OCCLUSION & 3D DEPTH LAYERING (การบังของสิ่งของด้านหน้าผ้าม่าน):\n" +
            "   - Real rooms often have foreground objects (e.g., kitchen appliances, counters, dish drying racks, sterilizers, baby walkers, cribs, chairs, sofas, shelves, headboards, desks, toys, or clutter) in front of the window.\n" +
            "   - If the designated curtain boundary extends behind or below any foreground objects:\n" +
            "     * THE CURTAINS HANG IN 3D SPACE BEHIND THOSE FOREGROUND OBJECTS, spanning full height from the top boundary down to the bottom hem boundary line!\n" +
            "     * DO NOT cut the curtain short or stop it above foreground objects!\n" +
            "     * ALL foreground objects MUST REMAIN 100% PRESERVED, CRISP, AND UNCHANGED in front of the curtains, naturally overlapping and occluding the fabric behind them.\n" +
            "4. STRICT HORIZONTAL BOUNDARIES (ความกว้างซ้าย-ขวา ไม่ขาด ไม่เกิน):\n" +
            "   - Curtains MUST be installed strictly within the left and right edges of the red polygon.\n" +
            "   - ABSOLUTELY DO NOT spill over onto adjacent perpendicular side walls, moldings, or columns!\n" +
            "5. STRAIGHT VS CURVED (แบบโค้งหรือแบบตรงตามที่พื้นที่ผ้าม่านกำหนด):\n" +
            "   - If this is a straight window/opening (บานตรงปกติ), the curtain hangs on a straight track directly across the opening. DO NOT bend or curve the track!\n" +
            "   - If this is a curved/bay alcove (บานโค้ง/รางดัด), the curtain follows the continuous curved track.\n" +
            "6. CURTAIN STACK POSITION (ตำแหน่งการรวบม่านตามที่ระบุ):\n" +
            "   - If one-way draw to the left (รวบซ้าย): The curtain gathers ONLY on the left side inside the red boundary. The right side is completely clear and open!\n" +
            "   - If one-way draw to the right (รวบขวา): The curtain gathers ONLY on the right side inside the red boundary. The left side is completely clear and open!\n" +
            "   - If center-split (แยกกลาง): Two panels gathered symmetrically on left and right inside the boundary.\n" +
            "7. PHOTOREALISM & SEAMLESS PHYSICAL HARMONY (เน้นความสมจริง เป็นผ้าม่านที่ติดตั้งจริง ไม่ดูลอย):\n" +
            "   - The curtains must look 100% physically installed in the actual room, NOT a flat sticker or disconnected overlay.\n" +
            "   - Cast authentic, soft contact ambient occlusion shadows on the wall behind the rod, brackets, and fabric folds.\n" +
            "   - Replicate authentic organic fabric weight and gravity drape with double-folded hem stitching.\n" +
            "   - Interact naturally with room daylight: rim lighting on leading edges, natural translucency, and soft shadow falloff in fold depths.\n" +
            "8. DO NOT render the red guide markings, outlines, or text labels in the final output.",
        });
        parts.push({
          inlineData: {
            data: guide.data,
            mimeType: guide.mimeType || "image/jpeg",
          },
        });
      } catch (gErr) {
        console.warn("Could not process guideImage:", gErr);
      }
    }

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

    // Generate image: try gemini-3.1-flash-lite-image first (fastest, standard image model), fallback to gemini-3.1-flash-image
    let response: any = null;
    let lastErr: any = null;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-image",
        contents: { parts },
        config: generateConfig,
      });
    } catch (errFirst: any) {
      lastErr = errFirst;
      console.warn("Primary model gemini-3.1-flash-lite-image error, attempting secondary model gemini-3.1-flash-image:", errFirst?.message || errFirst);
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.1-flash-image",
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

    // Automatically upload the base64 image to Cloudinary to provide a permanent, lightweight HTTPS URL (with 6s timeout guard)
    let finalImageUrl = generatedImageUrl;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const cRes = await fetch("https://api.cloudinary.com/v1_1/dsxpwfujb/image/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          file: generatedImageUrl,
          upload_preset: "ml_default",
        }),
      });
      clearTimeout(timer);
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
    const nextUsage = currentUsage + 1;
    store.usage[month][user] = nextUsage;
    saveQuotaStore(store);

    res.json({
      success: true,
      imageUrl: finalImageUrl,
      usage: nextUsage,
      limit: userLimit,
      remaining: Math.max(0, userLimit - nextUsage),
      month,
      feedback: textFeedback.trim() || undefined,
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
};

apiRouter.post(["/generate-ai-curtain", "/generate-curtain"], generateCurtainHandler);
app.post(["/generate-ai-curtain", "/generate-curtain"], generateCurtainHandler);

// Catch-all 404 handler for API routes (always return JSON, never HTML)
apiRouter.all("*", (req, res) => {
  res.status(404).json({
    error: "API_ROUTE_NOT_FOUND",
    message: `API Route not found: ${req.method} ${req.originalUrl || req.url}`,
  });
});

// Mount router exclusively at /api so web pages and static assets are served normally
app.use("/api", apiRouter);

// Global express error handler ensuring JSON responses
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Express Global Error:", err);
  if (!res.headersSent) {
    res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: err?.message || "เกิดข้อผิดพลาดในการประมวลผลบนเซิร์ฟเวอร์",
    });
  }
});

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
