export const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dsxpwfujb/image/upload";
export const CLOUDINARY_UPLOAD_PRESET = "ml_default"; 

export const optImg = (url: string | null | undefined, width?: number, forcePng?: boolean): string => {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com/')) return url || '';
  
  // Clean up any existing auto-transformations to ensure we apply the correct format (png vs jpg)
  let cleanUrl = url;
  if (url.includes('/upload/')) {
    const parts = url.split('/upload/');
    const rightPart = parts[1];
    if (rightPart && !rightPart.startsWith('v') && rightPart.includes('/')) {
      const subParts = rightPart.split('/');
      subParts.shift(); // remove transformation part
      cleanUrl = `${parts[0]}/upload/${subParts.join('/')}`;
    }
  }

  const format = forcePng ? 'f_png' : 'f_jpg';
  return cleanUrl.replace('/upload/', `/upload/${format},q_auto${width ? `,w_${width}` : ''}/`);
};

export const removeWhiteBackground = (dataUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (h > 300) { w = Math.round(w * (300 / h)); h = 300; }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] > 190 && data[i+1] > 190 && data[i+2] > 190) data[i+3] = 0;
        }
        ctx.putImageData(imgData, 0, 0);
      }
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = dataUrl;
  });
};

export const loadHeic2Any = async (): Promise<any> => {
  if ((window as any).heic2any) return (window as any).heic2any;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js";
    script.onload = () => resolve((window as any).heic2any);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

export const processImageFile = async (
  file: File, 
  maxWidth = 1024, 
  quality = 0.7, 
  setDialog?: (dialog: any) => void
): Promise<string | null> => {
  let processFile = file;
  if (file.name.toLowerCase().match(/\.(heic|heif)$/i)) {
    try {
      const heic2any = await loadHeic2Any();
      const convertedBlob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.8 });
      const blobArray = Array.isArray(convertedBlob) ? convertedBlob : [convertedBlob];
      processFile = new File(blobArray, file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: "image/jpeg" });
    } catch (err) {
      if (setDialog) setDialog({ type: 'alert', message: "ไม่สามารถแปลงไฟล์ HEIC ได้" });
      return null;
    }
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width, height = img.height;
        if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
        }
        resolve(canvas.toDataURL('image/webp', quality)); 
      };
      img.onerror = () => { resolve(null); };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(processFile);
  });
};

export const uploadImageToCloudinary = async (base64Str: string): Promise<string | null> => {
  try {
    const res = await fetch(CLOUDINARY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file: base64Str,
        upload_preset: CLOUDINARY_UPLOAD_PRESET,
      }),
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    return data.secure_url || null; 
  } catch (e) {
    console.warn("Cloudinary upload failed:", e);
    return null;
  }
};
