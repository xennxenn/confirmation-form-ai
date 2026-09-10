import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Settings, Plus, Trash2, Upload, Move, X, MousePointerClick } from 'lucide-react';
import { optImg, processImageFile, uploadImageToCloudinary } from '../utils';
import { PRESET_COLORS, ACCEPTED_IMAGE_FORMATS } from '../types';

interface ImageAreaEditorProps {
  item: any;
  appDB: any;
  handleItemChange: (id: string, field: string, value: any) => void;
  setDialog: (dialog: any) => void;
  idPrefix?: string;
  generalInfo?: any;
}

const CanvasMaskedLayer: React.FC<{
  maskUrl: string;
  fabricUrl: string | null;
  finalColor: string;
  x: number;
  y: number;
  width: number;
  height: number;
  maskOpacity?: number;
  styleMain1?: string;
  isBlinds?: boolean;
}> = ({ maskUrl, fabricUrl, finalColor, x, y, width, height, maskOpacity = 1, styleMain1 = '', isBlinds = false }) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!width || !height) return;
    const canvas = document.createElement('canvas');
    const maxDim = 1200;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    const cw = width * scale;
    const ch = height * scale;
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loadImg = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(img);
      img.src = src;
    });

    const render = async () => {
      try {
        const maskImg = await loadImg(maskUrl);
        let fabImg: HTMLImageElement | null = null;
        if (fabricUrl) fabImg = await loadImg(fabricUrl);
        if (!active) return;

        ctx.drawImage(maskImg, 0, 0, cw, ch);
        ctx.globalCompositeOperation = 'source-in';
        
        if (finalColor) {
          ctx.fillStyle = finalColor;
          ctx.fillRect(0, 0, cw, ch);
        }

        if (fabImg && fabImg.width > 0) {
          const pat = ctx.createPattern(fabImg, 'repeat');
          if (pat) {
            const scaleX = (200 * scale) / fabImg.width;
            const scaleY = (200 * scale) / fabImg.height;
            const matrix = new DOMMatrix().translate(-x * scale, -y * scale).scale(scaleX, scaleY);
            pat.setTransform(matrix);
            ctx.fillStyle = pat;
            ctx.fillRect(0, 0, cw, ch);
          }
        }

        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = maskOpacity;
        ctx.drawImage(maskImg, 0, 0, cw, ch);

        if (styleMain1.includes('มู่ลี่')) {
          ctx.globalCompositeOperation = 'screen';
          ctx.globalAlpha = 0.15;
          ctx.drawImage(maskImg, 0, 0, cw, ch);
        }

        setDataUrl(canvas.toDataURL('image/png'));
      } catch (e) {
        console.error("Canvas Mask render error", e);
      }
    };
    render();
    return () => { active = false; };
  }, [maskUrl, fabricUrl, finalColor, width, height, maskOpacity, styleMain1, isBlinds, x, y]);

  if (!dataUrl) return null;
  return <image href={dataUrl} x={x} y={y} width={width} height={height} preserveAspectRatio="none" />;
};

export const ImageAreaEditor: React.FC<ImageAreaEditorProps> = React.memo(({ 
  item, 
  appDB, 
  handleItemChange, 
  setDialog, 
  idPrefix = 'editor',
  generalInfo
}) => {
  const [activeAreaId, setActiveAreaId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Default to hidden (false) on entry, as per user request
  const [showControls, setShowControls] = useState(false);
  
  const [mode, setMode] = useState<'draw' | 'pan'>('draw'); 
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<any>(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null); 
  const [pointDrag, setPointDrag] = useState<{ areaId: string; pIdx: number } | null>(null); 
  const [panelPos, setPanelPos] = useState(() => {
    if (typeof window !== 'undefined') {
      return {
        x: window.innerWidth > 1024 ? window.innerWidth - 360 : 20,
        y: 120
      };
    }
    return { x: 20, y: 80 };
  });
  const [draggingPanel, setDraggingPanel] = useState(false);
  const [panelDragStart, setPanelDragStart] = useState({ x: 0, y: 0 });
  const [edgeMenu, setEdgeMenu] = useState<{
    x: number;
    y: number;
    areaId: string;
    segmentIndex: number;
  } | null>(null);
  const [isUploadingObj, setIsUploadingObj] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgNativeSize, setImgNativeSize] = useState<{ w: number; h: number } | null>(null);
  const [containerStyle, setContainerStyle] = useState({ width: '100%', height: '100%' });
  const displayImage = item.originalImage || item.image;

  useEffect(() => {
    const updateSize = () => {
      if (!viewportRef.current || !imgNativeSize) return;
      const vw = viewportRef.current.clientWidth;
      const vh = viewportRef.current.clientHeight;
      const { w: natW, h: natH } = imgNativeSize;
      if (natW === 0 || natH === 0 || vw === 0 || vh === 0) return;

      const ri = natW / natH;
      const rc = vw / vh;
      let finalW, finalH;

      const currentFit = item.imageFit || 'fit';
      if (currentFit === 'fill') {
          if (ri > rc) { finalH = vh; finalW = vh * ri; } 
          else { finalW = vw; finalH = vw / ri; }
      } else { 
          if (ri > rc) { finalW = vw; finalH = vw / ri; } 
          else { finalH = vh; finalW = vh * ri; }
      }

      setContainerStyle({ width: `${finalW}px`, height: `${finalH}px` });
      
      if (containerRef.current) {
          containerRef.current.style.width = `${finalW}px`;
          containerRef.current.style.height = `${finalH}px`;
      }
    };

    updateSize();
    let ro: ResizeObserver | undefined;
    if (viewportRef.current && window.ResizeObserver) {
        ro = new ResizeObserver(updateSize);
        ro.observe(viewportRef.current);
    }

    window.addEventListener('beforeprint', updateSize);

    return () => {
        if (ro) ro.disconnect();
        window.removeEventListener('beforeprint', updateSize);
    };
  }, [imgNativeSize, item.imageFit]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (!displayImage) return;
      if (mode === 'pan') {
          e.preventDefault(); 
          const zoomFactor = -e.deltaY * 0.005;
          setZoom(z => Math.max(0.2, Math.min(10, z + zoomFactor)));
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [displayImage, mode]);

  useEffect(() => {
    if (displayImage && imgRef.current) {
      if (imgRef.current.complete && imgRef.current.naturalWidth > 0) {
        setImgNativeSize({ w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight });
      }
    }
  }, [displayImage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawing && activeAreaId) {
        handleItemChange(item.id, 'areas', item.areas.map((a: any) => a.id === activeAreaId ? { ...a, points: [] } : a));
        setIsDrawing(false);
        setCursorPos(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawing, activeAreaId, item.areas, item.id, handleItemChange]);

  const getPctFromEvent = useCallback((e: any) => {
      if (!containerRef.current || !imgNativeSize) return null;
      let clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
      let clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;
      
      const rect = containerRef.current.getBoundingClientRect();
      return { 
          xPct: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
          yPct: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
      };
  }, [imgNativeSize]);

  useEffect(() => {
    const handleGlobalPointMove = (e: MouseEvent | TouchEvent) => {
      if (!pointDrag) return;
      const pos = getPctFromEvent(e);
      if (!pos) return;

      handleItemChange(item.id, 'areas', item.areas.map((a: any) => {
        if (a.id === pointDrag.areaId) {
          const newPts = [...a.points];
          newPts[pointDrag.pIdx] = { x: pos.xPct, y: pos.yPct };
          return { ...a, points: newPts };
        }
        return a;
      }));
    };
    const handleGlobalPointUp = () => setPointDrag(null);

    if (pointDrag) {
      window.addEventListener('mousemove', handleGlobalPointMove);
      window.addEventListener('touchmove', handleGlobalPointMove, { passive: false });
      window.addEventListener('mouseup', handleGlobalPointUp);
      window.addEventListener('touchend', handleGlobalPointUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalPointMove);
      window.removeEventListener('touchmove', handleGlobalPointMove);
      window.removeEventListener('mouseup', handleGlobalPointUp);
      window.removeEventListener('touchmove', handleGlobalPointUp);
    }
  }, [pointDrag, zoom, pan, item.imageFit, imgNativeSize, item.areas, item.id, handleItemChange, getPctFromEvent]);

  useEffect(() => {
    const handleGlobalPanelMove = (e: MouseEvent | TouchEvent) => {
      if (draggingPanel) {
        let clientX = e instanceof MouseEvent ? e.clientX : (e.touches?.[0]?.clientX ?? 0);
        let clientY = e instanceof MouseEvent ? e.clientY : (e.touches?.[0]?.clientY ?? 0);

        let newX = clientX - panelDragStart.x;
        let newY = clientY - panelDragStart.y;
        
        // Ensure the panel doesn't go off-screen easily
        newX = Math.max(10, Math.min(newX, window.innerWidth - 350));
        newY = Math.max(10, Math.min(newY, window.innerHeight - 450));
        setPanelPos({ x: newX, y: newY });
      }
    };
    const handleGlobalPanelUp = () => setDraggingPanel(false);

    if (draggingPanel) {
      window.addEventListener('mousemove', handleGlobalPanelMove);
      window.addEventListener('touchmove', handleGlobalPanelMove, { passive: false });
      window.addEventListener('mouseup', handleGlobalPanelUp);
      window.addEventListener('touchend', handleGlobalPanelUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalPanelMove);
      window.removeEventListener('touchmove', handleGlobalPanelMove);
      window.removeEventListener('mouseup', handleGlobalPanelUp);
      window.removeEventListener('touchend', handleGlobalPanelUp);
    }
  }, [draggingPanel, panelDragStart]);

  const onPanelMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    let clientX = e.nativeEvent instanceof MouseEvent ? e.nativeEvent.clientX : (e.nativeEvent as TouchEvent).touches?.[0]?.clientX ?? 0;
    let clientY = e.nativeEvent instanceof MouseEvent ? e.nativeEvent.clientY : (e.nativeEvent as TouchEvent).touches?.[0]?.clientY ?? 0;
    setDraggingPanel(true);
    setPanelDragStart({ x: clientX - panelPos.x, y: clientY - panelPos.y });
  };

  const handleAddArea = () => {
    const newAreaId = Date.now().toString() + '_a' + (item.areas.length + 1);
    const newArea = { 
      id: newAreaId, points: [], width: '', height: '', 
      lineColor: '#EF4444', lineWidth: 2, fabrics: [], layers: 2,
      labelColor: '#EF4444', labelSize: 14, wPos: 'top', hPos: 'right',
      maskType: '', maskPct: 20, maskOpacity: 87, styleMain1: '', styleAction1: '', styleMain2: '', styleAction2: ''
    };
    handleItemChange(item.id, 'areas', [...item.areas, newArea]);
    setActiveAreaId(newAreaId);
    setIsDrawing(true);
    setMode('draw');
  };

  const handleRemoveArea = (areaId: string) => {
    handleItemChange(item.id, 'areas', item.areas.filter((a: any) => a.id !== areaId));
    if (activeAreaId === areaId) { setActiveAreaId(null); setIsDrawing(false); }
  };

  const handleUpdateArea = (areaId: string, field: string, value: any) => handleItemChange(item.id, 'areas', item.areas.map((a: any) => a.id === areaId ? { ...a, [field]: value } : a));

  const handleSetEdgeType = (areaId: string, segmentIndex: number, type: 'top' | 'bottom' | 'left' | 'right' | null) => {
    const area = item.areas.find((a: any) => a.id === areaId);
    if (!area) return;
    const currentEdgeTypes = { ...(area.edgeTypes || {}) };
    if (type === null) {
      delete currentEdgeTypes[segmentIndex];
    } else {
      // Clear any existing assignment of the same type in this area
      Object.keys(currentEdgeTypes).forEach(k => {
        if (currentEdgeTypes[k] === type) {
          delete currentEdgeTypes[k];
        }
      });
      currentEdgeTypes[segmentIndex] = type;
    }
    handleUpdateArea(areaId, 'edgeTypes', currentEdgeTypes);
    setEdgeMenu(null);
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => { 
    setEdgeMenu(null);
    let clientX = e.nativeEvent instanceof MouseEvent ? e.nativeEvent.clientX : (e.nativeEvent as TouchEvent).touches?.[0]?.clientX ?? 0;
    let clientY = e.nativeEvent instanceof MouseEvent ? e.nativeEvent.clientY : (e.nativeEvent as TouchEvent).touches?.[0]?.clientY ?? 0;
    if (mode === 'pan') {
       setIsPanning({ startX: clientX, startY: clientY, startPanX: pan.x, startPanY: pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    let clientX = e.nativeEvent instanceof MouseEvent ? e.nativeEvent.clientX : (e.nativeEvent as TouchEvent).touches?.[0]?.clientX ?? 0;
    let clientY = e.nativeEvent instanceof MouseEvent ? e.nativeEvent.clientY : (e.nativeEvent as TouchEvent).touches?.[0]?.clientY ?? 0;
    
    if (mode === 'pan' && isPanning) { 
        if (e.cancelable) e.preventDefault();
        
        const dx = clientX - isPanning.startX;
        const dy = clientY - isPanning.startY;
        
        if (containerRef.current) {
            const baseW = containerRef.current.offsetWidth;
            const baseH = containerRef.current.offsetHeight;
            const panX = isPanning.startPanX + ((dx / zoom) / baseW) * 100;
            const panY = isPanning.startPanY + ((dy / zoom) / baseH) * 100;
            setPan({ x: panX, y: panY }); 
        }
        return; 
    }
    
    if (mode === 'draw' && activeAreaId && isDrawing) {
        if (e.cancelable) e.preventDefault();
        const pos = getPctFromEvent(e);
        if (pos && !pointDrag && !isPanning) setCursorPos({ x: pos.xPct, y: pos.yPct });
        else setCursorPos(null);
    }
  };

  const handleMouseUp = () => setIsPanning(false);
  const handleMouseLeave = () => { setIsPanning(false); setCursorPos(null); };

  const handleContentClick = (e: React.MouseEvent) => {
    if (mode !== 'draw' || !activeAreaId || !isDrawing || pointDrag || isPanning || draggingPanel) return;
    const pos = getPctFromEvent(e);
    if (!pos) return;
    const area = item.areas.find((a: any) => a.id === activeAreaId);
    if (area && area.points.length > 0) {
      const lastPt = area.points[area.points.length - 1];
      if (Math.hypot(lastPt.x - pos.xPct, lastPt.y - pos.yPct) < 1) return; 
    }
    handleItemChange(item.id, 'areas', item.areas.map((a: any) => a.id === activeAreaId ? { ...a, points: [...a.points, { x: pos.xPct, y: pos.yPct }] } : a));
  };

  const handlePointMouseDown = (e: React.MouseEvent | React.TouchEvent, areaId: string, pIdx: number) => { 
    e.stopPropagation(); 
    setActiveAreaId(areaId); 
    const matchingArea = item.areas.find((a: any) => a.id === areaId);
    if (isDrawing && pIdx === 0 && matchingArea && matchingArea.points.length > 2) {
      setIsDrawing(false); setCursorPos(null); return;
    }
    setPointDrag({ areaId, pIdx }); 
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingObj(true);
      const compressedDataUrl = await processImageFile(file, 1024, 0.7, setDialog);
      if (compressedDataUrl) {
         try {
             const url = await uploadImageToCloudinary(compressedDataUrl);
             if (url) {
               handleItemChange(item.id, 'image', url);
               handleItemChange(item.id, 'originalImage', url);
               setShowControls(true);
             } else setDialog({ type: 'alert', message: 'อัปโหลดรูปล้มเหลว' });
         } catch (err) { setDialog({ type: 'alert', message: 'ระบบขัดข้อง กรุณาลองใหม่' }); }
      }
      setIsUploadingObj(false);
    }
  };

  const activeArea = item.areas.find((a: any) => a.id === activeAreaId);

  const pixelW = containerStyle.width.includes('px') ? parseFloat(containerStyle.width) : 800;
  const pixelH = containerStyle.height.includes('px') ? parseFloat(containerStyle.height) : 600;

  return (
    <div ref={wrapperRef} className="flex flex-col w-full h-full relative border-b md:border-b-0 print:border-b-0 border-gray-300 bg-white">
      <div 
        ref={viewportRef}
        className={`relative w-full flex-grow overflow-hidden flex items-center justify-center ${(item.imageFit || 'fit') === 'fit' ? 'bg-white' : 'bg-gray-100'} ${mode === 'pan' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : (activeAreaId && isDrawing ? 'cursor-crosshair' : 'cursor-default')}`}
        style={{ touchAction: 'none', clipPath: 'inset(0)', contain: 'paint' }}
        onMouseDown={handleMouseDown} onTouchStart={handleMouseDown}
        onMouseMove={handleMouseMove} onTouchMove={handleMouseMove}
        onMouseUp={handleMouseUp} onTouchEnd={handleMouseUp}
        onMouseLeave={handleMouseLeave} onClick={handleContentClick}
      >
        {displayImage ? (
          <>
            <div
              style={{
                 position: 'absolute',
                 inset: 0,
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 transform: `translate(${pan.x}%, ${pan.y}%) scale(${zoom})`,
                 transformOrigin: 'center',
                 transition: isPanning ? 'none' : 'transform 0.05s ease-out'
              }}
            >
              <div 
                  ref={containerRef}
                  style={{
                      position: 'relative',
                      flexShrink: 0,
                      width: containerStyle.width,
                      height: containerStyle.height,
                      '--aspect-ratio': imgNativeSize ? `${imgNativeSize.w} / ${imgNativeSize.h}` : (item.imageWidth && item.imageHeight ? `${item.imageWidth} / ${item.imageHeight}` : 'auto')
                  } as React.CSSProperties}
                  className={`shadow-sm print-fit-container print-fit-container-${item.imageFit || 'fit'}`}
              >
                <img 
                    ref={imgRef}
                    src={optImg(displayImage, 1600)} 
                    alt="Window view" 
                    style={{ width: '100%', height: '100%', display: 'block', objectFit: 'fill' }}
                    className="absolute inset-0 pointer-events-none" 
                    onLoad={e => {
                      const img = e.target as HTMLImageElement;
                      setImgNativeSize({ w: img.naturalWidth, h: img.naturalHeight });
                    }}
                    referrerPolicy="no-referrer"
                />
                
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${pixelW} ${pixelH}`} preserveAspectRatio="none" style={{ top: 0, left: 0 }}>
                  <defs>
                    <filter id={`alpha-to-white-${idPrefix}`}>
                      <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0" />
                    </filter>
                    <linearGradient id={`blinds-horiz-grad-${idPrefix}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity={0.28} />
                      <stop offset="15%" stopColor="#ffffff" stopOpacity={0.08} />
                      <stop offset="70%" stopColor="#000000" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#000000" stopOpacity={0.48} />
                    </linearGradient>
                    <linearGradient id={`blinds-vert-grad-${idPrefix}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#000000" stopOpacity={0.48} />
                      <stop offset="12%" stopColor="#000000" stopOpacity={0.15} />
                      <stop offset="50%" stopColor="#ffffff" stopOpacity={0.15} />
                      <stop offset="85%" stopColor="#000000" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#000000" stopOpacity={0.45} />
                    </linearGradient>
                    {item.areas.map((area: any) => {
                        const clipId = `clip-${idPrefix}-${item.id}-${area.id}`;
                        const patId = `pat-${idPrefix}-${item.id}-${area.id}`;
                        
                        // Uses outer pixelW and pixelH from component scope

                        // Find first fabric with fallback to the first area in the item that has fabrics
                        let fab1 = area.fabrics?.[0];
                        if (!fab1) {
                          const firstAreaWithFabric = item.areas.find((a: any) => a.fabrics && a.fabrics.length > 0);
                          if (firstAreaWithFabric) {
                            fab1 = firstAreaWithFabric.fabrics[0];
                          }
                        }

                        let fabricImg = null;
                        if (fab1) {
                          if (fab1.image) {
                            fabricImg = fab1.image;
                          } else if (fab1.mainType === 'ผ้านอกระบบ (เฉพาะงานนี้)' && generalInfo) {
                            fabricImg = (generalInfo.customFabrics || []).find((f: any) => f.subType === fab1.subType && f.name === fab1.name && f.color === fab1.color)?.image;
                          } else if (appDB?.curtainTypes) {
                            fabricImg = appDB.curtainTypes[fab1.mainType]?.[fab1.subType]?.[fab1.name]?.[fab1.color];
                          }
                        }

                        const styleMain1 = area.styleMain1 || item.styleMain1 || item.styleMain || '';
                        const isBlindsHoriz = styleMain1.includes('มู่ลี่');
                        const isBlindsVert = styleMain1.includes('ม่านปรับแสง');
                        const isRollerBlind = styleMain1.includes('ม่านม้วน');
                        const patternScale = (area.patternScale || 100) / 100;
                        const patSize = (isRollerBlind ? (80 / 50) : 80) * patternScale;

                        const horizPatId = `blinds-horiz-${idPrefix}-${item.id}-${area.id}`;
                        const vertPatId = `blinds-vert-${idPrefix}-${item.id}-${area.id}`;

                        // Calculate dynamic slat size
                        const slatSize = area.blindsSlatSize || (isBlindsHoriz ? 14 : 36);
                        const horizSlatH = isBlindsHoriz ? slatSize : 14;
                        const horizSlatW = horizSlatH * 8;
                        const vertSlatW = isBlindsVert ? slatSize : 36;
                        const vertSlatH = vertSlatW * 1.1;

                        const tapeW = horizSlatH * 1.2;

                        // Calculate tilt angle based on the top edge of the curtain area
                        let blindsAngle = area.blindsAngle !== undefined ? area.blindsAngle : 0;
                        const autoTilt = area.autoTilt !== false;
                        
                        if (autoTilt && area.points && area.points.length >= 2) {
                          let edges: any[] = [];
                          for (let i = 0; i < area.points.length; i++) {
                            let p1 = area.points[i];
                            let p2 = area.points[(i + 1) % area.points.length];
                            edges.push({ p1, p2, midY: (p1.y + p2.y) / 2, dx: p2.x - p1.x, dy: p2.y - p1.y });
                          }
                          if (edges.length > 0) {
                            let tEdge = edges.reduce((prev, curr) => prev.midY < curr.midY ? prev : curr);
                            if (tEdge && (tEdge.dx !== 0 || tEdge.dy !== 0)) {
                              const rectW = pixelW;
                              const rectH = pixelH;
                              const pxDx = tEdge.dx * (rectW / 100);
                              const pxDy = tEdge.dy * (rectH / 100);
                              let ang = Math.atan2(pxDy, pxDx) * (180 / Math.PI);
                              if (ang > 90) ang -= 180;
                              if (ang < -90) ang += 180;
                              blindsAngle = ang;
                            }
                          }
                        }

                        return (
                          <React.Fragment key={area.id}>
                            <clipPath id={clipId}>
                              <polygon points={area.points.map((p: any) => `${(p.x * pixelW) / 100},${(p.y * pixelH) / 100}`).join(' ')} />
                            </clipPath>
                            {area.fabrics?.map((fab: any, fIdx: number) => {
                              const fPatId = `pat-${idPrefix}-${item.id}-${area.id}-${fIdx}`;
                              let fImg = null;
                              if (fab.image) {
                                fImg = fab.image;
                              } else if (fab.mainType === 'ผ้านอกระบบ (เฉพาะงานนี้)' && generalInfo) {
                                fImg = (generalInfo.customFabrics || []).find((f: any) => f.subType === fab.subType && f.name === fab.name && f.color === fab.color)?.image;
                              } else if (appDB?.curtainTypes) {
                                fImg = appDB.curtainTypes[fab.mainType]?.[fab.subType]?.[fab.name]?.[fab.color];
                              }
                              if (!fImg) return null;
                              return (
                                <pattern key={fPatId} id={fPatId} patternUnits="userSpaceOnUse" width={patSize} height={patSize}>
                                  <image href={optImg(fImg, 300)} x="-0.5" y="-0.5" width={patSize + 1} height={patSize + 1} preserveAspectRatio="none" />
                                </pattern>
                              );
                            })}
                            {fabricImg && (
                              <pattern id={patId} patternUnits="userSpaceOnUse" width={patSize} height={patSize}>
                                <image href={optImg(fabricImg, 300)} x="-0.5" y="-0.5" width={patSize + 1} height={patSize + 1} preserveAspectRatio="none" />
                              </pattern>
                            )}
                            {isBlindsHoriz && (
                              <pattern 
                                id={horizPatId} 
                                patternUnits="userSpaceOnUse" 
                                width={horizSlatW} 
                                height={horizSlatH}
                                patternTransform={`rotate(${blindsAngle})`}
                              >
                                <rect x="0" y="0" width={horizSlatW} height={horizSlatH} fill={`url(#blinds-horiz-grad-${idPrefix})`} />
                                <line x1="0" y1={horizSlatH - 0.5} x2={horizSlatW} y2={horizSlatH - 0.5} stroke="#000000" strokeWidth="1" opacity="0.45" />
                                <line x1="0" y1="0.5" x2={horizSlatW} y2="0.5" stroke="#ffffff" strokeWidth="1" opacity="0.3" />
                                {!area.useBlindsTape && (
                                  <>
                                    <line x1={horizSlatW * 0.25} y1="0" x2={horizSlatW * 0.25} y2={horizSlatH} stroke="#000000" strokeWidth="1.2" opacity="0.25" />
                                    <line x1={horizSlatW * 0.25 + 0.6} y1="0" x2={horizSlatW * 0.25 + 0.6} y2={horizSlatH} stroke="#ffffff" strokeWidth="0.8" opacity="0.25" />
                                    <line x1={horizSlatW * 0.75} y1="0" x2={horizSlatW * 0.75} y2={horizSlatH} stroke="#000000" strokeWidth="1.2" opacity="0.25" />
                                    <line x1={horizSlatW * 0.75 + 0.6} y1="0" x2={horizSlatW * 0.75 + 0.6} y2={horizSlatH} stroke="#ffffff" strokeWidth="0.8" opacity="0.25" />
                                  </>
                                )}
                                {area.useBlindsTape && (
                                  <>
                                    {/* Tape 1 */}
                                    <rect x={horizSlatW / 4 - tapeW / 2} y="0" width={tapeW} height={horizSlatH} fill={area.blindsTapeColor || '#8B4513'} opacity={0.85} />
                                    <rect x={horizSlatW / 4 - tapeW / 2} y="0" width={tapeW} height={horizSlatH} fill={`url(#blinds-horiz-grad-${idPrefix})`} opacity={0.4} style={{ mixBlendMode: 'multiply' }} />
                                    <line x1={horizSlatW / 4 - tapeW / 2} y1="0" x2={horizSlatW / 4 - tapeW / 2} y2={horizSlatH} stroke="#000000" strokeWidth="0.5" opacity="0.15" />
                                    <line x1={horizSlatW / 4 + tapeW / 2} y1="0" x2={horizSlatW / 4 + tapeW / 2} y2={horizSlatH} stroke="#000000" strokeWidth="0.5" opacity="0.15" />

                                    {/* Tape 2 */}
                                    <rect x={3 * horizSlatW / 4 - tapeW / 2} y="0" width={tapeW} height={horizSlatH} fill={area.blindsTapeColor || '#8B4513'} opacity={0.85} />
                                    <rect x={3 * horizSlatW / 4 - tapeW / 2} y="0" width={tapeW} height={horizSlatH} fill={`url(#blinds-horiz-grad-${idPrefix})`} opacity={0.4} style={{ mixBlendMode: 'multiply' }} />
                                    <line x1={3 * horizSlatW / 4 - tapeW / 2} y1="0" x2={3 * horizSlatW / 4 - tapeW / 2} y2={horizSlatH} stroke="#000000" strokeWidth="0.5" opacity="0.15" />
                                    <line x1={3 * horizSlatW / 4 + tapeW / 2} y1="0" x2={3 * horizSlatW / 4 + tapeW / 2} y2={horizSlatH} stroke="#000000" strokeWidth="0.5" opacity="0.15" />
                                  </>
                                )}
                              </pattern>
                            )}
                            {isBlindsVert && (
                              <pattern 
                                id={vertPatId} 
                                patternUnits="userSpaceOnUse" 
                                width={vertSlatW} 
                                height={vertSlatH}
                                patternTransform={`rotate(${blindsAngle})`}
                              >
                                <rect x="0" y="0" width={vertSlatW} height={vertSlatH} fill={`url(#blinds-vert-grad-${idPrefix})`} />
                                <line x1="0" y1="0" x2="0" y2={vertSlatH} stroke="#000000" strokeWidth="1" opacity="0.4" />
                                <line x1="1" y1="0" x2="1" y2={vertSlatH} stroke="#ffffff" strokeWidth="1" opacity="0.3" />
                              </pattern>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </defs>

                    {item.areas.map((area: any, idx: number) => {
                      if (area.points.length < 3) return null;
                      // Uses outer pixelW and pixelH from component scope
                      
                      const scaleX = (x: number) => (x * pixelW) / 100;
                      const scaleY = (y: number) => (y * pixelH) / 100;

                      const minX = Math.min(...area.points.map((p: any)=>p.x));
                      const maxX = Math.max(...area.points.map((p: any)=>p.x));
                      const minY = Math.min(...area.points.map((p: any)=>p.y));
                      const maxY = Math.max(...area.points.map((p: any)=>p.y));
                      
                      const minX_px = scaleX(minX);
                      const maxX_px = scaleX(maxX);
                      const minY_px = scaleY(minY);
                      const maxY_px = scaleY(maxY);
                      const w_px = maxX_px - minX_px;
                      const h_px = maxY_px - minY_px;

                      const clipId = `clip-${idPrefix}-${item.id}-${area.id}`;
                      
                      const styleMain1 = area.styleMain1 || item.styleMain1 || item.styleMain || '';
                      const isBlinds = styleMain1.includes('มู่ลี่') || styleMain1.includes('ม่านปรับแสง');
                      const autoMaskType = styleMain1.match(/ม่านม้วน|ม่านพับ|มู่ลี่|ม่านปรับแสง/) ? 'height' : 'width';
                      const maskType = area.maskType || autoMaskType;
                      const mPct = (area.maskPct || 20) / 100;
                      const maskOpacity = (area.maskOpacity ?? 87) / 100;
                      
                      const action = area.styleAction1 || item.styleAction1 || item.styleAction || '';
                      
                      const masks = appDB.masks?.[styleMain1] || {};
                      const maskImgFallback = masks[action] || masks['ALL'] || Object.values(masks)[0];
                      
                      const dist = (p1: any, p2: any) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

                      // Find the first fabric of the area to dye/texture the mask folds with fallback
                      let fab1 = area.fabrics?.[0];
                      if (!fab1) {
                        const firstAreaWithFabric = item.areas.find((a: any) => a.fabrics && a.fabrics.length > 0);
                        if (firstAreaWithFabric) {
                          fab1 = firstAreaWithFabric.fabrics[0];
                        }
                      }
                      let fabricColor = '#D1D5DB'; 
                      let fabricImg = null;

                      if (fab1) {
                        if (fab1.image) {
                          fabricImg = fab1.image;
                        } else if (fab1.mainType === 'ผ้านอกระบบ (เฉพาะงานนี้)' && generalInfo) {
                          fabricImg = (generalInfo.customFabrics || []).find((f: any) => f.subType === fab1.subType && f.name === fab1.name && f.color === fab1.color)?.image;
                        } else if (appDB?.curtainTypes) {
                          fabricImg = appDB.curtainTypes[fab1.mainType]?.[fab1.subType]?.[fab1.name]?.[fab1.color];
                        }

                        if (fab1.color) {
                          if (fab1.color.startsWith('#')) {
                            fabricColor = fab1.color;
                          } else {
                            const lowerCol = fab1.color.toLowerCase();
                            if (lowerCol.includes('ครีม') || lowerCol.includes('cream')) fabricColor = '#FFFDD0';
                            else if (lowerCol.includes('ขาว') || lowerCol.includes('white')) fabricColor = '#F9F9F9';
                            else if (lowerCol.includes('เทา') || lowerCol.includes('gray') || lowerCol.includes('grey')) fabricColor = '#9CA3AF';
                            else if (lowerCol.includes('น้ำตาล') || lowerCol.includes('brown')) fabricColor = '#78350F';
                            else if (lowerCol.includes('เบจ') || lowerCol.includes('beige')) fabricColor = '#F5F5DC';
                            else if (lowerCol.includes('ทอง') || lowerCol.includes('gold')) fabricColor = '#FBBF24';
                            else if (lowerCol.includes('น้ำเงิน') || lowerCol.includes('blue')) fabricColor = '#1E3A8A';
                            else if (lowerCol.includes('ชมพู') || lowerCol.includes('pink')) fabricColor = '#F472B6';
                            else if (lowerCol.includes('เขียว') || lowerCol.includes('green')) fabricColor = '#047857';
                            else if (lowerCol.includes('แดง') || lowerCol.includes('red')) fabricColor = '#B91C1C';
                            else fabricColor = '#E5E7EB';
                          }
                        }
                      }

                      const finalColor = fab1 ? fabricColor : area.lineColor;
                      const patId = `pat-${idPrefix}-${item.id}-${area.id}`;

                      const isBlindsHoriz = styleMain1.includes('มู่ลี่');
                      const isBlindsVert = styleMain1.includes('ม่านปรับแสง');
                      const isBlindsStyle = isBlindsHoriz || isBlindsVert;

                      const getEdgeAngle = (edge: any) => {
                        const pxDx = edge.dx * (pixelW / 100);
                        const pxDy = edge.dy * (pixelH / 100);
                        if (pxDx === 0 && pxDy === 0) return 0;
                        let ang = Math.atan2(pxDy, pxDx) * (180 / Math.PI);
                        if (ang > 90) ang -= 180;
                        if (ang < -90) ang += 180;
                        return ang;
                      };

                      let edges: any[] = [];
                      for (let i = 0; i < area.points.length; i++) {
                        let p1 = area.points[i];
                        let p2 = area.points[(i + 1) % area.points.length];
                        edges.push({
                          index: i,
                          p1,
                          p2,
                          midX: (p1.x + p2.x) / 2,
                          midY: (p1.y + p2.y) / 2,
                          dx: p2.x - p1.x,
                          dy: p2.y - p1.y
                        });
                      }

                      let autoTapeColor = '#8B4513';
                      let hasAutoTape = false;
                      const tapeFab = area.fabrics?.find((f: any) => 
                        f.name?.toUpperCase().includes('TAPE FOR BLINDS') || 
                        f.name?.toUpperCase().includes('TAPE') || 
                        f.name?.includes('เทป') ||
                        f.subType?.toUpperCase().includes('TAPE') ||
                        f.subType?.includes('เทป')
                      ) || item.areas?.flatMap((a: any) => a.fabrics || [])?.find((f: any) => 
                        f.name?.toUpperCase().includes('TAPE FOR BLINDS') || 
                        f.name?.toUpperCase().includes('TAPE') || 
                        f.name?.includes('เทป') ||
                        f.subType?.toUpperCase().includes('TAPE') ||
                        f.subType?.includes('เทป')
                      );

                      if (tapeFab) {
                        hasAutoTape = true;
                        if (tapeFab.color) {
                          if (tapeFab.color.startsWith('#')) {
                            autoTapeColor = tapeFab.color;
                          } else {
                            const lowerCol = tapeFab.color.toLowerCase();
                            if (lowerCol.includes('ครีม') || lowerCol.includes('cream')) autoTapeColor = '#FFFDD0';
                            else if (lowerCol.includes('ขาว') || lowerCol.includes('white')) autoTapeColor = '#F9F9F9';
                            else if (lowerCol.includes('เทา') || lowerCol.includes('gray') || lowerCol.includes('grey')) autoTapeColor = '#9CA3AF';
                            else if (lowerCol.includes('น้ำตาล') || lowerCol.includes('brown')) autoTapeColor = '#78350F';
                            else if (lowerCol.includes('เบจ') || lowerCol.includes('beige')) autoTapeColor = '#F5F5DC';
                            else if (lowerCol.includes('ทอง') || lowerCol.includes('gold')) autoTapeColor = '#FBBF24';
                            else if (lowerCol.includes('น้ำเงิน') || lowerCol.includes('blue')) autoTapeColor = '#1E3A8A';
                            else if (lowerCol.includes('ชมพู') || lowerCol.includes('pink')) autoTapeColor = '#F472B6';
                            else if (lowerCol.includes('เขียว') || lowerCol.includes('green')) autoTapeColor = '#047857';
                            else if (lowerCol.includes('แดง') || lowerCol.includes('red')) autoTapeColor = '#B91C1C';
                            else if (lowerCol.includes('ดำ') || lowerCol.includes('black') || lowerCol.includes('charcoal') || lowerCol.includes('เทาเข้ม') || lowerCol.includes('dark') || lowerCol.includes('เข้ม') || lowerCol.includes('t8') || lowerCol.includes('t5')) autoTapeColor = '#1F2937';
                            else autoTapeColor = '#E5E7EB';
                          }
                        }
                      }

                      const renderBlindsSlats = () => {
                        const elements: any[] = [];
                        
                        let topEdge = edges.find(e => area.edgeTypes?.[e.index] === 'top');
                        let bottomEdge = edges.find(e => area.edgeTypes?.[e.index] === 'bottom');
                        let leftEdge = edges.find(e => area.edgeTypes?.[e.index] === 'left');
                        let rightEdge = edges.find(e => area.edgeTypes?.[e.index] === 'right');
                        
                        if (!topEdge && edges.length > 0) topEdge = edges.reduce((prev, curr) => prev.midY < curr.midY ? prev : curr);
                        if (!bottomEdge && edges.length > 0) bottomEdge = edges.reduce((prev, curr) => prev.midY > curr.midY ? prev : curr);
                        if (!leftEdge && edges.length > 0) leftEdge = edges.reduce((prev, curr) => prev.midX < curr.midX ? prev : curr);
                        if (!rightEdge && edges.length > 0) rightEdge = edges.reduce((prev, curr) => prev.midX > curr.midX ? prev : curr);
                        
                        const topAngle = topEdge ? getEdgeAngle(topEdge) : 0;
                        const bottomAngle = bottomEdge ? getEdgeAngle(bottomEdge) : 0;
                        const leftAngle = leftEdge ? getEdgeAngle(leftEdge) : -90;
                        const rightAngle = rightEdge ? getEdgeAngle(rightEdge) : 90;
                        
                        const slatSize = area.blindsSlatSize || (isBlindsHoriz ? 14 : 36);
                        
                        if (isBlindsHoriz) {
                          const leftTop = leftEdge ? (leftEdge.p1.y < leftEdge.p2.y ? leftEdge.p1 : leftEdge.p2) : { x: 0, y: 0 };
                          const leftBot = leftEdge ? (leftEdge.p1.y < leftEdge.p2.y ? leftEdge.p2 : leftEdge.p1) : { x: 0, y: 100 };
                          const rightTop = rightEdge ? (rightEdge.p1.y < rightEdge.p2.y ? rightEdge.p1 : rightEdge.p2) : { x: 100, y: 0 };
                          const rightBot = rightEdge ? (rightEdge.p1.y < rightEdge.p2.y ? rightEdge.p2 : rightEdge.p1) : { x: 100, y: 100 };

                          const leftLen = Math.sqrt(Math.pow(scaleX(leftBot.x) - scaleX(leftTop.x), 2) + Math.pow(scaleY(leftBot.y) - scaleY(leftTop.y), 2));
                          const rightLen = Math.sqrt(Math.pow(scaleX(rightBot.x) - scaleX(rightTop.x), 2) + Math.pow(scaleY(rightBot.y) - scaleY(rightTop.y), 2));
                          const avgLen = (leftLen + rightLen) / 2 || 1;

                          const activeHeight = h_px * mPct;
                          const numSlats = Math.ceil(activeHeight / slatSize) + 1;

                          for (let i = 0; i < numSlats; i++) {
                            const f1 = i / numSlats;
                            const f2 = (i + 1) / numSlats;
                            const f_center = (f1 + f2) / 2;

                            const t_center = f_center * mPct;

                            // Left and right points of the slat center-line
                            const pL_pct = { 
                              x: leftTop.x * (1 - t_center) + leftBot.x * t_center, 
                              y: leftTop.y * (1 - t_center) + leftBot.y * t_center 
                            };
                            const pR_pct = { 
                              x: rightTop.x * (1 - t_center) + rightBot.x * t_center, 
                              y: rightTop.y * (1 - t_center) + rightBot.y * t_center 
                            };

                            const pL = { x: scaleX(pL_pct.x), y: scaleY(pL_pct.y) };
                            const pR = { x: scaleX(pR_pct.x), y: scaleY(pR_pct.y) };

                            // Direction vector of the slat
                            const dx = pR.x - pL.x;
                            const dy = pR.y - pL.y;
                            const len = Math.sqrt(dx * dx + dy * dy) || 1;
                            const ux = dx / len;
                            const uy = dy / len;
                            // Normal vector (perpendicular, pointing down)
                            const nx = -uy;
                            const ny = ux;

                            // Calculate slat height at left and right with perspective scaling
                            let tiltAngle = topAngle * (1 - t_center) + bottomAngle * t_center;
                            if (area.autoTilt === false) {
                              tiltAngle = area.blindsAngle !== undefined ? area.blindsAngle : 0;
                            }
                            const H_left = slatSize * (leftLen / avgLen) * Math.abs(Math.cos(tiltAngle * Math.PI / 180));
                            const H_right = slatSize * (rightLen / avgLen) * Math.abs(Math.cos(tiltAngle * Math.PI / 180));

                            const halfH_left = H_left / 2;
                            const halfH_right = H_right / 2;

                            // Extend slightly outwards to cover bounds neatly
                            const extend = 4;
                            const pL_extended = { x: pL.x - extend * ux, y: pL.y - extend * uy };
                            const pR_extended = { x: pR.x + extend * ux, y: pR.y + extend * uy };

                            const vTL = { x: pL_extended.x - halfH_left * nx, y: pL_extended.y - halfH_left * ny };
                            const vTR = { x: pR_extended.x - halfH_right * nx, y: pR_extended.y - halfH_right * ny };
                            const vBR = { x: pR_extended.x + halfH_right * nx, y: pR_extended.y + halfH_right * ny };
                            const vBL = { x: pL_extended.x + halfH_left * nx, y: pL_extended.y + halfH_left * ny };

                            elements.push(
                              <g key={`slat-h-${i}`}>
                                {/* Base color */}
                                <polygon 
                                  points={`${vTL.x},${vTL.y} ${vTR.x},${vTR.y} ${vBR.x},${vBR.y} ${vBL.x},${vBL.y}`}
                                  fill={finalColor} 
                                />
                                {/* Fabric/texture if available */}
                                {fabricImg && (
                                  <polygon 
                                    points={`${vTL.x},${vTL.y} ${vTR.x},${vTR.y} ${vBR.x},${vBR.y} ${vBL.x},${vBL.y}`}
                                    fill={`url(#${patId})`} 
                                  />
                                )}
                                {/* Slat shade/gradient overlay */}
                                <polygon 
                                  points={`${vTL.x},${vTL.y} ${vTR.x},${vTR.y} ${vBR.x},${vBR.y} ${vBL.x},${vBL.y}`}
                                  fill={`url(#blinds-horiz-grad-${idPrefix})`} 
                                />
                                {/* Top and Bottom lines for realistic highlights */}
                                <line 
                                  x1={vTL.x} 
                                  y1={vTL.y} 
                                  x2={vTR.x} 
                                  y2={vTR.y} 
                                  stroke="#ffffff" 
                                  strokeWidth="0.8" 
                                  opacity="0.25" 
                                />
                                <line 
                                  x1={vBL.x} 
                                  y1={vBL.y} 
                                  x2={vBR.x} 
                                  y2={vBR.y} 
                                  stroke="#000000" 
                                  strokeWidth="1.2" 
                                  opacity="0.35" 
                                />
                              </g>
                            );
                          }
                          
                          const useTape = area.useBlindsTape || hasAutoTape;
                          if (useTape && topEdge && bottomEdge) {
                            const topL = topEdge.p1.x < topEdge.p2.x ? topEdge.p1 : topEdge.p2;
                            const topR = topEdge.p1.x < topEdge.p2.x ? topEdge.p2 : topEdge.p1;
                            const botL = bottomEdge.p1.x < bottomEdge.p2.x ? bottomEdge.p1 : bottomEdge.p2;
                            const botR = bottomEdge.p1.x < bottomEdge.p2.x ? bottomEdge.p2 : bottomEdge.p1;
                            
                            const tapeW = area.blindsTapeWidth !== undefined ? area.blindsTapeWidth : Math.round(slatSize * 0.8);
                            
                            // Synchronize the selected tape fabric at the item level across all areas
                            let tapeArea = null;
                            let tapeFabIndex = -1;
                            let tapeFab = null;
                            
                            for (const a of item.areas || []) {
                              const idx = a.fabrics?.findIndex((f: any) => 
                                f.name?.toUpperCase().includes('TAPE FOR BLINDS') || 
                                f.name?.toUpperCase().includes('TAPE') || 
                                f.name?.includes('เทป') ||
                                f.subType?.toUpperCase().includes('TAPE') ||
                                f.subType?.includes('เทป')
                              );
                              if (idx !== undefined && idx !== -1) {
                                tapeArea = a;
                                tapeFabIndex = idx;
                                tapeFab = a.fabrics[idx];
                                break;
                              }
                            }
                            
                            let tapeStroke = area.blindsTapeColor || autoTapeColor;
                            if (tapeFab) {
                              const hasImg = !!(tapeFab.image || 
                                (tapeFab.mainType === 'ผ้านอกระบบ (เฉพาะงานนี้)' && generalInfo && (generalInfo.customFabrics || []).some((f: any) => f.subType === tapeFab.subType && f.name === tapeFab.name && f.color === tapeFab.color && f.image)) || 
                                (appDB?.curtainTypes && appDB.curtainTypes[tapeFab.mainType]?.[tapeFab.subType]?.[tapeFab.name]?.[tapeFab.color]));
                              
                              if (hasImg && tapeArea) {
                                tapeStroke = `url(#pat-${idPrefix}-${item.id}-${tapeArea.id}-${tapeFabIndex})`;
                              } else if (tapeFab.color) {
                                if (tapeFab.color.startsWith('#')) {
                                  tapeStroke = tapeFab.color;
                                } else {
                                  const lowerCol = tapeFab.color.toLowerCase();
                                  if (lowerCol.includes('ครีม') || lowerCol.includes('cream')) tapeStroke = '#FFFDD0';
                                  else if (lowerCol.includes('ขาว') || lowerCol.includes('white')) tapeStroke = '#F9F9F9';
                                  else if (lowerCol.includes('เทา') || lowerCol.includes('gray') || lowerCol.includes('grey')) tapeStroke = '#9CA3AF';
                                  else if (lowerCol.includes('น้ำตาล') || lowerCol.includes('brown')) tapeStroke = '#78350F';
                                  else if (lowerCol.includes('เบจ') || lowerCol.includes('beige')) tapeStroke = '#F5F5DC';
                                  else if (lowerCol.includes('ทอง') || lowerCol.includes('gold')) tapeStroke = '#FBBF24';
                                  else if (lowerCol.includes('น้ำเงิน') || lowerCol.includes('blue')) tapeStroke = '#1E3A8A';
                                  else if (lowerCol.includes('ชมพู') || lowerCol.includes('pink')) tapeStroke = '#F472B6';
                                  else if (lowerCol.includes('เขียว') || lowerCol.includes('green')) tapeStroke = '#047857';
                                  else if (lowerCol.includes('แดง') || lowerCol.includes('red')) tapeStroke = '#B91C1C';
                                  else if (lowerCol.includes('ดำ') || lowerCol.includes('black') || lowerCol.includes('charcoal') || lowerCol.includes('เทาเข้ม') || lowerCol.includes('dark') || lowerCol.includes('เข้ม') || lowerCol.includes('t8') || lowerCol.includes('t5')) tapeStroke = '#1F2937';
                                }
                              }
                            }
                            
                            const getTapeFractions = (w: number) => {
                              const widthVal = w || 75; // fallback to 75
                              if (widthVal <= 85) {
                                return [0.25, 0.75];
                              } else if (widthVal <= 140) {
                                return [0.20, 0.50, 0.80];
                              } else if (widthVal <= 195) {
                                return [0.15, 0.38, 0.62, 0.85];
                              } else if (widthVal <= 240) {
                                return [0.12, 0.31, 0.50, 0.69, 0.88];
                              } else {
                                return [0.10, 0.26, 0.42, 0.58, 0.74, 0.90];
                              }
                            };
                            
                            const tapeFractions = getTapeFractions(parseFloat(area.width));
                            
                            tapeFractions.forEach((f, idx) => {
                              const ptTopX = scaleX(topL.x + f * (topR.x - topL.x));
                              const ptTopY = scaleY(topL.y + f * (topR.y - topL.y));
                              const ptBotX = scaleX(botL.x + f * (botR.x - botL.x));
                              const ptBotY = scaleY(botL.y + f * (botR.y - botL.y));
                              
                              const endX = ptTopX + (ptBotX - ptTopX) * mPct;
                              const endY = ptTopY + (ptBotY - ptTopY) * mPct;
                              
                              elements.push(
                                <g key={`tape-g-${idx}`}>
                                  <line 
                                    x1={ptTopX} 
                                    y1={ptTopY} 
                                    x2={endX} 
                                    y2={endY} 
                                    stroke={tapeStroke} 
                                    strokeWidth={tapeW} 
                                    opacity={0.85} 
                                    strokeLinecap="butt" 
                                  />
                                  <line 
                                    x1={ptTopX} 
                                    y1={ptTopY} 
                                    x2={endX} 
                                    y2={endY} 
                                    stroke="#000000" 
                                    strokeWidth={tapeW} 
                                    opacity={0.15} 
                                    style={{ mixBlendMode: 'multiply' }} 
                                    strokeLinecap="butt" 
                                  />
                                  <line 
                                    x1={ptTopX} 
                                    y1={ptTopY} 
                                    x2={endX} 
                                    y2={endY} 
                                    stroke="#000000" 
                                    strokeWidth="0.8" 
                                    opacity="0.3" 
                                    strokeDasharray="2 3" 
                                    strokeLinecap="butt" 
                                  />
                                </g>
                              );
                            });
                          }
                        } else {
                          const vertSlatW = slatSize;
                          const activeWidth = w_px * mPct;
                          const numSlats = Math.ceil(activeWidth / vertSlatW) + 1;
                          
                          const isSplit = action.includes('แยกกลาง');
                          const isRight = action.includes('ขวา');
                          
                          const drawSlat = (centerX: number, key: string) => {
                            const t = Math.max(0, Math.min(1, (centerX - minX_px) / (w_px || 1)));
                            let angle = leftAngle * (1 - t) + rightAngle * t;
                            if (area.autoTilt === false) {
                              angle = area.blindsAngle !== undefined ? area.blindsAngle : 0;
                            }
                            
                            const centerY = minY_px + h_px / 2;
                            
                            return (
                              <g key={key} transform={`rotate(${angle}, ${centerX}, ${centerY})`}>
                                {/* Base color */}
                                <rect 
                                  x={centerX - vertSlatW / 2} 
                                  y={minY_px - h_px * 0.5} 
                                  width={vertSlatW} 
                                  height={h_px * 2} 
                                  fill={finalColor} 
                                />
                                {/* Fabric/texture if available */}
                                {fabricImg && (
                                  <rect 
                                    x={centerX - vertSlatW / 2} 
                                    y={minY_px - h_px * 0.5} 
                                    width={vertSlatW} 
                                    height={h_px * 2} 
                                    fill={`url(#${patId})`} 
                                  />
                                )}
                                {/* Slat shade/gradient overlay */}
                                <rect 
                                  x={centerX - vertSlatW / 2} 
                                  y={minY_px - h_px * 0.5} 
                                  width={vertSlatW} 
                                  height={h_px * 2} 
                                  fill={`url(#blinds-vert-grad-${idPrefix})`} 
                                />
                                <line 
                                  x1={centerX - vertSlatW / 2} 
                                  y1={minY_px - h_px * 0.5} 
                                  x2={centerX - vertSlatW / 2} 
                                  y2={minY_px + h_px * 1.5} 
                                  stroke="#000000" 
                                  strokeWidth="1" 
                                  opacity="0.4" 
                                />
                                <line 
                                  x1={centerX - vertSlatW / 2 + 1} 
                                  y1={minY_px - h_px * 0.5} 
                                  x2={centerX - vertSlatW / 2 + 1} 
                                  y2={minY_px + h_px * 1.5} 
                                  stroke="#ffffff" 
                                  strokeWidth="1" 
                                  opacity="0.3" 
                                />
                              </g>
                            );
                          };
                          
                          if (isSplit) {
                            const halfSlats = Math.ceil(numSlats / 2);
                            for (let i = 0; i < halfSlats; i++) {
                              const cxLeft = minX_px + (i + 0.5) * vertSlatW;
                              if (cxLeft <= minX_px + w_px / 2) {
                                elements.push(drawSlat(cxLeft, `slat-v-split-l-${i}`));
                              }
                              const cxRight = maxX_px - (i + 0.5) * vertSlatW;
                              if (cxRight >= minX_px + w_px / 2) {
                                elements.push(drawSlat(cxRight, `slat-v-split-r-${i}`));
                              }
                            }
                          } else if (isRight) {
                            for (let i = 0; i < numSlats; i++) {
                              const cx = maxX_px - (i + 0.5) * vertSlatW;
                              elements.push(drawSlat(cx, `slat-v-r-${i}`));
                            }
                          } else {
                            for (let i = 0; i < numSlats; i++) {
                              const cx = minX_px + (i + 0.5) * vertSlatW;
                              elements.push(drawSlat(cx, `slat-v-l-${i}`));
                            }
                          }
                        }
                        
                        return elements;
                      };

                      let maskElements: any[] = [];

                      if (isBlindsStyle) {
                        if (maskType === 'height') {
                          const activeClipId = `active-clip-${idPrefix}-${item.id}-${area.id}`;
                          maskElements.push(
                            <g key="H" clipPath={`url(#${clipId})`}>
                              <defs>
                                <clipPath id={activeClipId}>
                                  <rect x={minX_px - w_px * 0.5} y={minY_px - 100} width={w_px * 2} height={h_px * mPct + 100} />
                                </clipPath>
                              </defs>
                              <rect x={minX_px} y={minY_px} width={w_px} height={h_px * mPct} fill={finalColor} />
                              {fabricImg && <rect x={minX_px} y={minY_px} width={w_px} height={h_px * mPct} fill={`url(#${patId})`} />}
                              <g clipPath={`url(#${activeClipId})`}>
                                {renderBlindsSlats()}
                              </g>
                            </g>
                          );
                        } else {
                          if (action.includes('แยกกลาง')) {
                            const activeClipId = `active-clip-${idPrefix}-${item.id}-${area.id}`;
                            maskElements.push(
                              <g key="W" clipPath={`url(#${clipId})`}>
                                <defs>
                                  <clipPath id={activeClipId}>
                                    <rect x={minX_px - 100} y={minY_px - h_px * 0.5} width={w_px * mPct + 100} height={h_px * 2} />
                                    <rect x={maxX_px - (w_px * mPct)} y={minY_px - h_px * 0.5} width={w_px * mPct + 100} height={h_px * 2} />
                                  </clipPath>
                                </defs>
                                <rect x={minX_px} y={minY_px} width={w_px * mPct} height={h_px} fill={finalColor} />
                                {fabricImg && <rect x={minX_px} y={minY_px} width={w_px * mPct} height={h_px} fill={`url(#${patId})`} />}
                                
                                <rect x={maxX_px - (w_px * mPct)} y={minY_px} width={w_px * mPct} height={h_px} fill={finalColor} />
                                {fabricImg && <rect x={maxX_px - (w_px * mPct)} y={minY_px} width={w_px * mPct} height={h_px} fill={`url(#${patId})`} />}
                                
                                <g clipPath={`url(#${activeClipId})`}>
                                  {renderBlindsSlats()}
                                </g>
                              </g>
                            );
                          } else if (action.includes('ขวา')) {
                            const activeClipId = `active-clip-${idPrefix}-${item.id}-${area.id}`;
                            maskElements.push(
                              <g key="R" clipPath={`url(#${clipId})`}>
                                <defs>
                                  <clipPath id={activeClipId}>
                                    <rect x={maxX_px - (w_px * mPct)} y={minY_px - h_px * 0.5} width={w_px * mPct + 100} height={h_px * 2} />
                                  </clipPath>
                                </defs>
                                <rect x={maxX_px - (w_px * mPct)} y={minY_px} width={w_px * mPct} height={h_px} fill={finalColor} />
                                {fabricImg && <rect x={maxX_px - (w_px * mPct)} y={minY_px} width={w_px * mPct} height={h_px} fill={`url(#${patId})`} />}
                                
                                <g clipPath={`url(#${activeClipId})`}>
                                  {renderBlindsSlats()}
                                </g>
                              </g>
                            );
                          } else {
                            const activeClipId = `active-clip-${idPrefix}-${item.id}-${area.id}`;
                            maskElements.push(
                              <g key="L" clipPath={`url(#${clipId})`}>
                                <defs>
                                  <clipPath id={activeClipId}>
                                    <rect x={minX_px - 100} y={minY_px - h_px * 0.5} width={w_px * mPct + 100} height={h_px * 2} />
                                  </clipPath>
                                </defs>
                                <rect x={minX_px} y={minY_px} width={w_px * mPct} height={h_px} fill={finalColor} />
                                {fabricImg && <rect x={minX_px} y={minY_px} width={w_px * mPct} height={h_px} fill={`url(#${patId})`} />}
                                
                                <g clipPath={`url(#${activeClipId})`}>
                                  {renderBlindsSlats()}
                                </g>
                              </g>
                            );
                          }
                        }
                      } else if (maskImgFallback) {
                        if (maskType === 'height') {
                          const maskIdH = `mask-h-${idPrefix}-${item.id}-${area.id}`;
                          maskElements.push(
                            <g key="H" clipPath={`url(#${clipId})`}>
                              <CanvasMaskedLayer
                                maskUrl={optImg(maskImgFallback, 800, true)}
                                fabricUrl={fabricImg}
                                finalColor={finalColor}
                                x={minX_px}
                                y={minY_px}
                                width={w_px}
                                height={h_px * mPct}
                                maskOpacity={maskOpacity}
                                styleMain1={styleMain1}
                                isBlinds={isBlinds}
                              />
                            </g>
                          );
                        } else {
                          if (action.includes('แยกกลาง')) {
                            const leftImg = masks['รวบซ้าย'] || maskImgFallback;
                            const rightImg = masks['รวบขวา'] || maskImgFallback;
                            const maskIdL = `mask-w-l-${idPrefix}-${item.id}-${area.id}`;
                            const maskIdR = `mask-w-r-${idPrefix}-${item.id}-${area.id}`;
                            maskElements.push(
                              <g key="W" clipPath={`url(#${clipId})`}>
                                <CanvasMaskedLayer
                                  maskUrl={optImg(leftImg, 800, true)}
                                  fabricUrl={fabricImg}
                                  finalColor={finalColor}
                                  x={minX_px}
                                  y={minY_px}
                                  width={w_px * mPct}
                                  height={h_px}
                                  maskOpacity={maskOpacity}
                                  styleMain1={styleMain1}
                                  isBlinds={isBlinds}
                                />
                                <CanvasMaskedLayer
                                  maskUrl={optImg(rightImg, 800, true)}
                                  fabricUrl={fabricImg}
                                  finalColor={finalColor}
                                  x={maxX_px - (w_px * mPct)}
                                  y={minY_px}
                                  width={w_px * mPct}
                                  height={h_px}
                                  maskOpacity={maskOpacity}
                                  styleMain1={styleMain1}
                                  isBlinds={isBlinds}
                                />
                              </g>
                            );
                          } else if (action.includes('ขวา')) {
                            const rightImg = masks['รวบขวา'] || masks[action] || maskImgFallback;
                            const maskIdR = `mask-w-r-${idPrefix}-${item.id}-${area.id}`;
                            maskElements.push(
                              <g key="R" clipPath={`url(#${clipId})`}>
                                <CanvasMaskedLayer
                                  maskUrl={optImg(rightImg, 800, true)}
                                  fabricUrl={fabricImg}
                                  finalColor={finalColor}
                                  x={maxX_px - (w_px * mPct)}
                                  y={minY_px}
                                  width={w_px * mPct}
                                  height={h_px}
                                  maskOpacity={maskOpacity}
                                  styleMain1={styleMain1}
                                  isBlinds={isBlinds}
                                />
                              </g>
                            );
                          } else {
                            const leftImg = masks['รวบซ้าย'] || masks[action] || maskImgFallback;
                            const maskIdL = `mask-w-l-${idPrefix}-${item.id}-${area.id}`;
                            maskElements.push(
                              <g key="L" clipPath={`url(#${clipId})`}>
                                <CanvasMaskedLayer
                                  maskUrl={optImg(leftImg, 800, true)}
                                  fabricUrl={fabricImg}
                                  finalColor={finalColor}
                                  x={minX_px}
                                  y={minY_px}
                                  width={w_px * mPct}
                                  height={h_px}
                                  maskOpacity={maskOpacity}
                                  styleMain1={styleMain1}
                                  isBlinds={isBlinds}
                                />
                              </g>
                            );
                          }
                        }
                      } else {
                        // Safe fallback for custom styles (like Roller Blinds / ม่านม้วน) when no mask image exists
                        if (maskType === 'height') {
                          maskElements.push(
                            <g key="H-fallback" clipPath={`url(#${clipId})`}>
                              <rect x={minX_px} y={minY_px} width={w_px} height={h_px * mPct} fill={finalColor} />
                              {fabricImg && <rect x={minX_px} y={minY_px} width={w_px} height={h_px * mPct} fill={`url(#${patId})`} />}
                            </g>
                          );
                        } else {
                          if (action.includes('แยกกลาง')) {
                            maskElements.push(
                              <g key="W-fallback-split" clipPath={`url(#${clipId})`}>
                                <rect x={minX_px} y={minY_px} width={w_px * mPct} height={h_px} fill={finalColor} />
                                {fabricImg && <rect x={minX_px} y={minY_px} width={w_px * mPct} height={h_px} fill={`url(#${patId})`} />}
                                <rect x={maxX_px - (w_px * mPct)} y={minY_px} width={w_px * mPct} height={h_px} fill={finalColor} />
                                {fabricImg && <rect x={maxX_px - (w_px * mPct)} y={minY_px} width={w_px * mPct} height={h_px} fill={`url(#${patId})`} />}
                              </g>
                            );
                          } else if (action.includes('ขวา')) {
                            maskElements.push(
                              <g key="R-fallback" clipPath={`url(#${clipId})`}>
                                <rect x={maxX_px - (w_px * mPct)} y={minY_px} width={w_px * mPct} height={h_px} fill={finalColor} />
                                {fabricImg && <rect x={maxX_px - (w_px * mPct)} y={minY_px} width={w_px * mPct} height={h_px} fill={`url(#${patId})`} />}
                              </g>
                            );
                          } else {
                            maskElements.push(
                              <g key="L-fallback" clipPath={`url(#${clipId})`}>
                                <rect x={minX_px} y={minY_px} width={w_px * mPct} height={h_px} fill={finalColor} />
                                {fabricImg && <rect x={minX_px} y={minY_px} width={w_px * mPct} height={h_px} fill={`url(#${patId})`} />}
                              </g>
                            );
                          }
                        }
                      }

                      return (
                        <g key={`fill-group-${area.id}`}>
                          <polygon points={area.points.map((p: any) => `${(p.x * pixelW) / 100},${(p.y * pixelH) / 100}`).join(' ')} fill="none" stroke="none" />
                          {maskElements}
                        </g>
                      );
                    })}
                    {mode === 'draw' && activeAreaId && isDrawing && !pointDrag && cursorPos && activeArea && activeArea.points.length > 0 && (() => {
                      return (
                        <polygon points={[...activeArea.points, cursorPos].map(p => `${(p.x * pixelW) / 100},${(p.y * pixelH) / 100}`).join(' ')} fill={activeArea.lineColor} fillOpacity={0.1} stroke="none" />
                      );
                    })()}
                </svg>

                <svg 
                  className="absolute inset-0 w-full h-full pointer-events-none" 
                  viewBox={`0 0 ${pixelW} ${pixelH}`} 
                  preserveAspectRatio="none" 
                  style={{ top: 0, left: 0 }}
                >
                  {item.areas.map((area: any) => {
                    const isActive = activeAreaId === area.id;
                    return (
                      <g key={area.id}>
                        {area.points.map((p: any, idx: number) => {
                          const isLast = idx === area.points.length - 1;
                          const nextP = isLast ? area.points[0] : area.points[idx + 1];
                          if (mode === 'draw' && isActive && isDrawing && isLast && !pointDrag) return null;
                          if (area.points.length < 2) return null;
                          return (
                            <g key={`edge-g-${idx}`} style={{ pointerEvents: 'auto' }}>
                              {/* Visible thin line */}
                              <line 
                                x1={(p.x * pixelW) / 100} 
                                y1={(p.y * pixelH) / 100} 
                                x2={(nextP.x * pixelW) / 100} 
                                y2={(nextP.y * pixelH) / 100} 
                                stroke={area.lineColor} 
                                strokeWidth={area.lineWidth / zoom} 
                                strokeDasharray={isActive && !pointDrag && isDrawing ? "4 4" : "0"} 
                                className={isActive && !pointDrag && isDrawing ? "animate-pulse" : ""} 
                              />
                              {/* Invisible thick line for easy interaction & right-click edge configuration */}
                              <line 
                                x1={(p.x * pixelW) / 100} 
                                y1={(p.y * pixelH) / 100} 
                                x2={(nextP.x * pixelW) / 100} 
                                y2={(nextP.y * pixelH) / 100} 
                                stroke="transparent" 
                                strokeWidth={Math.max(12, area.lineWidth * 4) / zoom} 
                                className="cursor-context-menu print:hidden"
                                style={{ cursor: 'context-menu' }}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const rect = wrapperRef.current?.getBoundingClientRect();
                                  if (rect) {
                                    const x = e.clientX - rect.left;
                                    const y = e.clientY - rect.top;
                                    setEdgeMenu({
                                      x,
                                      y,
                                      areaId: area.id,
                                      segmentIndex: idx
                                    });
                                  }
                                }}
                              >
                                <title>คลิกขวาเพื่อกำหนดประเภทของเส้นกรอบนี้ (ส่วนหัว/ส่วนล่าง/ซ้าย/ขวา)</title>
                              </line>
                            </g>
                          );
                        })}
                        {area.points.map((p: any, idx: number) => {
                          const isFirstPoint = idx === 0;
                          const isCurrentlyDrawing = mode === 'draw' && isActive && isDrawing;
                          const isHighlight = isCurrentlyDrawing && isFirstPoint && area.points.length >= 2;
                          const circleRadius = isHighlight ? 8/zoom : 4/zoom;
                          
                          return (
                            <g key={idx} className="cursor-move print:hidden" style={{ pointerEvents: 'auto' }}>
                              <circle cx={(p.x * pixelW) / 100} cy={(p.y * pixelH) / 100} r={circleRadius} fill={isHighlight ? "#FFD700" : "white"} stroke={area.lineColor} strokeWidth={isHighlight ? 3/zoom : 2/zoom} onMouseDown={(e) => handlePointMouseDown(e, area.id, idx)} onTouchStart={(e) => handlePointMouseDown(e, area.id, idx)} className={isHighlight ? "animate-pulse" : ""} />
                            </g>
                          );
                        })}
                      </g>
                    );
                  })}
                  {mode === 'draw' && activeAreaId && isDrawing && !pointDrag && cursorPos && activeArea && activeArea.points.length > 0 && (() => {
                    return (
                      <g style={{ pointerEvents: 'none' }}>
                        <line x1={(activeArea.points[activeArea.points.length - 1].x * pixelW) / 100} y1={(activeArea.points[activeArea.points.length - 1].y * pixelH) / 100} x2={(cursorPos.x * pixelW) / 100} y2={(cursorPos.y * pixelH) / 100} stroke={activeArea.lineColor} strokeWidth={2/zoom} strokeDasharray="4 4" />
                        <line x1={(cursorPos.x * pixelW) / 100} y1={(cursorPos.y * pixelH) / 100} x2={(activeArea.points[0].x * pixelW) / 100} y2={(activeArea.points[0].y * pixelH) / 100} stroke={activeArea.lineColor} strokeWidth={2/zoom} strokeDasharray="4 4" opacity="0.5" />
                      </g>
                    );
                  })()}
                </svg>

                {item.areas.map((area: any, idx: number) => {
                  if (area.points.length === 0) return null;
                  
                  let wMidX = 50, wMidY = 0, wAng = 0;
                  let hMidX = 0, hMidY = 50, hAng = -90;

                  if (area.points.length >= 2) {
                    let edges: any[] = [];
                    for(let i=0; i<area.points.length; i++) {
                      let p1 = area.points[i];
                      let p2 = area.points[(i+1)%area.points.length];
                      edges.push({ index: i, p1, p2, midX: (p1.x+p2.x)/2, midY: (p1.y+p2.y)/2, dx: p2.x - p1.x, dy: p2.y - p1.y });
                    }
                    
                    let tEdge = edges.find(e => area.edgeTypes?.[e.index] === 'top');
                    let bEdge = edges.find(e => area.edgeTypes?.[e.index] === 'bottom');
                    let lEdge = edges.find(e => area.edgeTypes?.[e.index] === 'left');
                    let rEdge = edges.find(e => area.edgeTypes?.[e.index] === 'right');

                    if (!tEdge && edges.length > 0) tEdge = edges.reduce((prev, curr) => prev.midY < curr.midY ? prev : curr);
                    if (!bEdge && edges.length > 0) bEdge = edges.reduce((prev, curr) => prev.midY > curr.midY ? prev : curr);
                    if (!lEdge && edges.length > 0) lEdge = edges.reduce((prev, curr) => prev.midX < curr.midX ? prev : curr);
                    if (!rEdge && edges.length > 0) rEdge = edges.reduce((prev, curr) => prev.midX > curr.midX ? prev : curr);

                    const getVisualAngle = (edge: any, defaultAng: number) => {
                      if (!containerRef.current) return defaultAng;
                      const rect = containerRef.current.getBoundingClientRect();
                      const pxDx = edge.dx * (rect.width / 100);
                      const pxDy = edge.dy * (rect.height / 100);
                      if (pxDx === 0 && pxDy === 0) return defaultAng;
                      let ang = Math.atan2(pxDy, pxDx) * (180 / Math.PI);
                      if (ang > 90 || ang < -90) ang += 180;
                      return ang;
                    };

                    const wPos = area.wPos || 'top';
                    const hPos = area.hPos || 'right';

                    if (wPos === 'top') { wMidX = tEdge.midX; wMidY = tEdge.midY; wAng = getVisualAngle(tEdge, 0); }
                    else { wMidX = bEdge.midX; wMidY = bEdge.midY; wAng = getVisualAngle(bEdge, 0); }

                    if (hPos === 'left') { hMidX = lEdge.midX; hMidY = lEdge.midY; hAng = getVisualAngle(lEdge, -90); }
                    else { hMidX = rEdge.midX; hMidY = rEdge.midY; hAng = getVisualAngle(rEdge, 90); }
                  }

                  const lblSize = (area.labelSize || 14) / zoom;
                  const wPos = area.wPos || 'top';
                  const hPos = area.hPos || 'right';
                  const wShift = wPos === 'top' ? -16 : 16;
                  const hShift = hPos === 'left' 
                    ? (hAng > 0 ? 16 : -16) 
                    : (hAng > 0 ? -16 : 16);
                  
                  return (
                    <div key={`labels-${area.id}`} className="absolute inset-0 pointer-events-none">
                      {item.areas.length >= 2 && area.points[0] && (
                        <div style={{ position: 'absolute', left: `${area.points[0].x}%`, top: `${area.points[0].y}%`, transform: `translate(-50%, -100%) translateY(-10px)`, color: area.lineColor, fontSize: `${12/zoom}px`, whiteSpace: 'nowrap' }} className="bg-white/90 px-1.5 py-0.5 rounded shadow-sm border border-gray-300 font-bold z-10 text-center">
                          บานที่ {idx + 1}
                        </div>
                      )}
                      {area.width && (
                        <div style={{ position: 'absolute', left: `${wMidX}%`, top: `${wMidY}%`, transform: `translate(-50%, -50%) rotate(${wAng}deg) translateY(${wShift}px)`, color: area.labelColor || area.lineColor, fontSize: `${lblSize}px`, whiteSpace: 'nowrap' }} className="bg-white/95 px-2 py-0.5 rounded shadow-md border border-gray-300 font-bold z-10 text-center">
                          {area.width} ซม.
                        </div>
                      )}
                      {area.height && (
                        <div style={{ position: 'absolute', left: `${hMidX}%`, top: `${hMidY}%`, transform: `translate(-50%, -50%) rotate(${hAng}deg) translateY(${hShift}px)`, color: area.labelColor || area.lineColor, fontSize: `${lblSize}px`, whiteSpace: 'nowrap' }} className="bg-white/95 px-2 py-0.5 rounded shadow-md border border-gray-300 font-bold z-10 text-center">
                          {area.height} ซม.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="absolute top-2 left-2 flex flex-wrap gap-2 z-40 no-print" onMouseDown={e=>e.stopPropagation()} onTouchStart={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()} onWheel={e=>e.stopPropagation()}>
              <label className={`cursor-pointer bg-white/90 border border-gray-300 text-gray-700 px-3 py-1.5 rounded shadow-sm hover:bg-white flex items-center text-xs font-bold transition-colors ${isUploadingObj ? 'opacity-50 cursor-wait' : ''}`} title="เปลี่ยนเฉพาะรูปพื้นหลัง">
                <Upload size={14} className="mr-1.5"/> {isUploadingObj ? 'กำลังอัปโหลด...' : 'เปลี่ยนรูปหน้างาน'}
                <input type="file" accept={ACCEPTED_IMAGE_FORMATS} className="hidden" disabled={isUploadingObj} onChange={handleImageUpload} />
              </label>
              <button onClick={() => {
                handleItemChange(item.id, 'imageFit', (item.imageFit || 'fit') === 'fit' ? 'fill' : 'fit');
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }} className="cursor-pointer bg-white/90 border border-gray-300 text-gray-700 px-3 py-1.5 rounded shadow-sm hover:bg-white flex items-center text-xs font-bold transition-colors" title="รีเซ็ตและเปลี่ยนรูปแบบการจัดวางรูปภาพ">
                {(item.imageFit || 'fit') === 'fit' ? 'โหมด: พอดีภาพ (Fit)' : 'โหมด: เต็มกรอบ (Fill)'}
              </button>
              
              {/* FIX: Dynamic toggle button to let users reopen the floating panel if closed */}
              <button 
                onClick={() => {
                  setShowControls(prev => {
                    const next = !prev;
                    if (next) {
                      // Ensure panel is in comfortable view
                      setPanelPos(pos => {
                        const winW = typeof window !== 'undefined' ? window.innerWidth : 1024;
                        const winH = typeof window !== 'undefined' ? window.innerHeight : 768;
                        const targetX = winW > 1024 ? Math.max(20, winW - 360) : 20;
                        const targetY = Math.min(Math.max(60, pos.y), Math.max(60, winH - 400));
                        return { x: targetX, y: targetY };
                      });
                    }
                    return next;
                  });
                }} 
                className={`cursor-pointer px-3 py-1.5 rounded shadow-sm flex items-center text-xs font-bold transition-colors ${showControls ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white animate-pulse'}`} 
                title="เปิด/ปิด แผงเครื่องมือควบคุมหน้างาน"
              >
                <Settings size={14} className={`mr-1.5 ${showControls ? '' : 'animate-spin'}`}/> 
                {showControls ? 'ซ่อนชุดเครื่องมือ' : 'เปิดชุดเครื่องมือ'}
              </button>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-100 bg-gray-50 no-print">
            <label className={`cursor-pointer bg-white text-blue-600 border border-blue-600 px-6 py-3 rounded-lg shadow-sm flex items-center transition-colors font-bold ${isUploadingObj ? 'opacity-50 cursor-wait' : 'hover:bg-blue-50'}`}>
              <Upload size={20} className="mr-2" /> {isUploadingObj ? 'กำลังอัปโหลด...' : 'อัปโหลดรูปหน้างาน'}
              <input type="file" accept={ACCEPTED_IMAGE_FORMATS} className="hidden" disabled={isUploadingObj} onChange={handleImageUpload} />
            </label>
          </div>
        )}
      </div>

      {displayImage && showControls && typeof document !== 'undefined' && createPortal(
        <div 
          style={{ position: 'fixed', left: `${panelPos.x}px`, top: `${panelPos.y}px`, zIndex: 99999999 }}
          className="w-[90vw] sm:w-[340px] max-w-[340px] bg-white/95 backdrop-blur-md border border-gray-300 rounded shadow-2xl flex flex-col no-print cursor-default transition-shadow"
          onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}
        >
          <div onMouseDown={onPanelMouseDown} onTouchStart={onPanelMouseDown} className="bg-gray-800 text-white px-3 py-2 flex justify-between items-center cursor-move rounded-t selection:bg-transparent">
            <span className="font-bold text-xs flex items-center"><Move size={14} className="mr-1"/> เครื่องมือพื้นที่ (ลากจัดวางได้)</span>
            <button onClick={() => setShowControls(false)} className="hover:text-red-400 text-gray-300 transition-colors"><X size={16}/></button>
          </div>
          
          <div className="flex gap-1 p-2 bg-gray-100 border-b">
            <button onClick={() => setMode('pan')} className={`flex-1 flex justify-center items-center px-2 py-1.5 rounded text-xs font-bold transition-colors ${mode === 'pan' ? 'bg-indigo-600 text-white shadow' : 'bg-white border text-gray-700 hover:bg-gray-50'}`}><Move size={14} className="mr-1"/> เลื่อน/ซูม</button>
            <button onClick={() => setMode('draw')} className={`flex-1 flex justify-center items-center px-2 py-1.5 rounded text-xs font-bold transition-colors ${mode === 'draw' ? 'bg-red-500 text-white shadow' : 'bg-white border text-gray-700 hover:bg-gray-50'}`}><MousePointerClick size={14} className="mr-1"/> จัดการพื้นที่</button>
          </div>

          <div className="p-2 text-sm flex flex-col gap-2 max-h-[350px] overflow-y-auto">
            <div className="flex justify-between items-center">
               <button onClick={handleAddArea} className="bg-green-600 text-white px-3 py-1.5 rounded shadow-sm font-bold flex items-center text-xs hover:bg-green-700"><Plus size={14} className="mr-1"/> เพิ่มบานย่อย</button>
               {mode === 'draw' && activeAreaId && isDrawing && <span className="text-red-500 font-bold bg-red-50 px-2 py-1 rounded border border-red-200 text-[10px] animate-pulse">คลิกจุดเริ่มต้น เพื่อจบเส้น (ESC)</span>}
            </div>

            {item.areas.map((area: any, idx: number) => {
              const isActive = activeAreaId === area.id;
              const autoMaskType = (area.styleMain1 || item.styleMain1 || item.styleMain || '').match(/ม่านม้วน|ม่านพับ|มู่ลี่|ม่านปรับแสง/) ? 'height' : 'width';
              return (
                <div key={area.id} className={`flex flex-col gap-2 border p-2 rounded bg-white transition-all ${isActive ? 'border-blue-400 ring-2 ring-blue-100 shadow-md' : 'border-gray-200'}`}>
                  <div className="flex flex-wrap gap-1 items-center justify-between">
                    <div className="flex gap-1 items-center">
                      <button onClick={() => { setActiveAreaId(isActive ? null : area.id); if(!isActive) setIsDrawing(false); setMode('draw'); }} className={`px-2 py-1 rounded border font-bold flex items-center text-[10px] ${isActive ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}`}>บานที่ {idx + 1}</button>
                      {isActive && <button onClick={() => setIsDrawing(!isDrawing)} className={`px-2 py-1 text-[10px] rounded font-bold shadow-sm transition-colors ${isDrawing ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>{isDrawing ? 'หยุดวาดจุด' : '+ วาดจุดเพิ่ม'}</button>}
                    </div>
                    <div className="flex items-center gap-1 ml-auto">
                       <button onClick={() => handleUpdateArea(area.id, 'points', [])} className="text-[10px] text-orange-600 hover:bg-orange-50 px-2 py-1 rounded border border-orange-200 font-bold">ล้างเส้น</button>
                       <button onClick={() => handleRemoveArea(area.id)} className="bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 px-2 py-1 rounded border border-red-200" title="ลบพื้นที่"><Trash2 size={12}/></button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 justify-between w-full mt-1">
                    <div className="flex items-center border px-2 py-1 rounded bg-gray-50 flex-1">
                      <span className="text-gray-500 text-xs font-bold whitespace-nowrap mr-1">กว้าง:</span>
                      <input type="text" placeholder="ซม." value={area.width} onChange={(e)=>handleUpdateArea(area.id, 'width', e.target.value)} className="w-10 bg-transparent outline-none border-b border-gray-300 focus:border-blue-500 text-center text-blue-700 font-bold text-xs h-5"/>
                      <select value={area.wPos || 'top'} onChange={(e)=>handleUpdateArea(area.id, 'wPos', e.target.value)} className="text-[10px] bg-transparent outline-none cursor-pointer ml-auto"><option value="top">บน</option><option value="bottom">ล่าง</option></select>
                    </div>
                    <div className="flex items-center border px-2 py-1 rounded bg-gray-50 flex-1">
                      <span className="text-gray-500 text-xs font-bold whitespace-nowrap mr-1">สูง:</span>
                      <input type="text" placeholder="ซม." value={area.height} onChange={(e)=>handleUpdateArea(area.id, 'height', e.target.value)} className="w-10 bg-transparent outline-none border-b border-gray-300 focus:border-blue-500 text-center text-blue-700 font-bold text-xs h-5"/>
                      <select value={area.hPos || 'right'} onChange={(e)=>handleUpdateArea(area.id, 'hPos', e.target.value)} className="text-[10px] bg-transparent outline-none cursor-pointer ml-auto"><option value="left">ซ้าย</option><option value="right">ขวา</option></select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 border-t pt-2 mt-1 bg-blue-50/30 p-2 rounded">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-indigo-800">รูปแบบ Mask:</span>
                      <select value={area.maskType || autoMaskType} onChange={(e)=>handleUpdateArea(area.id, 'maskType', e.target.value)} className="border border-indigo-200 rounded bg-white px-2 py-1 outline-none text-indigo-700 font-bold text-[11px] h-7"><option value="width">เปิดข้าง (จีบ/ลอน)</option><option value="height">ดึงลง (ม้วน/พับ/มู่ลี่)</option></select>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                      <label className="flex items-center gap-1"><span className="font-bold text-gray-600">สัดส่วนผ้า:</span>
                        <select value={area.maskPct || 20} onChange={(e)=>handleUpdateArea(area.id, 'maskPct', parseInt(e.target.value))} className="border rounded bg-white px-1 py-0.5 outline-none text-blue-700 font-bold h-7">{[10, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100].map(sz => <option key={sz} value={sz}>{sz}%</option>)}</select>
                      </label>
                      <label className="flex items-center gap-1"><span className="font-bold text-gray-600">ความทึบ:</span>
                        <select value={area.maskOpacity ?? 87} onChange={(e)=>handleUpdateArea(area.id, 'maskOpacity', parseInt(e.target.value))} className="border rounded bg-white px-1 py-0.5 outline-none text-blue-700 font-bold h-7">{[10, 20, 30, 40, 50, 60, 70, 80, 87, 90, 100].map(sz => <option key={sz} value={sz}>{sz}%</option>)}</select>
                      </label>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1.5 border-t pt-1.5 border-indigo-100">
                      <span className="font-bold text-gray-600">สเกลลายผ้า:</span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="range" 
                          min="10" 
                          max="200" 
                          step="10" 
                          value={area.patternScale || 100} 
                          onChange={(e)=>handleUpdateArea(area.id, 'patternScale', parseInt(e.target.value))}
                          className="w-24 h-1.5 bg-gray-200 rounded-lg cursor-pointer accent-indigo-600"
                        />
                        <span className="font-bold text-blue-700 w-8 text-right">{area.patternScale || 100}%</span>
                      </div>
                    </div>

                     {/* Blinds configuration if style is Blinds/Adjustable (มู่ลี่ / ม่านปรับแสง) */}
                    {(() => {
                      const styleMain1 = area.styleMain1 || item.styleMain1 || item.styleMain || '';
                      const isBlindsHoriz = styleMain1.includes('มู่ลี่');
                      const isBlindsVert = styleMain1.includes('ม่านปรับแสง');
                      const isBlindsStyle = isBlindsHoriz || isBlindsVert;
                      if (!isBlindsStyle) return null;

                      const slatSize = area.blindsSlatSize || (isBlindsHoriz ? 14 : 36);
                      const hasAutoTape = !!(area.fabrics?.find((f: any) => 
                        f.name?.toUpperCase().includes('TAPE FOR BLINDS') || 
                        f.name?.toUpperCase().includes('TAPE') || 
                        f.name?.includes('เทป') ||
                        f.subType?.toUpperCase().includes('TAPE') ||
                        f.subType?.includes('เทป')
                      ) || item.areas?.flatMap((a: any) => a.fabrics || [])?.find((f: any) => 
                        f.name?.toUpperCase().includes('TAPE FOR BLINDS') || 
                        f.name?.toUpperCase().includes('TAPE') || 
                        f.name?.includes('เทป') ||
                        f.subType?.toUpperCase().includes('TAPE') ||
                        f.subType?.includes('เทป')
                      ));

                      return (
                        <div className="flex flex-col gap-1.5 border-t pt-1.5 mt-1 border-dashed border-indigo-100 bg-indigo-50/20 p-1.5 rounded">
                          {/* Slat size selector S M L XL */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-gray-600">ขนาดซี่ใบมู่ลี่:</span>
                            <div className="flex bg-gray-100 p-0.5 rounded border border-gray-200 gap-1">
                              {['S', 'M', 'L', 'XL'].map((sizeOpt) => {
                                let sizeVal = 14;
                                if (isBlindsHoriz) {
                                  if (sizeOpt === 'S') sizeVal = 10;
                                  else if (sizeOpt === 'M') sizeVal = 14;
                                  else if (sizeOpt === 'L') sizeVal = 25;
                                  else if (sizeOpt === 'XL') sizeVal = 38;
                                } else {
                                  if (sizeOpt === 'S') sizeVal = 24;
                                  else if (sizeOpt === 'M') sizeVal = 36;
                                  else if (sizeOpt === 'L') sizeVal = 55;
                                  else if (sizeOpt === 'XL') sizeVal = 80;
                                }
                                
                                const currentSlatSize = area.blindsSlatSize || (isBlindsHoriz ? 14 : 36);
                                const isActive = currentSlatSize === sizeVal;
                                
                                return (
                                  <button
                                    key={sizeOpt}
                                    type="button"
                                    onClick={() => handleUpdateArea(area.id, 'blindsSlatSize', sizeVal)}
                                    className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all ${isActive ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-white hover:text-gray-900'}`}
                                  >
                                    {sizeOpt}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Slat auto-tilt / angle slider */}
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-gray-600">เอียงใบอัตโนมัติ:</span>
                              <input 
                                type="checkbox" 
                                checked={area.autoTilt !== false} 
                                onChange={(e)=>handleUpdateArea(area.id, 'autoTilt', e.target.checked)}
                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                              />
                            </div>
                            {area.autoTilt === false && (
                              <div className="flex items-center justify-between text-xs pl-2 border-l border-gray-200">
                                <span className="text-gray-500">ปรับองศาเอียง:</span>
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="range" 
                                    min="-60" 
                                    max="60" 
                                    step="1" 
                                    value={area.blindsAngle || 0} 
                                    onChange={(e)=>handleUpdateArea(area.id, 'blindsAngle', parseInt(e.target.value))}
                                    className="w-16 h-1.5 bg-gray-200 rounded-lg cursor-pointer accent-indigo-600"
                                  />
                                  <span className="font-bold text-blue-700 w-8 text-right">{area.blindsAngle || 0}°</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Blinds decorative tape (horizontal blinds only) */}
                          {isBlindsHoriz && (
                            <div className="flex flex-col gap-1.5 border-t border-indigo-100 pt-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-gray-600">เปิดใช้เทปผ้า:</span>
                                <input 
                                  type="checkbox" 
                                  checked={!!area.useBlindsTape || hasAutoTape} 
                                  onChange={(e)=>handleUpdateArea(area.id, 'useBlindsTape', e.target.checked)}
                                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                />
                              </div>
                              {(area.useBlindsTape || hasAutoTape) && (
                                <>
                                  <div className="flex items-center justify-between text-xs pl-2 border-l border-gray-200">
                                    <span className="text-gray-500 text-[10px]">ขนาดเทปผ้า:</span>
                                    <div className="flex items-center gap-2">
                                      <input 
                                        type="range" 
                                        min="4" 
                                        max="40" 
                                        step="1" 
                                        value={area.blindsTapeWidth !== undefined ? area.blindsTapeWidth : Math.round(slatSize * 0.8)} 
                                        onChange={(e)=>handleUpdateArea(area.id, 'blindsTapeWidth', parseInt(e.target.value))}
                                        className="w-16 h-1 bg-gray-200 rounded-lg cursor-pointer accent-indigo-600"
                                      />
                                      <span className="font-bold text-blue-700 text-[10px] w-6 text-right">
                                        {area.blindsTapeWidth !== undefined ? area.blindsTapeWidth : Math.round(slatSize * 0.8)}px
                                      </span>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex flex-wrap gap-2 items-center text-xs border-t pt-2 mt-1 justify-between">
                    <div className="flex items-center gap-1.5"><span className="font-bold text-gray-700">สี:</span>
                      {PRESET_COLORS.map(c => <button key={c} onClick={(e) => { e.stopPropagation(); handleUpdateArea(area.id, 'lineColor', c); handleUpdateArea(area.id, 'labelColor', c); }} className={`w-4 h-4 rounded-full border ${area.lineColor === c ? 'ring-2 ring-offset-1 ring-blue-500 border-transparent' : 'border-gray-300'}`} style={{ backgroundColor: c }} />)}
                    </div>
                    <label className="flex items-center"><span className="font-bold mr-1 text-gray-700">อักษร:</span>
                      <select value={area.labelSize || 14} onChange={(e)=>handleUpdateArea(area.id, 'labelSize', parseInt(e.target.value))} className="border rounded bg-white px-1 py-0.5 outline-none font-bold text-blue-700 h-7">{[10, 12, 14, 16, 18, 20, 24, 28, 32].map(sz => <option key={sz} value={sz}>{sz}px</option>)}</select>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>,
        document.body
      )}

      {/* Floating edge-role right-click context menu */}
      {edgeMenu && (() => {
        const area = item.areas.find((a: any) => a.id === edgeMenu.areaId);
        if (!area) return null;
        const currentRole = area.edgeTypes?.[edgeMenu.segmentIndex] || null;
        
        return (
          <div 
            style={{ 
              position: 'absolute', 
              left: edgeMenu.x, 
              top: edgeMenu.y,
              zIndex: 100000005
            }}
            className="bg-white border border-gray-300 rounded-lg shadow-2xl py-1 w-52 no-print cursor-default select-none animate-in fade-in zoom-in-95 duration-100"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50">
              กำหนดประเภทเส้นกรอบ
            </div>
            
            {[
              { type: 'top', label: 'ส่วนหัว (Top Edge)', desc: 'กำหนดองศาด้านบนและตำแหน่งป้าย', icon: '🔝', color: 'text-sky-600' },
              { type: 'bottom', label: 'ส่วนล่าง (Bottom Edge)', desc: 'กำหนดองศาด้านล่างและตำแหน่งป้าย', icon: '🔜', color: 'text-emerald-600' },
              { type: 'left', label: 'ส่วนซ้าย (Left Edge)', desc: 'กำหนดตำแหน่งป้ายความสูงซ้าย', icon: '⬅️', color: 'text-purple-600' },
              { type: 'right', label: 'ส่วนขวา (Right Edge)', desc: 'กำหนดตำแหน่งป้ายความสูงขวา', icon: '➡️', color: 'text-amber-600' },
              { type: null, label: 'ทั่วไป (Normal/Reset)', desc: 'ใช้ค่าคำนวณอัตโนมัติ', icon: '🔄', color: 'text-gray-500' }
            ].map((opt) => {
              const isSel = currentRole === opt.type;
              return (
                <button
                  key={opt.type || 'reset'}
                  onClick={() => handleSetEdgeType(edgeMenu.areaId, edgeMenu.segmentIndex, opt.type as any)}
                  className={`w-full text-left px-3 py-1.5 hover:bg-gray-50 flex flex-col transition-colors ${isSel ? 'bg-indigo-50/70 border-l-2 border-indigo-500' : ''}`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-700">
                    <span className={opt.color}>{opt.icon}</span>
                    <span className={isSel ? 'text-indigo-700' : ''}>{opt.label}</span>
                    {isSel && <span className="ml-auto text-[8px] bg-indigo-600 text-white px-1 py-0.2 rounded font-bold">เลือกอยู่</span>}
                  </div>
                  <span className="text-[9px] text-gray-400 pl-5 leading-tight">{opt.desc}</span>
                </button>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
});

ImageAreaEditor.displayName = 'ImageAreaEditor';
