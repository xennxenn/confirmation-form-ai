# ระบบจัดการใบงานผ้าม่าน (Confirmation Form & AI Curtain Visualizer)

ระบบสร้างและจัดการใบสรุปงานติดตั้งผ้าม่าน ออกแบบมาสำหรับการทำงานร่วมกันเป็นทีม รองรับ **Online Real-time Synchronization** เชื่อมต่อฐานข้อมูลคลาวด์ ทุกคนเห็นข้อมูลเดียวกันทันที พร้อมฟังก์ชันสร้างรูปจำลองผ้าม่านเสมือนจริงด้วย Google Gemini AI

---

## 🚀 คู่มือการนำขึ้นใช้งานจริงผ่าน GitHub & Vercel (Deployment Guide)

### ขั้นตอนที่ 1: นำโค้ดขึ้น GitHub (Push to GitHub)
1. สร้าง New Repository บน [GitHub](https://github.com/new) (เช่น `curtain-app`)
2. ในเครื่องคอมพิวเตอร์ของคุณ เปิด Terminal ในโฟลเดอร์โปรเจกต์นี้ แล้วรันคำสั่ง:
   ```bash
   git init
   git add .
   git commit -m "feat: ระบบใบงานผ้าม่านพร้อม Vercel Serverless API และ Realtime Sync"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

---

### ขั้นตอนที่ 2: เชื่อมต่อและ Deploy บน Vercel
1. เข้าไปที่ [Vercel](https://vercel.com/) และล็อกอินด้วยบัญชี GitHub
2. กดปุ่ม **"Add New..."** > **"Project"**
3. เลือก Repository ที่เพิ่งอัปโหลดขึ้น GitHub แล้วกด **"Import"**
4. ตรวจสอบการตั้งค่า:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./`
   - **Build Command**: `npm run build` (หรือเว้นว่างตามค่าเริ่มต้น)
   - **Output Directory**: `dist`
5. ในส่วน **Environment Variables** เพิ่มตัวแปรดังนี้:
   - **`GEMINI_API_KEY`**: ใส่ Gemini API Key ของคุณ (รับได้ฟรีจาก [Google AI Studio](https://aistudio.google.com/))
6. กดปุ่ม **"Deploy"** แล้วรอระบบสร้างเสร็จสิ้นภายใน 1-2 นาที คุณจะได้ URL ใช้งานทันที (เช่น `https://curtain-app.vercel.app`)

---

## ⚡ คุณสมบัติเด่นของระบบ

1. **Real-time Synchronization (ข้อมูลตรงกันสดทุกคน):**
   - ใช้ Cloud Firestore พร้อม Realtime Listeners (`onSnapshot`)
   - ไม่ว่าพนักงานคนไหนจะสร้าง, แก้ไข, ลบใบงาน หรือเพิ่มบัญชีผู้ใช้งาน ข้อมูลบนหน้าจอของทุกคนจะอัปเดตแบบสดๆ ทันทีโดยไม่ต้องกดรีเฟรชหน้าเว็บ
   - ทุกคนสามารถดูใบงานทั้งหมดในบริษัทได้ พร้อมตัวกรองค้นหาตามชื่อลูกค้า หรือกรองดูเฉพาะงานของตนเอง

2. **Vercel Serverless Ready:**
   - มีไฟล์ `api/index.ts` และการตั้งค่า `vercel.json` ครบถ้วน
   - ระบบ API สำหรับประมวลผลรูปภาพด้วย Google Gemini (`/api/generate-ai-curtain`) และระบบโควต้า (`/api/ai-quota`) จะทำงานเป็น Serverless Function บน Vercel โดยอัตโนมัติ ไม่ต้องเช่า Server แยก

3. **AI Curtain Visualizer:**
   - จำลองภาพผ้าม่าน, ม่านม้วน, มู่ลี่, ม่านพับ บนรูปห้องจริง
   - รองรับการจำกัดความยาวผ้าม่านตามสัดส่วน Mask (10% - 100%)
   - เก็บประวัติรูปภาพที่เคยสร้างไว้ในแต่ละรายการ สามารถกดสลับดูเวอร์ชันต่างๆ ได้ตลอดเวลา
   - มีระบบฝากรูป Cloudinary อัตโนมัติ ป้องกันปัญหาขนาดไฟล์เกินขีดจำกัด
