import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Sparkles, Printer, CheckSquare, Square, 
  Download, RefreshCw, Sliders, Check, AlertCircle, 
  Eye, Layers, Image as ImageIcon, Save, Trash2, X,
  Undo, Redo, Share2
} from 'lucide-react';
import { CurtainItem, GeneralInfo } from '../types';
import { InfoCard } from './InfoCard';
import { buildCurtainAiPrompt } from '../utils/aiCurtainPrompt';

interface AiPreviewViewProps {
  items: CurtainItem[];
  generalInfo: GeneralInfo;
  appDB: any;
  appUser: any;
  allAccounts?: any[];
  onBack: () => void;
  onUpdateItem: (id: string, updates: Partial<CurtainItem>) => void;
  setDialog: (dialog: any) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onSave?: (customItems?: CurtainItem[]) => Promise<any> | void;
  isSaving?: boolean;
  saveStatus?: string | null;
  onSharePDF?: () => void;
  onPrint?: () => void;
}

export const AiPreviewView: React.FC<AiPreviewViewProps> = ({
  items,
  generalInfo,
  appDB,
  appUser,
  allAccounts = [],
  onBack,
  onUpdateItem,
  setDialog,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onSave,
  isSaving = false,
  saveStatus = null,
  onSharePDF,
  onPrint,
}) => {
  // Page selection for printing & batch operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(items.map(i => i.id)));
  // View mode per item: 'ai' | 'original' | 'split'
  const [viewModes, setViewModes] = useState<Record<string, 'ai' | 'original' | 'split'>>({});
  // Generating status per item
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  // User monthly quota
  const [quota, setQuota] = useState<{ usage: number; limit: number; month: string } | null>(null);
  const [loadingQuota, setLoadingQuota] = useState(false);
  // Admin quota modal
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [adminLimits, setAdminLimits] = useState<Record<string, number>>({});
  const [defaultLimit, setDefaultLimit] = useState<number>(20);
  const [savingLimit, setSavingLimit] = useState(false);

  // Keep live reference to items to strictly prevent stale closure race conditions in async operations
  const itemsRef = React.useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Handle switching to a previously generated image version
  const handleSelectVersion = async (item: CurtainItem, url: string) => {
    const updated = { ...item, aiImage: url };
    onUpdateItem(item.id, updated);
    setViewModes(prev => ({ ...prev, [item.id]: 'ai' }));
    if (onSave) {
      const nextItems = (itemsRef.current || items).map(i => i.id === item.id ? { ...i, ...updated } : i);
      try {
        await onSave(nextItems);
      } catch (err) {
        console.warn("Save after version select error:", err);
      }
    }
  };

  // Handle deleting a single version from history
  const handleDeleteVersion = async (item: CurtainItem, urlToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = (item.aiImages || []).filter(u => u !== urlToDelete);
    const newActive = item.aiImage === urlToDelete ? (remaining[0] || '') : (item.aiImage || '');
    const updated = { ...item, aiImage: newActive, aiImages: remaining };
    onUpdateItem(item.id, updated);
    if (onSave) {
      const nextItems = (itemsRef.current || items).map(i => i.id === item.id ? { ...i, ...updated } : i);
      try {
        await onSave(nextItems);
      } catch (err) {
        console.warn("Save after version delete error:", err);
      }
    }
  };

  // Handle updating mask drop percentage (10% - 100%)
  const handleUpdateMaskPct = async (item: CurtainItem, pct: number) => {
    const updatedAreas = (item.areas || []).map((a, idx) => idx === 0 ? { ...a, maskPct: pct } : a);
    const updated = { ...item, areas: updatedAreas };
    onUpdateItem(item.id, updated);
    if (onSave) {
      const nextItems = (itemsRef.current || items).map(i => i.id === item.id ? { ...i, ...updated } : i);
      try {
        await onSave(nextItems);
      } catch (err) {
        console.warn("Save after maskPct update error:", err);
      }
    }
  };

  // Fetch quota
  const fetchQuota = async () => {
    try {
      setLoadingQuota(true);
      const res = await fetch(`/api/ai-quota?username=${encodeURIComponent(appUser.username)}`);
      const data = await res.json();
      if (data.success) {
        setQuota({ usage: data.usage, limit: data.limit, month: data.month });
        setAdminLimits(data.monthlyLimits || {});
        setDefaultLimit(data.defaultLimit || 20);
      }
    } catch (e) {
      console.warn('Could not fetch AI quota:', e);
    } finally {
      setLoadingQuota(false);
    }
  };

  useEffect(() => {
    fetchQuota();
  }, [appUser.username]);

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(items.map(i => i.id)));
  const clearSelection = () => setSelectedIds(new Set());

  // Generate AI image for a specific item
  const handleGenerate = async (item: CurtainItem) => {
    if (!item.image) {
      setDialog({ type: 'alert', message: 'กรุณาอัปโหลดรูปภาพหน้างานต้นฉบับในหน้าแก้ไขก่อน' });
      return;
    }

    if (quota && quota.usage >= quota.limit) {
      setDialog({
        type: 'alert',
        message: `โควต้าสร้างรูป AI เดือนนี้ของคุณเต็มแล้ว (${quota.usage}/${quota.limit} ครั้ง) กรุณาติดต่อผู้ดูแลระบบ`,
      });
      return;
    }

    const primaryArea: any = item.areas?.[0] || {};
    const itemMaskPct = (primaryArea.maskPct !== undefined && primaryArea.maskPct !== null) ? primaryArea.maskPct : 100;
    const sMain1 = primaryArea.styleMain1 || item.styleMain1 || (item as any).styleMain || '';
    const sMain2 = primaryArea.styleMain2 || item.styleMain2 || '';
    const aMain1 = primaryArea.styleAction1 || item.styleAction1 || (item as any).styleAction || '';
    const aMain2 = primaryArea.styleAction2 || item.styleAction2 || '';

    // Search fabrics across all areas of this item as fallback
    const allItemFabs = item.areas?.flatMap((a: any) => a.fabrics || []).filter(Boolean) || [];
    const fab1 = primaryArea.fabrics?.[0] || allItemFabs[0];
    const fab2 = primaryArea.fabrics?.[1] || (allItemFabs.length > 1 ? allItemFabs[1] : undefined);

    // Deep Swatch resolution
    const resolveFabImg = (fab: any) => {
      if (!fab) return null;
      if (fab.image && typeof fab.image === 'string' && fab.image.length > 5) {
        return fab.image;
      }
      if (fab.url && typeof fab.url === 'string' && fab.url.length > 5) {
        return fab.url;
      }
      if (fab.mainType === 'ผ้านอกระบบ (เฉพาะงานนี้)') {
        const customMatch = (generalInfo.customFabrics || []).find(
          (f: any) => f.subType === fab.subType && f.name === fab.name && f.color === fab.color
        );
        if (customMatch?.image) return customMatch.image;
      }
      // Exact lookup in appDB
      const direct = appDB.curtainTypes?.[fab.mainType]?.[fab.subType]?.[fab.name]?.[fab.color];
      if (direct) return direct;

      // Broad lookup if category or subType had slight variance
      if (fab.name && fab.color && appDB.curtainTypes) {
        for (const cat of Object.keys(appDB.curtainTypes)) {
          for (const sub of Object.keys(appDB.curtainTypes[cat] || {})) {
            if (appDB.curtainTypes[cat][sub]?.[fab.name]?.[fab.color]) {
              return appDB.curtainTypes[cat][sub][fab.name][fab.color];
            }
          }
        }
      }
      return null;
    };

    const swatch1Img = resolveFabImg(fab1);
    const swatch2Img = fab2 ? resolveFabImg(fab2) : null;

    // Strict boundary calculation across all drawn areas on this window
    let boundary: { minX: number; maxX: number; minY: number; maxY: number } | null = null;
    const allPoints: { x: number; y: number }[] = [];
    item.areas?.forEach((area: any) => {
      if (area.points && area.points.length >= 2) {
        allPoints.push(...area.points);
      }
    });

    if (allPoints.length >= 2) {
      const xs = allPoints.map(p => p.x);
      const ys = allPoints.map(p => p.y);
      boundary = {
        minX: Math.max(0, Math.min(...xs)),
        maxX: Math.min(100, Math.max(...xs)),
        minY: Math.max(0, Math.min(...ys)),
        maxY: Math.min(100, Math.max(...ys)),
      };
    }

    const mappedAreas = (item.areas || []).map((area: any, idx: number) => {
      let aMinX: number | undefined;
      let aMaxX: number | undefined;
      let aMinY: number | undefined;
      let aMaxY: number | undefined;
      if (area.points && area.points.length >= 2) {
        const xs = area.points.map((p: any) => p.x);
        const ys = area.points.map((p: any) => p.y);
        aMinX = Math.max(0, Math.min(...xs));
        aMaxX = Math.min(100, Math.max(...xs));
        aMinY = Math.max(0, Math.min(...ys));
        aMaxY = Math.min(100, Math.max(...ys));
      }
      return {
        areaIndex: idx + 1,
        width: area.width || '',
        height: area.height || '',
        minX: aMinX,
        maxX: aMaxX,
        minY: aMinY,
        maxY: aMaxY,
        maskPct: area.maskPct !== undefined ? area.maskPct : 100,
        fabrics: area.fabrics,
        styleMain1: area.styleMain1,
        styleAction1: area.styleAction1,
      };
    });

    const prompt = buildCurtainAiPrompt({
      styleName1: sMain1,
      action1: aMain1,
      styleName2: sMain2,
      action2: aMain2,
      layers: item.layers || 1,
      track: item.tracks?.join(', '),
      bracket: item.bracket,
      hangStyle: item.hangStyle,
      accessories: item.accessories,
      marginLeft: item.marginLeft,
      marginRight: item.marginRight,
      marginTop: item.marginTop,
      marginBottom: item.marginBottom,
      fabricName1: fab1?.name,
      fabricColor1: fab1?.color,
      fabricSubtype1: fab1?.subType,
      fabricMainType1: fab1?.mainType,
      fabricName2: fab2?.name,
      fabricColor2: fab2?.color,
      fabricSubtype2: fab2?.subType,
      fabricMainType2: fab2?.mainType,
      roomPos: item.roomPos,
      width: primaryArea.width,
      height: primaryArea.height,
      maskPct: itemMaskPct,
      boundary,
      areas: mappedAreas,
      hasSwatch1: !!swatch1Img,
      hasSwatch2: !!swatch2Img,
    });

    setGeneratingIds(prev => new Set(prev).add(item.id));

    try {
      const originalPhotoUrl = item.originalImage || item.image;

      // Probe natural image aspect ratio to enforce 1:1 orientation and prevent resizing/flipping
      let determinedAspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' = '1:1';
      try {
        const probeImg = new Image();
        probeImg.src = originalPhotoUrl;
        await new Promise((resolve) => {
          if (probeImg.complete && probeImg.naturalWidth > 0) return resolve(null);
          probeImg.onload = () => resolve(null);
          probeImg.onerror = () => resolve(null);
          setTimeout(() => resolve(null), 800);
        });
        if (probeImg.naturalWidth > 0 && probeImg.naturalHeight > 0) {
          const ratio = probeImg.naturalWidth / probeImg.naturalHeight;
          if (ratio >= 1.55) determinedAspectRatio = '16:9';
          else if (ratio >= 1.15) determinedAspectRatio = '4:3';
          else if (ratio <= 0.65) determinedAspectRatio = '9:16';
          else if (ratio <= 0.88) determinedAspectRatio = '3:4';
          else determinedAspectRatio = '1:1';
        }
      } catch (probeErr) {
        console.warn('Aspect ratio probe error:', probeErr);
      }

      // Pre-convert swatch images to Base64 in client browser so server doesn't need to fetch external URLs
      const toClientBase64 = async (imgUrl: string | null | undefined): Promise<string | undefined> => {
        if (!imgUrl || typeof imgUrl !== 'string') return undefined;
        if (imgUrl.startsWith('data:image/')) return imgUrl;

        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = imgUrl;

          await new Promise((resolve, reject) => {
            if (img.complete && img.naturalWidth > 0) return resolve(null);
            img.onload = () => resolve(null);
            img.onerror = () => reject(new Error('Image load failed'));
            setTimeout(() => reject(new Error('Image timeout')), 2500);
          });

          const maxDim = 512;
          let w = img.naturalWidth;
          let h = img.naturalHeight;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            return canvas.toDataURL('image/jpeg', 0.85);
          }
        } catch (e) {
          // If browser canvas tainted by cross-origin, try fetch-as-blob
          try {
            const res = await fetch(imgUrl, { mode: 'cors' });
            if (res.ok) {
              const blob = await res.blob();
              return await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            }
          } catch {
            // fallback: return original url
          }
        }
        return imgUrl;
      };

      const [safeSwatch1, safeSwatch2] = await Promise.all([
        toClientBase64(swatch1Img),
        toClientBase64(swatch2Img),
      ]);

      const res = await fetch('/api/generate-ai-curtain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: originalPhotoUrl,
          prompt,
          swatch1: safeSwatch1,
          swatch2: safeSwatch2,
          username: appUser.username,
          itemId: item.id,
          aspectRatio: determinedAspectRatio,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'การสร้างภาพล้มเหลว');
      }

      const currentHistory = Array.isArray(item.aiImages) ? item.aiImages : (item.aiImage ? [item.aiImage] : []);
      const updatedHistory = Array.from(new Set([data.imageUrl, ...currentHistory]));

      const updatedItem = {
        ...item,
        aiImage: data.imageUrl,
        aiImages: updatedHistory,
        originalImage: originalPhotoUrl,
      };
      onUpdateItem(item.id, updatedItem);
      setViewModes(prev => ({ ...prev, [item.id]: 'ai' }));
      setQuota({ usage: data.usage, limit: data.limit, month: data.month });

      // Auto-save immediately using itemsRef to ensure generated AI image is permanently persisted
      if (onSave) {
        const nextItems = (itemsRef.current || items).map(i => i.id === item.id ? { ...i, ...updatedItem } : i);
        try {
          await onSave(nextItems);
        } catch (saveErr) {
          console.warn("Auto-save after generation warning:", saveErr);
        }
      }

      setDialog({
        type: 'alert',
        message: '✨ สร้างภาพผ้าม่านเสมือนจริงด้วย AI และบันทึกข้อมูลเรียบร้อยแล้ว!',
      });
    } catch (err: any) {
      setDialog({
        type: 'alert',
        message: `เกิดข้อผิดพลาดในการสร้างภาพ: ${err.message || 'โปรดลองใหม่'}`,
      });
    } finally {
      setGeneratingIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  // Batch generate
  const handleBatchGenerate = async () => {
    const targets = items.filter(i => selectedIds.has(i.id) && i.image);
    if (targets.length === 0) {
      setDialog({ type: 'alert', message: 'กรุณาเลือกหน้าที่ต้องการสร้างรูปและมีรูปต้นฉบับ' });
      return;
    }

    if (quota && quota.usage + targets.length > quota.limit) {
      setDialog({
        type: 'alert',
        message: `โควต้าคงเหลือไม่พอ (${quota.limit - quota.usage} ครั้ง) สำหรับสร้าง ${targets.length} หน้า`,
      });
      return;
    }

    for (const item of targets) {
      await handleGenerate(item);
    }
  };

  // Save admin limits
  const handleSaveAdminLimit = async (username: string, limitVal: number) => {
    try {
      setSavingLimit(true);
      const res = await fetch('/api/ai-quota/limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, limit: limitVal }),
      });
      const data = await res.json();
      if (data.success) {
        setAdminLimits(data.monthlyLimits);
        setDefaultLimit(data.defaultLimit);
        fetchQuota();
        setDialog({ type: 'alert', message: 'บันทึกการตั้งค่าโควต้าเรียบร้อยแล้ว' });
      }
    } catch (e: any) {
      setDialog({ type: 'alert', message: 'บันทึกล้มเหลว: ' + e.message });
    } finally {
      setSavingLimit(false);
    }
  };

  // Helper for area grouping & label
  const getGroupedAreas = (item: CurtainItem) => {
    const groups: Record<string, any> = {};
    (item.areas || []).forEach((area: any, idx: number) => {
      const w = area.width || '-', h = area.height || '-', 
            s1 = area.styleMain1 || item.styleMain1 || (item as any).styleMain || '-', 
            a1 = area.styleAction1 || item.styleAction1 || (item as any).styleAction || '-', 
            s2 = item.layers === 2 ? (area.styleMain2 || item.styleMain2 || '-') : '', 
            a2 = item.layers === 2 ? (area.styleAction2 || item.styleAction2 || '-') : '';
      const key = `${w}|${h}###${s1}|${a1}|${s2}|${a2}`;
      if (!groups[key]) groups[key] = { labelNums: [], w, h, s1, a1, s2, a2 };
      groups[key].labelNums.push(idx + 1);
    });
    return Object.values(groups);
  };

  const formatBaanLabel = (nums: number[], total: number) => {
    if (nums.length === total && total > 1) return "ทุกบาน";
    if (nums.length === 1) return `บานที่ ${nums[0]}`;
    if (nums.length === 2) return `บานที่ ${nums[0]} และ ${nums[1]}`;
    return `บานที่ ${nums.slice(0, -1).join(', ')} และ ${nums[nums.length - 1]}`;
  };

  const handleSafeBack = async () => {
    if (onSave) {
      try {
        await onSave(itemsRef.current || items);
      } catch (e) {
        console.warn('Save on back warning:', e);
      }
    }
    onBack();
  };

  const handlePrintSelected = () => {
    if (selectedIds.size === 0) {
      setDialog({ type: 'alert', message: 'กรุณาเลือกหน้าที่ต้องการพิมพ์อย่างน้อย 1 หน้า' });
      return;
    }
    window.print();
  };

  const downloadImage = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-16 print:p-0 print:bg-white">
      {/* Print Specific CSS */}
      <style>{`
        @media print {
          @page {
            size: 297mm 210mm;
            margin: 10mm;
          }
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-hidden-unselected {
            display: none !important;
          }
          .ai-preview-page {
            width: 277mm !important;
            max-width: 277mm !important;
            height: 190mm !important;
            min-height: 190mm !important;
            max-height: 190mm !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
            page-break-before: auto !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            break-after: page !important;
            break-inside: avoid !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
            padding: 0 !important;
            overflow: hidden !important;
            box-shadow: none !important;
          }
          .ai-preview-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .ai-preview-frame {
            width: 277mm !important;
            max-width: 277mm !important;
            height: 186mm !important;
            min-height: 186mm !important;
            max-height: 186mm !important;
            border: 2px solid #1f2937 !important;
            border-radius: 4px !important;
            padding: 2px !important;
            background: white !important;
            display: flex !important;
            flex-direction: column !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            margin: 0 auto !important;
            box-shadow: none !important;
          }
          .ai-preview-inner-grid {
            width: 100% !important;
            height: 100% !important;
            min-height: 100% !important;
            max-height: 100% !important;
            display: flex !important;
            flex-direction: row !important;
            border: 1px solid #d1d5db !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            background: white !important;
          }
          .ai-preview-left-col {
            width: 70% !important;
            min-width: 70% !important;
            max-width: 70% !important;
            height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            border-right: 1px solid #d1d5db !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          .ai-preview-right-col {
            width: 30% !important;
            min-width: 30% !important;
            max-width: 30% !important;
            height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            padding: 0 !important;
          }
          .ai-preview-cards-grid {
            height: 48mm !important;
            min-height: 48mm !important;
            max-height: 48mm !important;
            flex-shrink: 0 !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            padding: 4px !important;
          }
        }
      `}</style>

      {/* Top Navigation & Action Bar */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40 no-print">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSafeBack}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-colors"
            >
              <ArrowLeft size={16} /> กลับแก้ไขใบงาน
            </button>
            <div>
              <h1 className="text-lg md:text-xl font-extrabold text-gray-900 flex items-center gap-2">
                <Sparkles className="text-indigo-600 animate-pulse" size={20} />
                AI Preview (ภาพผ้าม่านเสมือนจริง)
              </h1>
              <p className="text-xs text-gray-500">
                ลูกค้า: <span className="font-bold text-gray-700">{generalInfo.customerName || 'ทั่วไป'}</span> | {generalInfo.location || '-'}
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* Save All AI Images Button */}
            {onSave && (
              <button
                onClick={async () => {
                  try {
                    await onSave(itemsRef.current || items);
                    setDialog({
                      type: 'alert',
                      message: '💾 บันทึกภาพที่เจนไว้แล้วทั้งหมดลงในระบบเรียบร้อยแล้ว!',
                    });
                  } catch (e: any) {
                    setDialog({
                      type: 'alert',
                      message: 'เกิดข้อผิดพลาดในการบันทึก: ' + (e?.message || e),
                    });
                  }
                }}
                disabled={isSaving}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-sm font-bold shadow-md transition-all disabled:opacity-50"
                title="บันทึกภาพที่เจนไว้แล้วทั้งหมด"
              >
                <Save size={16} className={isSaving ? 'animate-spin' : ''} />
                <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกภาพทั้งหมด'}</span>
              </button>
            )}

            {/* Quota Badge */}
            {quota && (
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5 text-xs">
                <span className="text-indigo-700 font-medium">โควต้าเดือนนี้:</span>
                <span className={`font-bold ${quota.usage >= quota.limit ? 'text-red-600' : 'text-indigo-900'}`}>
                  {quota.usage} / {quota.limit} ครั้ง
                </span>
                <button
                  onClick={fetchQuota}
                  disabled={loadingQuota}
                  title="รีเฟรชโควต้า"
                  className="text-indigo-400 hover:text-indigo-600 transition-colors"
                >
                  <RefreshCw size={12} className={loadingQuota ? 'animate-spin' : ''} />
                </button>
              </div>
            )}

            {/* Admin Quota Button */}
            {appUser.role === 'admin' && (
              <button
                onClick={() => setShowQuotaModal(true)}
                className="flex items-center gap-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
              >
                <Sliders size={14} /> ตั้งค่าโควต้า
              </button>
            )}

            {/* Print / PDF Export Button */}
            <button
              onClick={handlePrintSelected}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-md transition-all"
            >
              <Printer size={16} /> พิมพ์ / PDF ({selectedIds.size} หน้า)
            </button>
          </div>
        </div>

        {/* Multi-page selection & batch bar */}
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center flex-wrap gap-2">
              <span className="font-bold text-gray-700">เลือกหน้าที่ต้องการ:</span>
              <button
                onClick={selectAll}
                className="text-blue-600 hover:underline font-medium"
              >
                เลือกทั้งหมด ({items.length})
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={clearSelection}
                className="text-gray-500 hover:underline"
              >
                ล้างการเลือก
              </button>

              <div className="flex flex-wrap gap-1.5 ml-2">
                {items.map((item, idx) => {
                  const isSelected = selectedIds.has(item.id);
                  const hasAi = !!item.aiImage;
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleSelect(item.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded border text-xs transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm font-bold'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {isSelected ? <CheckSquare size={12} /> : <Square size={12} />}
                      <span>หน้า {idx + 1}</span>
                      {hasAi && <Sparkles size={10} className={isSelected ? 'text-yellow-300' : 'text-indigo-500'} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedIds.size > 0 && (
              <button
                onClick={handleBatchGenerate}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs font-bold shadow transition-colors"
              >
                <Sparkles size={13} /> สร้างรูป AI หน้าที่เลือก ({selectedIds.size})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Pages Container */}
      <div className="max-w-7xl mx-auto px-2 md:px-4 py-6 flex flex-col gap-10">
        {items.map((item, index) => {
          const isSelected = selectedIds.has(item.id);
          const isGenerating = generatingIds.has(item.id);
          const currentMode = viewModes[item.id] || (item.aiImage ? 'ai' : 'original');
          const originalPhotoUrl = item.originalImage || item.image;

          // Fabric / Style resolution matching image.png exactly
          const primaryArea: any = item.areas?.[0] || {};
          const sMain1 = primaryArea.styleMain1 || item.styleMain1 || (item as any).styleMain || '';
          const sMain2 = primaryArea.styleMain2 || item.styleMain2 || '';
          const styleImg1 = sMain1 && appDB.styleImages?.[sMain1];

          const getFabImg = (fab: any) => {
            if (!fab) return null;
            if (fab.mainType === 'ผ้านอกระบบ (เฉพาะงานนี้)') {
              return (generalInfo.customFabrics || []).find(
                (f: any) => f.subType === fab.subType && f.name === fab.name && f.color === fab.color
              )?.image;
            }
            return appDB.curtainTypes?.[fab.mainType]?.[fab.subType]?.[fab.name]?.[fab.color];
          };

          const getHexColor = (colorStr: string) => {
            if (!colorStr) return '';
            if (colorStr.startsWith('#')) return colorStr;
            const lowerCol = colorStr.toLowerCase();
            if (lowerCol.includes('ครีม') || lowerCol.includes('cream')) return '#FFFDD0';
            if (lowerCol.includes('ขาว') || lowerCol.includes('white')) return '#F9F9F9';
            if (lowerCol.includes('เทา') || lowerCol.includes('gray') || lowerCol.includes('grey')) return '#9CA3AF';
            if (lowerCol.includes('น้ำตาล') || lowerCol.includes('brown')) return '#78350F';
            if (lowerCol.includes('เบจ') || lowerCol.includes('beige')) return '#F5F5DC';
            if (lowerCol.includes('ทอง') || lowerCol.includes('gold')) return '#FBBF24';
            if (lowerCol.includes('น้ำเงิน') || lowerCol.includes('blue')) return '#1E3A8A';
            if (lowerCol.includes('ชมพู') || lowerCol.includes('pink')) return '#F472B6';
            if (lowerCol.includes('เขียว') || lowerCol.includes('green')) return '#047857';
            if (lowerCol.includes('แดง') || lowerCol.includes('red')) return '#B91C1C';
            if (lowerCol.includes('ดำ') || lowerCol.includes('black') || lowerCol.includes('charcoal')) return '#1F2937';
            return '#E5E7EB';
          };

          let imgMain = null;
          let txtMain = '';
          let colMain = '';
          let colorMainValue = '';
          let imgSheer = null;
          let txtSheer = '';
          let colSheer = '';
          let colorSheerValue = '';

          let tapeImg = null;
          let tapeText = '';
          let tapeColorValue = '';
          let hasTape = false;
          const isBlindsHoriz = (sMain1 || '').includes('มู่ลี่');

          if (item.areas && item.areas.length > 0) {
            const allFabs = primaryArea.fabrics || [];
            const fab1 = allFabs[0];
            const fab2 = allFabs[1];

            if (fab1) {
              imgMain = getFabImg(fab1);
              txtMain = fab1.subType || 'ม่าน 1';
              colMain = `${fab1.name || ''} ${fab1.name && fab1.color ? '/' : ''} ${fab1.color || ''}`.trim();
              colorMainValue = fab1.color ? getHexColor(fab1.color) : '';
            }
            if (fab2 && item.layers === 2) {
              imgSheer = getFabImg(fab2);
              txtSheer = fab2.subType || 'ม่าน 2';
              colSheer = `${fab2.name || ''} ${fab2.name && fab2.color ? '/' : ''} ${fab2.color || ''}`.trim();
              colorSheerValue = fab2.color ? getHexColor(fab2.color) : '';
            }

            if (isBlindsHoriz) {
              const tapeFab = primaryArea.fabrics?.find((f: any) =>
                f.name?.toUpperCase().includes('TAPE') || f.name?.includes('เทป') ||
                f.subType?.toUpperCase().includes('TAPE') || f.subType?.includes('เทป')
              );
              if (tapeFab) {
                hasTape = true;
                tapeImg = getFabImg(tapeFab);
                tapeText = `${tapeFab.name || ''} ${tapeFab.color || ''}`.trim();
                tapeColorValue = tapeFab.color ? getHexColor(tapeFab.color) : '#8B4513';
              }
              if (item.layers === 2 && !imgSheer) {
                colorSheerValue = tapeColorValue;
              }
            }
          }

          let marginImg = item.marginBottom && item.marginBottom !== '-' ? appDB.marginImages?.[item.marginBottom] : null;
          if (item.marginBottom && item.marginBottom !== '-' && !marginImg && appDB.marginImages) {
            const marginKeys = Object.keys(appDB.marginImages);
            const foundKey = marginKeys.find(key =>
              item.marginBottom.includes(key) || key.includes(item.marginBottom) ||
              (item.marginBottom.includes('ลอย') && key.includes('ลอย')) ||
              (item.marginBottom.includes('พื้น') && key.includes('พื้น')) ||
              (item.marginBottom.includes('บัว') && key.includes('บัว'))
            );
            if (foundKey) marginImg = appDB.marginImages[foundKey];
          }

          const groupedAreas = getGroupedAreas(item);

          return (
            <div
              key={item.id}
              className={`ai-preview-page w-full relative transition-all ${
                isSelected ? 'opacity-100' : 'opacity-60 print-hidden-unselected'
              }`}
            >
              {/* Header Action Bar per Sheet (no-print) */}
              <div className="no-print flex flex-wrap items-center justify-between bg-white px-4 py-2 rounded-t-lg border-2 border-b-0 border-gray-800 gap-2">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => toggleSelect(item.id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-gray-800 hover:text-blue-600"
                  >
                    {isSelected ? (
                      <CheckSquare size={16} className="text-blue-600" />
                    ) : (
                      <Square size={16} className="text-gray-400" />
                    )}
                    <span>รายการที่ {index + 1}: {item.roomPos || 'ไม่ระบุห้อง'}</span>
                  </button>
                  {item.aiImage && (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-300">
                      <Check size={10} /> AI พร้อมแล้ว
                    </span>
                  )}
                </div>

                <div className="flex items-center flex-wrap gap-2 text-xs">
                  {/* View Mode Toggle */}
                  {item.aiImage && (
                    <div className="flex bg-gray-100 p-0.5 rounded border border-gray-300">
                      <button
                        onClick={() => setViewModes(prev => ({ ...prev, [item.id]: 'ai' }))}
                        className={`px-2.5 py-1 rounded font-bold transition-all ${
                          currentMode === 'ai' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        ✨ รูปจำลอง AI
                      </button>
                      <button
                        onClick={() => setViewModes(prev => ({ ...prev, [item.id]: 'original' }))}
                        className={`px-2.5 py-1 rounded font-bold transition-all ${
                          currentMode === 'original' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        📷 รูปต้นฉบับ
                      </button>
                      <button
                        onClick={() => setViewModes(prev => ({ ...prev, [item.id]: 'split' }))}
                        className={`px-2.5 py-1 rounded font-bold transition-all ${
                          currentMode === 'split' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        🔀 เทียบข้างกัน
                      </button>
                    </div>
                  )}

                  {/* Mask Coverage % Selector */}
                  <div className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200/80 border border-gray-300 rounded px-2 py-1 text-xs transition-colors">
                    <span className="text-gray-700 font-bold whitespace-nowrap">ระดับปิดม่าน:</span>
                    <select
                      value={primaryArea.maskPct !== undefined && primaryArea.maskPct !== null ? primaryArea.maskPct : 100}
                      onChange={(e) => handleUpdateMaskPct(item, parseInt(e.target.value))}
                      className="border border-gray-300 rounded bg-white px-1.5 py-0.5 text-xs font-bold text-indigo-700 outline-none cursor-pointer"
                      title="สัดส่วนความยาวผ้าที่ดึงลงมาตาม Mask (เช่น 40% = ดึงลงมา 40% จากบน, 100% = ปิดเต็มบาน)"
                    >
                      <option value={10}>10% (เปิดเกือบสุด)</option>
                      <option value={20}>20%</option>
                      <option value={25}>25%</option>
                      <option value={30}>30%</option>
                      <option value={40}>40% (ปิด 40%)</option>
                      <option value={50}>50% (ครึ่งบาน)</option>
                      <option value={60}>60%</option>
                      <option value={70}>70%</option>
                      <option value={80}>80%</option>
                      <option value={90}>90%</option>
                      <option value={100}>100% (ปิดเต็มบาน)</option>
                    </select>
                  </div>

                  {/* Generate / Regenerate button */}
                  <button
                    onClick={() => handleGenerate(item)}
                    disabled={isGenerating}
                    className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded font-bold shadow-sm transition-all disabled:opacity-50"
                  >
                    <Sparkles size={13} className={isGenerating ? 'animate-spin' : ''} />
                    {isGenerating ? 'กำลังสร้างภาพ...' : item.aiImage ? 'สร้างใหม่ (Regenerate)' : 'สร้างรูปด้วย AI'}
                  </button>

                  {/* Download AI Image */}
                  {item.aiImage && (
                    <button
                      onClick={() => downloadImage(item.aiImage!, `curtain-ai-${index + 1}.png`)}
                      className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded font-bold border border-gray-300 transition-colors"
                      title="ดาวน์โหลดเฉพาะรูป AI"
                    >
                      <Download size={13} /> โหลดรูป
                    </button>
                  )}


                </div>
              </div>

              {/* Exact Confirmation Form Sheet Border & Layout Matching image.png */}
              <div className="ai-preview-frame border-2 border-gray-800 p-1 rounded bg-white shadow-md">
                <div className="ai-preview-inner-grid border border-gray-300 flex flex-col lg:flex-row print:flex-row h-auto lg:h-[750px] bg-white relative overflow-hidden w-full box-border">
                  
                  {/* Left Column: 70% width */}
                  <div className="ai-preview-left-col w-full lg:w-[70%] min-h-[400px] h-[50vh] sm:h-[60vh] lg:h-full border-b lg:border-b-0 print:border-b-0 lg:border-r print:border-r border-gray-300 flex flex-col bg-white relative z-20">
                    
                    {/* Top 70-75%: On-site window image area (AI / Original / Compare) */}
                    <div className="flex-1 w-full border-b border-gray-300 flex flex-col relative bg-gray-900 shrink-0 overflow-hidden items-center justify-center">
                      {isGenerating ? (
                        <div className="flex flex-col items-center justify-center p-6 text-center text-white z-30">
                          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                          <h4 className="text-lg font-bold flex items-center gap-2 text-indigo-300">
                            <Sparkles className="animate-bounce" size={20} /> Gemini AI กำลังติดตั้งผ้าม่าน...
                          </h4>
                          <p className="text-xs text-gray-300 mt-2 max-w-sm">
                            กำลังคำนวณสเปก: {sMain1 || 'ผ้าม่าน'} (
                            {sMain1.includes('จีบ') ? '3 จีบ' : sMain1.includes('ลอน') ? 'Ripple Fold' : 'Custom'}
                            ) พร้อมแสงเงาและมุมกล้องของห้องจริง
                          </p>
                        </div>
                      ) : currentMode === 'split' && item.aiImage && originalPhotoUrl ? (
                        /* Split Side-by-Side Mode */
                        <div className="w-full h-full grid grid-cols-2 gap-1 p-1 bg-black">
                          <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-gray-950">
                            <span className="absolute top-2 left-2 bg-black/80 text-white px-2 py-0.5 rounded text-[10px] font-bold z-10 border border-gray-600">
                              📷 รูปหน้างานเดิม
                            </span>
                            <img src={originalPhotoUrl} alt="Original Window" className="w-full h-full object-contain" />
                          </div>
                          <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-gray-950">
                            <span className="absolute top-2 left-2 bg-indigo-600 text-white px-2 py-0.5 rounded text-[10px] font-bold z-10 flex items-center gap-1 shadow">
                              <Sparkles size={10} /> รูปจำลอง AI
                            </span>
                            <img src={item.aiImage} alt="AI Curtain" className="w-full h-full object-contain" />
                          </div>
                        </div>
                      ) : currentMode === 'ai' && item.aiImage ? (
                        /* Photorealistic AI Curtain Image */
                        <div className="relative w-full h-full flex items-center justify-center bg-black">
                          <img
                            src={item.aiImage}
                            alt="AI Realistic Curtain"
                            className="w-full h-full object-contain"
                          />
                          <div className="absolute top-3 left-3 bg-gradient-to-r from-indigo-900/90 to-purple-900/90 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg border border-indigo-400/40 flex items-center gap-1.5 no-print">
                            <Sparkles size={12} className="text-yellow-300" />
                            <span>ภาพจำลองผ้าม่าน AI (ตามสเปกใบงาน)</span>
                          </div>
                        </div>
                      ) : (
                        /* Original Photo View */
                        <div className="relative w-full h-full flex items-center justify-center bg-gray-950">
                          {originalPhotoUrl ? (
                            <>
                              <img
                                src={originalPhotoUrl}
                                alt="Original Window"
                                className="w-full h-full object-contain"
                              />
                              {!item.aiImage && !isGenerating && (
                                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-4 text-center no-print">
                                  <button
                                    onClick={() => handleGenerate(item)}
                                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl font-extrabold text-sm shadow-2xl flex items-center gap-2 transform hover:scale-105 transition-all border border-indigo-300/30"
                                  >
                                    <Sparkles size={18} className="text-yellow-300 animate-spin" />
                                    <span>กดสร้างภาพผ้าม่านด้วย AI สำหรับบานนี้</span>
                                  </button>
                                  <p className="text-xs text-indigo-100 mt-2 font-medium">
                                    AI จะคำนวณรูปแบบ {sMain1 || 'ผ้าม่าน'} ตามขนาดและสเปกของบานนี้โดยอัตโนมัติ
                                  </p>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-center text-gray-400 p-6 flex flex-col items-center">
                              <ImageIcon size={48} className="text-gray-600 mb-2" />
                              <span className="font-bold text-sm">ยังไม่มีรูปภาพหน้างาน</span>
                              <span className="text-xs text-gray-500 mt-1">
                                กรุณาเพิ่มรูปหน้างานในหน้าแก้ไขใบงานก่อน
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom 25-30%: The 4 Exact Info Cards matching image.png */}
                    <div className="ai-preview-cards-grid h-[25%] lg:h-[30%] min-h-[100px] w-full p-2 bg-gray-50 flex items-center overflow-x-auto">
                      <div className="w-full h-full min-w-[350px] md:min-w-[400px] grid grid-cols-4 gap-1.5 sm:gap-2 print:gap-4">
                        {/* Card 1: รูปแบบม่าน */}
                        <InfoCard
                          title="รูปแบบม่าน"
                          imgUrl={styleImg1}
                          text1={`${sMain1 || '-'} ${item.layers === 2 ? `/ ${sMain2 || '-'}` : ''}`}
                          fallbackType="style"
                        />

                        {/* Card 2: ผ้าม่านทึบ (Drapery) */}
                        <InfoCard
                          title={txtMain || 'ผ้าม่านทึบ (Drapery)'}
                          imgUrl={imgMain}
                          text1={colMain || '-'}
                          bgColor={colorMainValue}
                          fallbackType="fabric"
                        />

                        {/* Card 3: ผ้าม่านโปร่ง (Sheer) */}
                        <InfoCard
                          title={item.layers === 2 ? (txtSheer || 'ผ้าม่านโปร่ง (Sheer)') : 'ผ้าม่านโปร่ง (Sheer)'}
                          imgUrl={item.layers === 2 ? imgSheer : null}
                          text1={item.layers === 2 ? (colSheer || '-') : '-'}
                          isDim={item.layers === 1}
                          bgColor={item.layers === 2 ? colorSheerValue : ''}
                          fallbackType="sheer"
                        />

                        {/* Card 4: ระยะชายม่าน */}
                        <InfoCard
                          title="ระยะชายม่าน"
                          imgUrl={marginImg}
                          text1={item.marginBottom || '-'}
                          fallbackType="margin"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: 30% width matching image.png exactly */}
                  <div className="ai-preview-right-col w-full lg:w-[30%] text-xs flex flex-col bg-white overflow-y-auto print:overflow-hidden min-h-[400px] lg:h-full relative z-10 justify-start">
                    
                    {/* Room Header */}
                    <div className="bg-gray-800 text-white p-3 print:bg-white print:text-black print:p-3 print:pb-0 flex flex-col shrink-0">
                      <div className="w-full text-[16px] font-bold leading-tight text-yellow-300 print:text-black whitespace-pre-wrap border-b border-gray-700 print:border-gray-800 pb-2 mb-1">
                        {item.roomPos || 'โถงทางเดิน / ไม่ระบุห้อง'}
                      </div>
                    </div>

                    <div className="p-3 print:p-2 flex flex-col justify-between gap-4 print:gap-1.5 h-full flex-1 overflow-hidden">
                      
                      {/* รูปแบบและขนาดม่าน */}
                      <div className="w-full">
                        <span className="font-bold text-gray-900 text-[14px] border-b border-gray-800 pb-1 mb-2 block">
                          รูปแบบและขนาดม่าน
                        </span>
                        {groupedAreas.length > 0 ? (
                          groupedAreas.map((grp: any, gIdx: number) => (
                            <div key={gIdx} className="mb-2.5 pl-2.5 border-l-[3px] border-gray-800">
                              <span className="font-bold text-black text-[13px] block mb-0.5">
                                {formatBaanLabel(grp.labelNums, item.areas?.length || 1)} : <span className="font-normal">ก:{grp.w} ส:{grp.h}</span>
                              </span>
                              <div className="text-[12px] leading-snug">
                                <span className="text-gray-800 block">
                                  <span className="font-bold">ชั้นที่ 1:</span> {grp.s1} {grp.a1 !== '-' ? `/ ${grp.a1}` : ''}
                                </span>
                                {item.layers === 2 && (
                                  <span className="text-gray-800 block mt-0.5">
                                    <span className="font-bold">ชั้นที่ 2:</span> {grp.s2} {grp.a2 !== '-' ? `/ ${grp.a2}` : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-500 text-xs italic pl-2 border-l-[3px] border-gray-300">
                            บานที่ 1 : ก:- ส:- (ชั้นที่ 1: {sMain1 || '-'})
                          </div>
                        )}
                      </div>

                      {/* รางม่าน */}
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 text-[14px] border-b border-gray-300 pb-1 mb-1">
                          รางม่าน
                        </span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {item.tracks && item.tracks.length > 0 ? (
                            item.tracks.map(tStr => (
                              <span
                                key={tStr}
                                className="bg-gray-100 px-2.5 py-0.5 rounded border border-gray-300 text-[12px] font-bold text-gray-800 shadow-sm"
                              >
                                {tStr}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 italic text-xs">-</span>
                          )}
                        </div>
                      </div>

                      {/* ขาจับราง & การแขวน */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 text-[14px] border-b border-gray-300 pb-1 mb-1">
                            ขาจับราง
                          </span>
                          <div className="text-[13px] font-bold text-gray-800 mt-0.5">
                            {item.bracket || '-'}
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 text-[14px] border-b border-gray-300 pb-1 mb-1">
                            การแขวน
                          </span>
                          <div className="text-[13px] font-bold text-gray-800 mt-0.5">
                            {item.hangStyle || '-'}
                          </div>
                        </div>
                      </div>

                      {/* อุปกรณ์เสริม */}
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 text-[14px] border-b border-gray-300 pb-1 mb-1">
                          อุปกรณ์เสริม
                        </span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {item.accessories && item.accessories.length > 0 ? (
                            item.accessories.map(tStr => (
                              <span
                                key={tStr}
                                className="bg-gray-100 px-2.5 py-0.5 rounded border border-gray-300 text-[12px] font-bold text-gray-800 shadow-sm"
                              >
                                {tStr}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 italic text-xs">-</span>
                          )}
                        </div>
                      </div>

                      {/* ระยะการเผื่อม่าน */}
                      <div className="border border-gray-300 p-2 rounded bg-gray-50/50">
                        <span className="font-bold text-gray-900 block mb-1.5 border-b border-gray-300 pb-1 text-[14px]">
                          ระยะการเผื่อม่าน
                        </span>
                        <div className="grid grid-cols-2 gap-y-2 text-[12px]">
                          <div>
                            <span className="text-gray-500 font-bold block">ด้านซ้าย:</span>
                            <span className="font-bold text-gray-800">{item.marginLeft || item.customMarginLeft || '-'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 font-bold block">ด้านขวา:</span>
                            <span className="font-bold text-gray-800">{item.marginRight || item.customMarginRight || '-'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 font-bold block">ด้านบน:</span>
                            <span className="font-bold text-gray-800">{item.marginTop || item.customMarginTop || '-'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 font-bold block">ด้านล่าง:</span>
                            <span className="font-bold text-gray-800">{item.marginBottom || item.customMarginBottom || '-'}</span>
                          </div>
                        </div>
                      </div>

                      {/* หมายเหตุ */}
                      <div className="flex flex-col pt-2 border-t border-gray-300 shrink-0 mt-auto">
                        <span className="font-bold text-red-600 print:text-gray-800 text-[14px] mb-1">
                          หมายเหตุ
                        </span>
                        <div className="w-full text-[13px] leading-relaxed whitespace-pre-wrap font-bold text-red-600">
                          {item.note || '-'}
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              </div>

              {/* Image Version History Gallery */}
              {item.aiImages && item.aiImages.length > 0 && (
                <div className="mt-4 p-3.5 bg-gray-50 border border-gray-200 rounded-xl no-print">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-indigo-600" />
                        ประวัติภาพที่เคยเจนในชุดนี้ ({item.aiImages.length} ภาพ)
                      </span>
                      <span className="text-[11px] text-gray-500">
                        • คลิกที่รูปเพื่อสลับดูภาพเดิม หรือเลือกให้เป็นภาพหลักในใบงาน
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      ✓ บันทึกภาพทุกเวอร์ชัน ปลอดภัยภาพเก่าไม่หาย
                    </span>
                  </div>

                  <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1">
                    {item.aiImages.map((imgUrl, vIdx) => {
                      const isCurrent = item.aiImage === imgUrl;
                      const versionNum = item.aiImages!.length - vIdx;
                      return (
                        <div
                          key={imgUrl + vIdx}
                          onClick={() => handleSelectVersion(item, imgUrl)}
                          className={`relative group shrink-0 w-28 h-20 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                            isCurrent
                              ? 'border-indigo-600 ring-2 ring-indigo-400 shadow-md scale-105'
                              : 'border-gray-300 hover:border-indigo-400 opacity-75 hover:opacity-100 hover:scale-[1.02]'
                          }`}
                          title={`เวอร์ชัน ${versionNum}: คลิกเพื่อแสดงภาพนี้`}
                        >
                          <img
                            src={imgUrl}
                            alt={`Version ${versionNum}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-90 flex items-end justify-between p-1.5 pointer-events-none">
                            <span className="text-[10px] text-white font-bold drop-shadow">
                              V.{versionNum}
                            </span>
                            {item.aiImages!.length > 1 && (
                              <button
                                onClick={(e) => handleDeleteVersion(item, imgUrl, e)}
                                className="pointer-events-auto text-red-300 hover:text-red-100 bg-black/60 hover:bg-red-600 rounded p-1 transition-colors"
                                title="ลบเฉพาะภาพนี้ออกจากประวัติ"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                          {isCurrent && (
                            <span className="absolute top-1 left-1 bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                              กำลังแสดง
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Admin Monthly Quota Configuration Modal */}
      {showQuotaModal && (
        <div className="fixed inset-0 bg-black/60 z-[999999] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 bg-purple-50 border-b border-purple-100">
              <h3 className="text-lg font-bold text-purple-900 flex items-center gap-2">
                <Sliders size={18} /> กำหนด Limit การ Generate รูปของพนักงาน
              </h3>
              <button
                onClick={() => setShowQuotaModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
              <p className="text-xs text-gray-600">
                ระบบคำนวณโควต้าและรีเซ็ตการนับรอบใหม่ทุกวันที่ 1 ของแต่ละเดือนตามกำหนด
              </p>

              {/* Default monthly limit */}
              <div className="bg-purple-50/70 p-3.5 rounded-lg border border-purple-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-purple-950 text-sm">โควต้าพื้นฐานเริ่มต้น (ครั้ง/เดือน)</span>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={defaultLimit}
                    onChange={e => setDefaultLimit(parseInt(e.target.value) || 20)}
                    className="w-20 border border-purple-300 rounded px-2 py-1 text-center font-bold text-sm bg-white"
                  />
                </div>
                <button
                  onClick={() => handleSaveAdminLimit('__default__', defaultLimit)}
                  disabled={savingLimit}
                  className="mt-2 text-xs bg-purple-600 text-white font-bold px-3 py-1 rounded hover:bg-purple-700"
                >
                  บันทึกค่าเริ่มต้น
                </button>
              </div>

              {/* Specific user limit list */}
              <div className="flex flex-col gap-2">
                <span className="font-bold text-gray-800 text-sm">กำหนดรายบุคคล:</span>
                {allAccounts && allAccounts.length > 0 ? (
                  allAccounts.map(acc => {
                    const currentL = adminLimits[acc.username] ?? defaultLimit;
                    return (
                      <div
                        key={acc.id || acc.username}
                        className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div>
                          <span className="font-bold text-gray-800 text-sm block">
                            {acc.name || acc.username}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            Username: {acc.username} {acc.role === 'admin' ? '(Admin)' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={1000}
                            defaultValue={currentL}
                            id={`user-limit-${acc.username}`}
                            className="w-20 border border-gray-300 rounded px-2 py-1 text-center font-bold text-sm bg-white"
                          />
                          <button
                            onClick={() => {
                              const inp = document.getElementById(`user-limit-${acc.username}`) as HTMLInputElement;
                              if (inp) {
                                handleSaveAdminLimit(acc.username, parseInt(inp.value) || defaultLimit);
                              }
                            }}
                            disabled={savingLimit}
                            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2.5 py-1 rounded shadow-sm"
                          >
                            บันทึก
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-gray-400 text-xs italic">ไม่มีรายชื่อพนักงาน</div>
                )}
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowQuotaModal(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-4 py-2 rounded-lg text-sm"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Menu on Right Side */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-4 no-print z-[9999] items-end">
        {(onUndo || onRedo) && (
          <div className="flex flex-col items-center bg-gray-800 rounded-full p-1.5 shadow-xl border-2 border-white mb-1 w-[56px] opacity-95">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`py-2.5 px-0 rounded-full transition-all flex items-center justify-center w-full h-[38px] ${!canUndo ? 'text-gray-500 cursor-not-allowed' : 'text-white hover:bg-gray-700'}`}
              title="เลิกทำ (Undo)"
            >
              <Undo size={20} />
            </button>
            <div className="w-8 h-px bg-gray-600 my-0.5"></div>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`py-2.5 px-0 rounded-full transition-all flex items-center justify-center w-full h-[38px] ${!canRedo ? 'text-gray-500 cursor-not-allowed' : 'text-white hover:bg-gray-700'}`}
              title="ทำซ้ำ (Redo)"
            >
              <Redo size={20} />
            </button>
          </div>
        )}

        {/* Back to Editor button */}
        <button
          onClick={onBack}
          className="group relative bg-gray-800 hover:bg-gray-900 text-white rounded-full p-4 shadow-xl flex items-center justify-center transition-transform hover:scale-110 border-2 border-white w-14 h-14"
          title="กลับหน้าแก้ไขแบบร่าง"
        >
          <ArrowLeft size={24} />
          <span className="absolute right-[110%] bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity mr-2">
            กลับหน้าแก้ไข
          </span>
        </button>

        {/* Save button */}
        {onSave && (
          <button
            onClick={onSave}
            disabled={isSaving}
            className={`group relative ${isSaving ? 'bg-gray-500' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-full p-4 shadow-xl flex items-center justify-center transition-transform hover:scale-110 border-2 border-white w-14 h-14`}
            title="บันทึกงาน"
          >
            <Save size={24} />
            <span className="absolute right-[110%] bg-indigo-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity mr-2">
              บันทึกงาน
            </span>
            {saveStatus && (
              <span className="absolute right-[110%] mr-2 bg-green-600 text-white px-3 py-1.5 rounded text-sm font-bold whitespace-nowrap shadow-lg">
                {saveStatus}
              </span>
            )}
          </button>
        )}

        {/* Share PDF button */}
        {onSharePDF && (
          <button
            onClick={onSharePDF}
            className="group relative bg-orange-500 hover:bg-orange-600 text-white rounded-full p-4 shadow-xl flex items-center justify-center transition-transform hover:scale-110 border-2 border-white w-14 h-14"
            title="แชร์เป็น PDF (แนวนอน)"
          >
            <Share2 size={24} />
            <span className="absolute right-[110%] bg-orange-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity mr-2">
              แชร์ PDF
            </span>
          </button>
        )}

        {/* Print button */}
        <button
          onClick={onPrint || (() => window.print())}
          className="group relative bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-xl flex items-center justify-center transition-transform hover:scale-110 border-2 border-white w-14 h-14"
          title="พิมพ์เอกสาร"
        >
          <Printer size={24} />
          <span className="absolute right-[110%] bg-blue-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity mr-2">
            พิมพ์
          </span>
        </button>
      </div>
    </div>
  );
};
