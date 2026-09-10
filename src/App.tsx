import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, Printer, Upload, Download, Save, X, Settings, Database, Move, Users, LogOut, FileText, ArrowLeft, Share2, ChevronLeft, ChevronRight, Copy, ChevronUp, ChevronDown, Undo, Redo, Sparkles } from 'lucide-react';
import { onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { doc, getDoc, getDocs, setDoc, deleteDoc, collection, onSnapshot } from 'firebase/firestore';

import { auth, db, appId } from './firebase';
import { DEFAULT_DB, DEFAULT_ACCOUNTS, PRESET_COLORS, ACCEPTED_IMAGE_FORMATS, CurtainItem, AreaItem, GeneralInfo, Account } from './types';
import { optImg, processImageFile, uploadImageToCloudinary } from './utils';

import { AlertDialog, DialogState } from './components/AlertDialog';
import { AutoFitText } from './components/AutoFitText';
import { InfoCard } from './components/InfoCard';
import { CustomFabricModal } from './components/CustomFabricModal';
import { MarginSelector } from './components/MarginSelector';
import { LoginScreen } from './components/LoginScreen';
import { UserManagementModal } from './components/UserManagementModal';
import { DatabaseModal } from './components/DatabaseModal';
import { ImageAreaEditor } from './components/ImageAreaEditor';
import { FabricSelector } from './components/FabricSelector';
import { AiPreviewView } from './components/AiPreviewView';

declare const __initial_auth_token: string | undefined;

const App: React.FC = () => {
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [appUser, setAppUser] = useState<any>(null); 
  const [view, setView] = useState<'dashboard' | 'editor' | 'ai-preview'>('dashboard'); 
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projectOwner, setProjectOwner] = useState(''); 
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [appDB, setAppDB] = useState<any>(DEFAULT_DB);
  const [showDBSettings, setShowDBSettings] = useState(false);
  const [showUserMgmt, setShowUserMgmt] = useState(false);
  const [showCustomFabricModal, setShowCustomFabricModal] = useState(false);
  const [showIOSPrintModal, setShowIOSPrintModal] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [allAccounts, setAllAccounts] = useState<Account[]>(DEFAULT_ACCOUNTS);
  
  const [logoSrc, setLogoSrc] = useState("https://lh3.googleusercontent.com/d/1xT2ysUSWkTcFxs1ztoGxZuQcnO_c66Tu");

  const [searchQuery, setSearchQuery] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');

  const [bgUploadQueue, setBgUploadQueue] = useState<any[]>([]);
  const [bgUploadProgress, setBgUploadProgress] = useState({ current: 0, total: 0, active: false });
  const processingRef = useRef(false);
  const appDBRef = useRef(appDB);

  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoAction = useRef(false);
  const [, setForceUpdate] = useState(false);

  const defaultTerms = `กรณีมีการเปลี่ยนแปลงรายละเอียดจากที่ตกลงไว้ในใบสรุปงานติดตั้งผ้าม่านนี้ ผู้สั่งซื้อยินยอมที่จะชำระเงินเพิ่มในส่วนของ\n(A) ค่าแก้ไขผ้าม่านและอุปกรณ์ เช่น ความสูง ความกว้างของผ้าม่าน รางม่าน ที่เกิดจากหน้างานเปลี่ยนแปลง บิ้วท์อินเพิ่มเติม ฯลฯ\n(B) ค่าติดตั้งรางละ 200 บาท\n(C) ค่าเดินทาง 1,500 บาท ใน กทม. (ต่างจังหวัดคิดตามระยะทาง)\n(D) สีสินค้าจริงอาจแตกต่างจากภาพแสดงผลเล็กน้อย เนื่องจากข้อจำกัดด้านการถ่ายภาพและหน้าจอแสดงผล\nการเลื่อนคิวงานติตตั้ง ขอความกรุณาลูกค้าแจ้งพนักงานขายก่อนวันติดตั้ง อย่างน้อย 5 วันทำการ ถ้าน้อยกว่า 5 วัน จะมีค่าดำเนินการ 3,000 บาท / ครั้ง\nบริษัทฯ จะรับผิดชอบดำเนินการแก้ไขงาน ในกรณีที่ความผิดพลาดเกิดจากบริษัทฯ เท่านั้น`;

  const [generalInfo, setGeneralInfo] = useState<GeneralInfo>({
    surveyDate: new Date().toISOString().split('T')[0], confirmDate: '', installDates: [], location: '',
    customerName: '', customerPhone: '', agentName: '', agentPhone: '', customFabrics: [],
    creatorName: '', creatorSignature: '',
    terms: defaultTerms
  });
  const [tempInstallDate, setTempInstallDate] = useState('');
  const [items, setItems] = useState<CurtainItem[]>([]);

  useEffect(() => {
    const processLogo = () => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (h > 200) { w = Math.round(w * (200 / h)); h = 200; }
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const imgData = ctx.getImageData(0, 0, w, h);
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
              if (data[i] > 210 && data[i+1] > 210 && data[i+2] > 210) data[i+3] = 0; 
            }
            ctx.putImageData(imgData, 0, 0);
          }
          setLogoSrc(canvas.toDataURL('image/png'));
        } catch (e) { console.warn("Logo CORS error, using CSS fallback."); }
      };
      img.src = "https://lh3.googleusercontent.com/d/1xT2ysUSWkTcFxs1ztoGxZuQcnO_c66Tu";
    };
    processLogo();
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('curtainAppUser');
    if (storedUser) setAppUser(JSON.parse(storedUser));
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try { await signInWithCustomToken(auth, __initial_auth_token); } 
          catch (e) { await signInAnonymously(auth); }
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { 
        console.warn("Auth initialization warning (operating in resilient offline mode):", err);
        setFirebaseUser({ uid: 'offline-user', isAnonymous: true });
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) setFirebaseUser(u);
    });
    return () => unsubscribe();
  }, []);

  // Real-time synchronization of accounts across all connected clients
  useEffect(() => {
    if (!firebaseUser) return;
    const unsub = onSnapshot(
      doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'accounts'),
      (snap) => {
        if (snap.exists() && snap.data().users) {
          setAllAccounts(snap.data().users);
          try { localStorage.setItem('backupAccounts', JSON.stringify(snap.data().users)); } catch {}
        } else {
          setAllAccounts(DEFAULT_ACCOUNTS);
        }
      },
      (err) => {
        console.warn("Could not listen to accounts, falling back to cached accounts:", err);
        const cached = localStorage.getItem('backupAccounts');
        if (cached) {
          try { setAllAccounts(JSON.parse(cached)); } catch { setAllAccounts(DEFAULT_ACCOUNTS); }
        } else {
          setAllAccounts(DEFAULT_ACCOUNTS);
        }
      }
    );
    return () => unsub();
  }, [firebaseUser]);

  // Real-time synchronization of projects across all devices & users (everyone sees all shared projects live)
  useEffect(() => {
    if (!firebaseUser || !appUser) return;

    const unsub = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'projects'),
      (snapshot) => {
        const allProjects: any[] = [];
        snapshot.forEach((docSnap) => {
          allProjects.push({ id: docSnap.id, ...docSnap.data() });
        });
        allProjects.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
        setProjectsList(allProjects);
        try {
          localStorage.setItem('backupProjectsList', JSON.stringify(allProjects));
        } catch {}
      },
      (err) => {
        console.warn("Real-time projects listener error, loading from cache:", err);
        try {
          const cached = localStorage.getItem('backupProjectsList');
          if (cached) setProjectsList(JSON.parse(cached));
        } catch {}
      }
    );

    return () => unsub();
  }, [firebaseUser, appUser]);

  const loadProjectsList = useCallback(async () => {
    if (!firebaseUser || !appUser) return;
    try {
      const querySnapshot = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'projects'));
      let allProjects: any[] = [];
      querySnapshot.forEach((docSnap) => allProjects.push({ id: docSnap.id, ...docSnap.data() }));
      allProjects.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
      setProjectsList(allProjects);
      try {
        localStorage.setItem('backupProjectsList', JSON.stringify(allProjects));
      } catch {}
    } catch(e) { 
      console.warn("Load Projects Error (falling back to cache):", e);
      try {
        const cached = localStorage.getItem('backupProjectsList');
        if (cached) setProjectsList(JSON.parse(cached));
      } catch {}
    }
  }, [firebaseUser, appUser]);

  useEffect(() => {
    if (!firebaseUser || !appUser) return;
    const loadAndOpenProjectFromUrl = async () => {
      const params = new URLSearchParams(window.location.search);
      const projId = params.get('projectId') || params.get('project');
      if (projId) {
        try {
          const docSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projects', projId));
          if (docSnap.exists()) {
            const projData = { id: docSnap.id, ...docSnap.data() };
            handleEdit(projData);
            // Clean up query param from browser bar so it doesn't reload edit screen if they refresh
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
          } else {
            const cached = localStorage.getItem(`project_${projId}`);
            if (cached) handleEdit(JSON.parse(cached));
          }
        } catch (err) {
          console.error("Url Load Project Error:", err);
          const cached = localStorage.getItem(`project_${projId}`);
          if (cached) handleEdit(JSON.parse(cached));
        }
      }
    };
    loadAndOpenProjectFromUrl();
  }, [firebaseUser, appUser]);

  useEffect(() => {
    if (view !== 'editor') return; 
    if (isUndoRedoAction.current) { isUndoRedoAction.current = false; return; }
    const timer = setTimeout(() => {
        const currentState = JSON.stringify({ generalInfo, items });
        const lastState = historyRef.current[historyIndexRef.current];
        if (currentState !== lastState) {
            historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
            historyRef.current.push(currentState);
            if (historyRef.current.length > 50) historyRef.current.shift();
            else historyIndexRef.current++;
            setForceUpdate(prev => !prev);
        }
    }, 800); 
    return () => clearTimeout(timer);
  }, [generalInfo, items, view]);

  const undo = () => {
    if (historyIndexRef.current > 0) {
        isUndoRedoAction.current = true;
        historyIndexRef.current--;
        const previousState = JSON.parse(historyRef.current[historyIndexRef.current]);
        setGeneralInfo(previousState.generalInfo); setItems(previousState.items); setForceUpdate(prev => !prev);
    }
  };

  const redo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
        isUndoRedoAction.current = true;
        historyIndexRef.current++;
        const nextState = JSON.parse(historyRef.current[historyIndexRef.current]);
        setGeneralInfo(nextState.generalInfo); setItems(nextState.items); setForceUpdate(prev => !prev);
    }
  };

  useEffect(() => {
    if (!firebaseUser || !appUser) return;
    const unsub = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'appDB'), (snap) => {
      if (snap.exists() && snap.data() && Object.keys(snap.data()).length > 0) {
        const mergedDB = { ...DEFAULT_DB, ...snap.data() };
        setAppDB(mergedDB); appDBRef.current = mergedDB; localStorage.setItem('backupAppDB', JSON.stringify(mergedDB));
      } else {
        const localBackup = localStorage.getItem('backupAppDB');
        if (localBackup) { setAppDB(JSON.parse(localBackup)); appDBRef.current = JSON.parse(localBackup); } 
        else { setAppDB(DEFAULT_DB); appDBRef.current = DEFAULT_DB; }
      }
    }, (err) => {
      console.warn("DB Sync Notification (using local database cache):", err);
      const localBackup = localStorage.getItem('backupAppDB');
      if (localBackup) {
        try {
          const parsed = JSON.parse(localBackup);
          setAppDB(parsed);
          appDBRef.current = parsed;
        } catch {}
      }
    });
    return () => unsub();
  }, [firebaseUser, appUser]);
  
  useEffect(() => { appDBRef.current = appDB; }, [appDB]);

  const saveAppDBToFirebase = async (newDB: any) => {
    try {
      localStorage.setItem('backupAppDB', JSON.stringify(newDB));
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'appDB'), newDB);
      return true;
    } catch (err: any) {
      console.warn("Firestore DB save error, saved locally:", err);
      if (err.code === 'resource-exhausted' || err.message?.includes('large')) {
          setDialog({ type: 'alert', message: 'เกิดข้อผิดพลาด: ข้อมูลรูปภาพในฐานข้อมูลเต็มความจุ (เกิน 1MB) กรุณาลบรูปที่ไม่จำเป็นออกแล้วลองบันทึกใหม่' });
          return false;
      }
      // Saved to localStorage even if offline
      return true;
    }
  };
  
  useEffect(() => {
    const processQueue = async () => {
      processingRef.current = true;
      const queueToProcess = [...bgUploadQueue];
      setBgUploadProgress({ current: 0, total: queueToProcess.length, active: true });
      let successCount = 0, failCount = 0;
      for (let i = 0; i < queueToProcess.length; i++) {
        const task = queueToProcess[i];
        setBgUploadProgress(p => ({ ...p, current: i + 1 }));
        const compressedImg = await processImageFile(task.file, 400, 0.7, undefined);
        if (compressedImg) {
          try {
            const url = await uploadImageToCloudinary(compressedImg); 
            if (url) {
              setAppDB((prev: any) => {
                const newDB = JSON.parse(JSON.stringify(prev));
                if (!newDB.curtainTypes[task.cat]) newDB.curtainTypes[task.cat] = {};
                if (!newDB.curtainTypes[task.cat][task.type]) newDB.curtainTypes[task.cat][task.type] = {};
                if (!newDB.curtainTypes[task.cat][task.type][task.folderName]) newDB.curtainTypes[task.cat][task.type][task.folderName] = {};
                newDB.curtainTypes[task.cat][task.type][task.folderName][task.fileNameWithoutExt] = url;
                return newDB;
              });
              successCount++;
            } else failCount++;
          } catch (err) { failCount++; }
        } else failCount++;
      }
      setTimeout(() => {
        saveAppDBToFirebase(appDBRef.current);
        setDialog({ type: 'alert', message: `✅ อัปโหลดรูปภาพเบื้องหลังเสร็จสิ้น!\nสำเร็จ: ${successCount} รูป\nล้มเหลว: ${failCount} รูป` });
        setBgUploadQueue([]); setBgUploadProgress({ current: 0, total: 0, active: false });
        processingRef.current = false;
      }, 1000);
    };
    if (bgUploadQueue.length > 0 && !processingRef.current) processQueue();
  }, [bgUploadQueue]);

  const addItem = useCallback(() => {
    setItems(prev => [...prev, {
      id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5), image: null, imageFit: 'fill', layers: 2,
      areas: [{ id: Date.now().toString() + '_a1', points: [], width: '', height: '', lineColor: '#EF4444', lineWidth: 2, fabrics: [], labelColor: '#EF4444', labelSize: 14, wPos: 'top', hPos: 'right', maskPct: 20, maskOpacity: 87, maskType: '', styleMain1: '', styleAction1: '', styleMain2: '', styleAction2: '' }],
      roomPos: '', styleMain1: '', styleAction1: '', styleMain2: '', styleAction2: '', tracks: [], bracket: '', accessories: [], hangStyle: '',
      marginLeft: '', customMarginLeft: '', marginRight: '', customMarginRight: '', marginTop: '', customMarginTop: '', marginBottom: '', customMarginBottom: '', note: ''
    }]);
  }, []);

  const handleCreateNew = () => {
    setCurrentProjectId(Date.now().toString());
    const currentUserInfo = allAccounts.find(u => u.username === appUser.username) || appUser;
    setProjectOwner(appUser.username); 
    historyRef.current = []; historyIndexRef.current = -1;
    setGeneralInfo({
      surveyDate: new Date().toISOString().split('T')[0], confirmDate: '', installDates: [], location: '',
      customerName: '', customerPhone: '', agentName: '', agentPhone: '', customFabrics: [],
      creatorName: currentUserInfo.name || currentUserInfo.username, creatorSignature: currentUserInfo.signatureUrl || '', terms: defaultTerms
    });
    setItems([]); 
    setTimeout(() => {
      addItem(); 
      setView('editor');
    }, 50);
  };

  const handleEdit = (proj: any) => {
    setCurrentProjectId(proj.id);
    const ownerAcc = allAccounts.find(u => u.username === proj.owner);
    let cName = proj.generalInfo?.creatorName;
    let cSig = proj.generalInfo?.creatorSignature;
    if (ownerAcc) {
        if (!cName || cName === proj.owner) cName = ownerAcc.name || ownerAcc.username;
        if (!cSig) cSig = ownerAcc.signatureUrl || '';
    }
    setProjectOwner(proj.owner || appUser.username); 
    historyRef.current = []; historyIndexRef.current = -1;
    let loadedTerms = proj.generalInfo?.terms || defaultTerms;
    if (!loadedTerms.includes('(D) สีสินค้าจริง')) {
        if (loadedTerms.includes('(C) ค่าเดินทาง 1,500 บาท ใน กทม.')) {
            loadedTerms = loadedTerms.replace('(C) ค่าเดินทาง 1,500 บาท ใน กทม. (ต่างจังหวัดคิดตามระยะทาง)', '(C) ค่าเดินทาง 1,500 บาท ใน กทม. (ต่างจังหวัดคิดตามระยะทาง)\n(D) สีสินค้าจริงอาจแตกต่างจากภาพแสดงผลเล็กน้อย เนื่องจากข้อจำกัดด้านการถ่ายภาพและหน้าจอแสดงผล');
        } else loadedTerms += '\n(D) สีสินค้าจริงอาจแตกต่างจากภาพแสดงผลเล็กน้อย เนื่องจากข้อจำกัดด้านการถ่ายภาพและหน้าจอแสดงผล';
    }
    setGeneralInfo({ ...proj.generalInfo, customFabrics: proj.generalInfo?.customFabrics || [], creatorName: cName || appUser.name || appUser.username, creatorSignature: cSig || '', terms: loadedTerms });
    const migratedItems = (proj.items || []).map((item: any) => ({
      ...item,
      layers: item.layers || 2,
      styleMain1: item.styleMain1 || item.styleMain || '',
      styleAction1: item.styleAction1 || item.styleAction || '',
      aiImage: item.aiImage || '',
      aiImages: Array.isArray(item.aiImages) ? item.aiImages : (item.aiImage ? [item.aiImage] : []),
      originalImage: item.originalImage || item.image || '',
    }));
    setItems(migratedItems);
    if (migratedItems.length === 0) {
      setTimeout(() => addItem(), 50);
    }
    setView('editor');
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDialog({ 
      type: 'confirm', 
      message: 'คุณต้องการลบใบงานนี้ใช่หรือไม่?', 
      onConfirm: async () => { 
        try { 
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projects', id)); 
        } catch(err) { 
          console.warn("Delete project from Firestore error:", err); 
        }
        try {
          const cached = localStorage.getItem('backupProjectsList');
          if (cached) {
            const list = JSON.parse(cached).filter((p: any) => p.id !== id);
            localStorage.setItem('backupProjectsList', JSON.stringify(list));
          }
          localStorage.removeItem(`project_${id}`);
        } catch {}
        loadProjectsList(); 
      } 
    });
  };

  const saveData = async (customItems?: any) => {
    if (!firebaseUser) return null;
    setSaving(true); setSaveStatus('กำลังบันทึก...');
    const pId = currentProjectId || Date.now().toString();

    // Ensure customItems is strictly an array (ignore MouseEvent if passed directly via onClick={saveData})
    const isCustomArray = Array.isArray(customItems);
    const baseItems = Array.isArray(items) ? items : [];

    // Merge customItems with baseItems to prevent race conditions or losing other items
    let rawList: CurtainItem[] = [];
    if (isCustomArray) {
      const itemMap = new Map<string, CurtainItem>();
      baseItems.forEach(i => itemMap.set(i.id, i));
      customItems.forEach((cItem: any) => {
        const existing = itemMap.get(cItem.id) || ({} as CurtainItem);
        const combinedAiImages = Array.from(new Set([
          ...(cItem.aiImages || []),
          ...(existing.aiImages || []),
          ...(cItem.aiImage ? [cItem.aiImage] : []),
          ...(existing.aiImage ? [existing.aiImage] : []),
        ].filter(Boolean)));
        itemMap.set(cItem.id, {
          ...existing,
          ...cItem,
          aiImage: cItem.aiImage || existing.aiImage || '',
          aiImages: combinedAiImages,
        });
      });
      rawList = Array.from(itemMap.values());
    } else {
      rawList = baseItems;
    }

    // Convert any base64 images to permanent Cloudinary URLs to strictly avoid Firestore 1MB document limit
    const processedItems = await Promise.all(
      rawList.map(async (item) => {
        let aiImg = item.aiImage;
        if (aiImg && typeof aiImg === 'string' && aiImg.startsWith('data:image/')) {
          try {
            const uploadedUrl = await uploadImageToCloudinary(aiImg);
            if (uploadedUrl) aiImg = uploadedUrl;
          } catch (e) {
            console.warn("Could not upload base64 aiImage to Cloudinary:", e);
          }
        }
        let origImg = item.image;
        if (origImg && typeof origImg === 'string' && origImg.startsWith('data:image/')) {
          try {
            const uploadedUrl = await uploadImageToCloudinary(origImg);
            if (uploadedUrl) origImg = uploadedUrl;
          } catch (e) {
            console.warn("Could not upload base64 original image to Cloudinary:", e);
          }
        }

        // Also process any base64 in aiImages history
        let cleanAiImages: string[] = [];
        if (Array.isArray(item.aiImages)) {
          cleanAiImages = await Promise.all(
            item.aiImages.map(async (img) => {
              if (img && typeof img === 'string' && img.startsWith('data:image/')) {
                try {
                  const up = await uploadImageToCloudinary(img);
                  return up || img;
                } catch {
                  return img;
                }
              }
              return img;
            })
          );
        }
        if (aiImg && !cleanAiImages.includes(aiImg)) {
          cleanAiImages.unshift(aiImg);
        }

        return {
          ...item,
          aiImage: aiImg,
          aiImages: cleanAiImages,
          image: origImg,
        };
      })
    );

    setItems(processedItems);

    const projectPayload = { generalInfo, items: processedItems, updatedAt: new Date().toISOString(), owner: projectOwner || appUser.username };

    // Save locally first so data is never lost
    try {
      localStorage.setItem(`project_${pId}`, JSON.stringify({ id: pId, ...projectPayload }));
      const cached = localStorage.getItem('backupProjectsList');
      let projects = cached ? JSON.parse(cached) : [];
      const idx = projects.findIndex((p: any) => p.id === pId);
      if (idx >= 0) projects[idx] = { id: pId, ...projectPayload };
      else projects.unshift({ id: pId, ...projectPayload });
      localStorage.setItem('backupProjectsList', JSON.stringify(projects));
    } catch (e) {
      console.warn("LocalStorage backup warning:", e);
    }

    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projects', pId), projectPayload);
      setCurrentProjectId(pId);
      setSaveStatus('บันทึกสำเร็จ!'); setTimeout(() => setSaveStatus(''), 3000);
      setSaving(false);
      return pId;
    } catch (err) { 
      console.warn("Firestore save warning, saved to local cache:", err);
      setCurrentProjectId(pId);
      setSaveStatus('บันทึกในเครื่องแล้ว'); setTimeout(() => setSaveStatus(''), 3000);
      setSaving(false);
      return pId;
    }
  };

  const isIOSDevice = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  };

  const isInsideIframe = () => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  };

  const printDocument = async () => {
    if (isInsideIframe() && isIOSDevice()) {
      await saveData();
      setShowIOSPrintModal(true);
      return;
    }
    try {
      window.print();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSharePDF = async () => {
    if (isInsideIframe() && isIOSDevice()) {
      await saveData();
      setShowIOSPrintModal(true);
      return;
    }
    const originalTitle = document.title;
    document.title = `ใบสรุปงานติดตั้งผ้าม่าน คุณ ${generalInfo.customerName || 'ลูกค้า'}`;
    try {
      window.print();
    } catch (e) {
      console.error(e);
    }
    setTimeout(() => { document.title = originalTitle; }, 2000);
  };

  const handleOpenInNewTabForPrint = async () => {
    const pId = await saveData();
    if (pId) {
      const cleanUrl = window.location.origin + window.location.pathname + `?projectId=${pId}`;
      window.open(cleanUrl, '_blank');
    }
    setShowIOSPrintModal(false);
  };

  const handleGeneralChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setGeneralInfo(prev => ({ ...prev, [e.target.name]: e.target.value }));
  
  const handleCreatorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) return;
    const u = allAccounts.find(acc => (acc.name || acc.username) === val);
    setDialog({
      type: 'confirm', message: `ยืนยันการเปลี่ยนผู้จัดทำเป็น "${val}" ใช่หรือไม่?\n\n(การเปลี่ยนผู้จัดทำ จะโอนสิทธิ์ความเป็นเจ้าของงานให้พนักงานคนนี้ในหน้า Dashboard ทันที)`,
      onConfirm: () => { setGeneralInfo(prev => ({ ...prev, creatorName: val, creatorSignature: u ? (u.signatureUrl || '') : prev.creatorSignature })); if (u) setProjectOwner(u.username); }
    });
  };

  const addInstallDate = useCallback(() => { 
      if (tempInstallDate && !generalInfo.installDates.includes(tempInstallDate)) { 
          setGeneralInfo(prev => ({ ...prev, installDates: [...prev.installDates, tempInstallDate] })); setTempInstallDate(''); 
      } 
  }, [tempInstallDate, generalInfo.installDates]);

  const removeInstallDate = useCallback((date: string) => { setGeneralInfo(prev => ({ ...prev, installDates: prev.installDates.filter(d => d !== date) })); }, []);

  const removeItem = useCallback((id: string) => setItems(prev => prev.filter(item => item.id !== id)), []);
  
  const duplicateItem = useCallback((index: number) => {
    setItems(prev => {
      const newItem = JSON.parse(JSON.stringify(prev[index])); 
      newItem.id = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5);
      newItem.areas = newItem.areas.map((area: any) => ({ ...area, id: Date.now().toString() + '_a' + Math.random().toString(36).substr(2, 5), fabrics: area.fabrics.map((fab: any) => ({ ...fab, id: Date.now().toString() + '_f' + Math.random().toString(36).substr(2, 5) })) }));
      const newItems = [...prev]; newItems.splice(index + 1, 0, newItem); return newItems;
    });
  }, []);

  const moveItemUp = useCallback((index: number) => {
    setItems(prev => { 
      if (index === 0) return prev;
      const newItems = [...prev]; [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]]; return newItems; 
    });
  }, []);

  const moveItemDown = useCallback((index: number) => {
    setItems(prev => {
      if (index === prev.length - 1) return prev;
      const newItems = [...prev]; [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]]; return newItems;
    });
  }, []);

  const handleItemChange = useCallback((id: string, field: string, value: any) => { setItems(prevItems => prevItems.map(item => item.id === id ? { ...item, [field]: value } : item)); }, []);

  const updateAreaField = useCallback((itemId: string, areaId: string, field: string, value: any) => {
    setItems(prevItems => prevItems.map(item => item.id === itemId ? { ...item, areas: item.areas.map((a: any) => a.id === areaId ? { ...a, [field]: value } : a) } : item));
  }, []);

  const handleLayerChange = useCallback((id: string, newLayerVal: number) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id === id) return newLayerVal === 1 ? { ...item, layers: 1, styleMain2: '', styleAction2: '' } : { ...item, layers: 2 };
      return item;
    }));
  }, []);

  const addFabricToArea = useCallback((itemId: string, areaId: string) => {
    setItems(prevItems => prevItems.map(item => item.id === itemId ? { ...item, areas: item.areas.map((a: any) => a.id === areaId ? { ...a, fabrics: [...a.fabrics, { id: Date.now().toString(), mainType: '', subType: '', name: '', color: '' }] } : a) } : item));
  }, []);
  
  const updateFabric = useCallback((itemId: string, areaId: string, fabricId: string, updates: any) => {
    setItems(prevItems => prevItems.map(item => item.id === itemId ? { ...item, areas: item.areas.map((a: any) => a.id === areaId ? { ...a, fabrics: a.fabrics.map((f: any) => f.id === fabricId ? { ...f, ...updates } : f) } : a) } : item));
  }, []);
  
  const removeFabric = useCallback((itemId: string, areaId: string, fabricId: string) => {
    setItems(prevItems => prevItems.map(item => item.id === itemId ? { ...item, areas: item.areas.map((a: any) => a.id === areaId ? { ...a, fabrics: a.fabrics.filter((f: any) => f.id !== fabricId) } : a) } : item));
  }, []);

  const handleMultiSelect = useCallback((itemId: string, field: string, value: string) => {
    if (!value.trim()) return;
    setItems(prevItems => prevItems.map(item => {
      if (item.id === itemId) {
        const currentList = (item as any)[field] || [];
        return { ...item, [field]: currentList.includes(value) ? currentList.filter((v: any) => v !== value) : [...currentList, value] };
      }
      return item;
    }));
  }, []);

  const getGroupedAreas = (item: any) => {
    const groups: Record<string, any> = {};
    item.areas.forEach((area: any, idx: number) => {
      const w = area.width || '-', h = area.height || '-', s1 = area.styleMain1 || item.styleMain1 || item.styleMain || '-', a1 = area.styleAction1 || item.styleAction1 || item.styleAction || '-', s2 = item.layers === 2 ? (area.styleMain2 || item.styleMain2 || '-') : '', a2 = item.layers === 2 ? (area.styleAction2 || item.styleAction2 || '-') : '';
      let key = `${w}|${h}###${s1}|${a1}|${s2}|${a2}`;
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

  const filteredProjects = projectsList.filter(proj => {
    const q = searchQuery.toLowerCase().trim();
    const cust = (proj.generalInfo?.customerName || '').toLowerCase();
    const loc = (proj.generalInfo?.location || '').toLowerCase();
    const matchSearch = q === '' || cust.includes(q) || loc.includes(q);

    let matchEmployee = true;
    if (filterEmployee === '__mine__') {
      matchEmployee = proj.owner === appUser?.username;
    } else if (filterEmployee) {
      matchEmployee = proj.owner === filterEmployee;
    }
    return matchSearch && matchEmployee;
  });

  const handleLogout = () => { localStorage.removeItem('curtainAppUser'); setAppUser(null); };

  if (!appUser) return <LoginScreen onLogin={setAppUser} isAuthReady={!!firebaseUser} />;

  if (view === 'dashboard') {
    return (
      <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans">
        <AlertDialog dialog={dialog} onClose={() => setDialog(null)} />
        {showUserMgmt && <UserManagementModal show={showUserMgmt} onClose={()=>setShowUserMgmt(false)} setDialog={setDialog} allAccounts={allAccounts} setAllAccounts={setAllAccounts} />}
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between md:items-center bg-white p-4 rounded-lg shadow-sm mb-6 border-b-4 border-blue-600 gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-800">Confirmation Form</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Realtime ซิงค์สด
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">ระบบจัดการใบงานผ้าม่าน - สวัสดีคุณ <span className="font-bold text-blue-600">{appUser.name || appUser.username}</span> {appUser.role === 'admin' && '(Admin)'}</p>
            </div>
            <div className="flex flex-wrap gap-2 md:gap-3">
              {appUser.role === 'admin' && <button onClick={()=>setShowUserMgmt(true)} className="bg-purple-600 text-white px-4 py-2 rounded flex items-center justify-center font-bold hover:bg-purple-700 shadow flex-1 md:flex-none transition-all text-sm h-10"><Users size={16} className="mr-2"/> จัดการพนักงาน</button>}
              <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded flex items-center justify-center font-bold hover:bg-red-600 shadow flex-1 md:flex-none transition-all text-sm h-10"><LogOut size={16} className="mr-2"/> ออกจากระบบ</button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-3">
             <div className="flex items-center gap-2 mr-auto w-full md:w-auto">
               <h2 className="text-xl font-bold text-gray-700 whitespace-nowrap">รายการใบงาน ({filteredProjects.length})</h2>
               <span className="inline-flex sm:hidden items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                 Realtime
               </span>
             </div>
             <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
               <input type="text" placeholder="🔍 ค้นหาชื่อลูกค้า / สถานที่..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-blue-500 shadow-sm w-full sm:w-60 bg-white" />
               <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} className="border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-blue-500 shadow-sm w-full sm:w-auto bg-white h-10">
                 <option value="">- แสดงทุกใบงาน ({projectsList.length}) -</option>
                 <option value="__mine__">★ เฉพาะงานของฉัน ({projectsList.filter(p => p.owner === appUser.username).length})</option>
                 {allAccounts.map(acc => <option key={acc.id} value={acc.username}>ผู้ทำ: {acc.name || acc.username}</option>)}
               </select>
               <button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg flex items-center justify-center font-bold shadow-md transition-colors w-full sm:w-auto shrink-0 text-sm h-10"><Plus size={18} className="mr-1.5"/> สร้างใบงาน</button>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {filteredProjects.map(proj => {
               const creatorNameDisplay = allAccounts.find(a => a.username === proj.owner)?.name || proj.owner;
               const aiCount = (proj.items || []).filter((it: any) => !!it.aiImage).length;
               return (
                 <div key={proj.id} onClick={()=>handleEdit(proj)} className="bg-white p-4 rounded-lg shadow hover:shadow-lg cursor-pointer border border-gray-200 transition-all group relative">
                   <div className="flex justify-between items-start mb-2">
                     <div className="flex items-center gap-3">
                       <div className="bg-blue-100 p-3 rounded-full text-blue-600"><FileText size={24}/></div>
                       <div><h3 className="font-bold text-gray-800 break-words w-48 text-base">{proj.generalInfo?.customerName || 'ไม่มีชื่อลูกค้า'}</h3><p className="text-xs text-gray-500 mt-1">{proj.generalInfo?.location || 'ไม่มีข้อมูลสถานที่'}</p></div>
                     </div>
                     <div className="flex items-center gap-1.5">
                       {aiCount > 0 && (
                         <span className="flex items-center gap-1 text-[11px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200 shadow-sm" title={`มีภาพ AI แล้ว ${aiCount} หน้า`}>
                           <Sparkles size={11} className="text-indigo-600" /> {aiCount} รูป AI
                         </span>
                       )}
                       <button onClick={(e)=>handleDelete(proj.id, e)} className="text-red-400 hover:text-red-600 p-1.5 bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                     </div>
                   </div>
                   <div className="text-xs text-gray-500 mt-4 border-t pt-3 flex justify-between"><span>ผู้ทำ: <span className="font-bold text-gray-700">{creatorNameDisplay}</span></span><span>อัปเดต: {new Date(proj.updatedAt).toLocaleDateString('th-TH')}</span></div>
                 </div>
               )
             })}
             {filteredProjects.length === 0 && <div className="col-span-full text-center p-10 bg-white rounded-lg border-2 border-dashed text-gray-400 font-bold">ไม่พบใบงานที่ค้นหา</div>}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'ai-preview') {
    return (
      <AiPreviewView
        items={items}
        generalInfo={generalInfo}
        appDB={appDB}
        appUser={appUser}
        allAccounts={allAccounts}
        onBack={() => setView('editor')}
        onUpdateItem={(id, updates) => {
          setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
        }}
        setDialog={setDialog}
        onUndo={undo}
        onRedo={redo}
        canUndo={historyIndexRef.current > 0}
        canRedo={historyIndexRef.current < historyRef.current.length - 1}
        onSave={saveData}
        isSaving={saving}
        saveStatus={saveStatus}
        onSharePDF={handleSharePDF}
        onPrint={printDocument}
        logoSrc={logoSrc}
      />
    );
  }

  const displayCreatorName = generalInfo.creatorName || '-';

  return (
    <div className="min-h-screen bg-gray-100 py-8 font-sans print:p-0">
      <AlertDialog dialog={dialog} onClose={() => setDialog(null)} />
      {showDBSettings && <DatabaseModal appDB={appDB} setAppDB={setAppDB} showDBSettings={showDBSettings} setShowDBSettings={setShowDBSettings} saveAppDB={saveAppDBToFirebase} setDialog={setDialog} setBgUploadQueue={setBgUploadQueue} />}
      {showCustomFabricModal && <CustomFabricModal show={showCustomFabricModal} onClose={()=>setShowCustomFabricModal(false)} onAdd={(fab)=>setGeneralInfo(prev=>({...prev, customFabrics: [...(prev.customFabrics||[]), fab]}))} setDialog={setDialog} />}

      {bgUploadProgress.active && (
        <div className="fixed bottom-6 left-6 bg-indigo-900 text-white p-4 rounded-lg shadow-2xl z-[9999999] flex flex-col gap-2 w-72 border border-indigo-700 no-print transition-all">
            <div className="flex items-center justify-between"><span className="font-bold text-sm flex items-center"><Upload size={14} className="mr-2 animate-bounce"/> อัปโหลดรูปลงฐานข้อมูล...</span></div>
            <div className="w-full bg-indigo-950 rounded-full h-2.5 overflow-hidden border border-indigo-800"><div className="bg-emerald-400 h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${(bgUploadProgress.current / bgUploadProgress.total) * 100}%` }}></div></div>
            <div className="flex justify-between text-xs font-bold text-indigo-200"><span>กำลังประมวลผล (แอบทำเบื้องหลัง)</span><span>{bgUploadProgress.current} / {bgUploadProgress.total}</span></div>
        </div>
      )}

      <style>{`
        @media print {
          @page {
            size: 297mm 210mm;
            margin: 10mm;
          }
          html, body {
            width: 100% !important;
            height: 100% !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }
          .no-print { display: none !important; }
          .print-hidden { display: none !important; }
          .print-block { display: block !important; }
          .print-flex { display: flex !important; }
          .avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; }
          
          /* Page Container: exactly 190mm printable height, centered vertically & horizontally */
          .print-center-page {
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
            position: relative !important;
            overflow: hidden !important;
          }
          .print-center-page:last-child,
          .print-center-page-last {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          .space-y-10 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 0 !important;
          }

          /* Outer Frame: exactly 186mm uniform height on EVERY page, centered on 190mm page */
          .print-content-wrapper {
            width: 277mm !important;
            max-width: 277mm !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
          }

          .print-item-frame {
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
          }

          .print-inner-grid {
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
            margin-top: 0 !important;
          }

          .print-left-col {
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

          .print-right-col {
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

          .print-cards-grid {
            height: 48mm !important;
            min-height: 48mm !important;
            max-height: 48mm !important;
            flex-shrink: 0 !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            padding: 4px !important;
          }

          .whitespace-pre-wrap { white-space: pre-wrap !important; word-break: break-word !important; }
          select { display: none !important; }
          
          /* Custom CSS rules to perfectly contain the image and prevent cutoff/overflow in print/PDF */
          .print-fit-container-fit {
            width: auto !important;
            height: auto !important;
            max-width: 100% !important;
            max-height: 100% !important;
            aspect-ratio: var(--aspect-ratio) !important;
            position: relative !important;
            display: block !important;
            align-self: center !important;
            flex-grow: 0 !important;
            flex-shrink: 1 !important;
          }
          .print-fit-container-fill {
            width: auto !important;
            height: auto !important;
            min-width: 100% !important;
            min-height: 100% !important;
            max-width: none !important;
            max-height: none !important;
            aspect-ratio: var(--aspect-ratio) !important;
            position: relative !important;
            display: block !important;
            align-self: center !important;
            flex-grow: 0 !important;
            flex-shrink: 0 !important;
          }
          .print-fit-container-fit img {
            position: relative !important;
            inset: auto !important;
            width: auto !important;
            height: auto !important;
            max-width: 100% !important;
            max-height: 100% !important;
            object-fit: contain !important;
            display: block !important;
          }
          .print-fit-container-fill img {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            height: 100% !important;
            object-fit: fill !important;
            display: block !important;
          }
          .print-fit-container-fit svg,
          .print-fit-container-fill svg {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            height: 100% !important;
          }
        }
      `}</style>

      <div className="max-w-[1200px] mx-auto bg-white shadow-lg p-4 md:p-8 rounded-sm relative z-0 print:shadow-none print:p-0 print:bg-transparent w-full print:max-w-none">
        <div className="print-center-page w-full">
          <div className="print-content-wrapper w-full">
            <div className="mb-6 border-b-2 border-gray-800 pb-3 flex justify-between items-center avoid-break relative">
              <button 
                onClick={async () => {
                  if (saving) return;
                  await saveData();
                  setView('dashboard');
                }} 
                disabled={saving}
                className={`absolute -left-12 md:-left-20 top-1/2 transform -translate-y-1/2 no-print p-2 rounded-full shadow-md transition-colors z-10 ${saving ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
              >
                <ArrowLeft size={24}/>
              </button>
              <div className="w-1/3 text-left flex items-center gap-4">
                <img src={logoSrc} alt="Logo" className="h-10 md:h-14 lg:h-16 object-contain" style={logoSrc.startsWith('data:') ? {} : { mixBlendMode: 'multiply', filter: 'contrast(1.1) brightness(1.1)' }} referrerPolicy="no-referrer" />
                <div className="no-print flex items-center gap-2">
                  {appUser.role === 'admin' && <button onClick={()=>setShowDBSettings(true)} className="bg-gray-700 text-white px-3 py-2 rounded flex items-center hover:bg-gray-800 text-xs shadow font-bold transition-all w-fit h-9"><Settings size={16} className="mr-1.5"/> <span className="hidden md:inline">ฐานข้อมูล</span></button>}
                  <button onClick={async ()=>{ if (!saving) await saveData(); setView('ai-preview'); }} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-3 py-2 rounded flex items-center text-xs shadow font-bold transition-all h-9" title="เปิดหน้า AI Preview จำลองภาพผ้าม่านเสมือนจริง">
                    <Sparkles size={16} className="mr-1.5 text-yellow-300 animate-pulse"/>
                    <span>AI Preview</span>
                  </button>
                </div>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800 w-1/3 text-center">ใบสรุปงานติดตั้งผ้าม่าน</h1>
              <div className="w-1/3 text-right no-print flex items-center justify-end gap-2">
                <div className="text-xs text-right hidden lg:block">
                  <p className="font-bold text-gray-800">คุณ {appUser.name || appUser.username}</p>
                  <p className="text-gray-500 text-[10px]">{appUser.role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : 'พนักงาน (User)'}</p>
                </div>
                <button 
                  onClick={async () => {
                    if (saving) return;
                    await saveData();
                    handleLogout();
                  }} 
                  disabled={saving}
                  className={`border px-2 md:px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm ${saving ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'}`}
                  title="บันทึกและออกจากระบบ"
                >
                  <LogOut size={14}/>
                  <span className="hidden sm:inline">ออกจากระบบ</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-4 md:gap-6 print:gap-4 mb-4 print:mb-2 avoid-break text-sm relative z-0">
              <div className="p-4 print:p-3 border border-gray-300 rounded-md bg-gray-50 flex flex-col justify-between">
                <div>
                  <h2 className="font-bold mb-3 print:mb-2 border-b border-gray-300 pb-1 inline-block text-base text-gray-800">ส่วนผู้จัดทำ</h2>
                  <div className="space-y-2.5 print:space-y-1.5 text-xs">
                    <div className="flex items-center"><span className="w-36 font-bold text-gray-700">วันที่วัดพื้นที่ :</span><input type="date" name="surveyDate" value={generalInfo.surveyDate} onChange={handleGeneralChange} className="flex-1 border-b border-gray-300 outline-none focus:border-blue-500 px-1 bg-transparent h-7 print:h-5 print:font-semibold" /></div>
                    <div className="flex items-center"><span className="w-36 font-bold text-gray-700">วันที่คอนเฟิร์ม :</span><input type="date" name="confirmDate" value={generalInfo.confirmDate} onChange={handleGeneralChange} className="flex-1 border-b border-gray-300 outline-none focus:border-blue-500 px-1 bg-transparent h-7 print:h-5 print:font-semibold" /></div>
                    <div className="flex flex-col"><span className="font-bold mb-1 text-gray-700">วันที่ติดตั้งผ้าม่าน :</span>
                      <div className="flex flex-wrap gap-1.5 items-center min-h-[28px] print:min-h-[22px] border-b border-gray-300 pb-1">
                        {generalInfo.installDates.length > 0 ? generalInfo.installDates.map((d, i) => (<span key={i} className="bg-white px-2 py-0.5 rounded border shadow-sm flex items-center font-bold text-blue-800 print:text-black">{d} <span className="mx-1 print-hidden no-print font-normal text-gray-400">/</span><X size={12} className="ml-1 cursor-pointer text-red-500 no-print hover:bg-red-100 rounded-full" onClick={() => removeInstallDate(d)}/></span>)) : <span className="text-gray-400 italic no-print text-[11px]">ยังไม่ได้ระบุ</span>}
                        <div className="flex items-center ml-auto no-print"><input type="date" value={tempInstallDate} onChange={(e)=>setTempInstallDate(e.target.value)} className="border rounded px-2 py-1 text-xs outline-none focus:border-blue-500 bg-white h-7"/><button onClick={addInstallDate} className="bg-blue-100 text-blue-700 p-1.5 rounded ml-1 hover:bg-blue-200 transition-colors h-7 w-7 flex items-center justify-center font-bold text-sm">+</button></div>
                      </div>
                    </div>
                    <div className="flex flex-col"><span className="font-bold text-gray-700">สถานที่ติดตั้ง :</span><textarea name="location" value={generalInfo.location} onChange={handleGeneralChange} rows={2} className="w-full border border-gray-300 rounded p-2 mt-1 outline-none focus:border-blue-500 print-hidden resize-none bg-white text-xs font-medium"></textarea><div className="hidden print-block w-full mt-1 text-[14px] font-bold whitespace-pre-wrap text-black border-b border-gray-300 pb-1">{generalInfo.location || '-'}</div></div>
                  </div>
                </div>
                <div className="mt-6 print:mt-4 flex flex-col items-center justify-end relative h-22 print:h-20">
                  {generalInfo.creatorSignature && <div className="h-10 print:h-8 w-full flex justify-center items-end mb-1"><img src={optImg(generalInfo.creatorSignature, 300)} className="max-h-full object-contain mix-blend-multiply" alt="signature" referrerPolicy="no-referrer" /></div>}
                  {appUser.role === 'admin' ? (
                    <select value={generalInfo.creatorName || ''} onChange={handleCreatorChange} className="border-b border-gray-400 w-48 text-center text-[15px] font-bold text-blue-800 outline-none appearance-none bg-transparent cursor-pointer print-hidden relative z-10 pb-0.5 h-8">
                      <option value="">- ระบุผู้จัดทำ -</option>{allAccounts.map(a => <option key={a.id} value={a.name || a.username}>{a.name || a.username}</option>)}
                    </select>
                  ) : <div className="border-b border-gray-400 w-48 text-center text-[15px] font-bold text-blue-800 print-hidden relative z-10 pb-0.5">{displayCreatorName}</div>}
                  <div className="hidden print-block w-48 text-center text-[15px] font-bold border-b border-gray-400 pb-0.5 text-black relative z-10">{displayCreatorName}</div>
                  <p className="text-gray-600 text-xs font-bold mt-1">ผู้จัดทำ/เจ้าของงาน</p>
                </div>
              </div>

              <div className="p-4 print:p-3 border border-gray-300 rounded-md bg-blue-50/30 flex flex-col justify-between">
                <div>
                  <h2 className="font-bold mb-3 print:mb-2 border-b border-gray-300 pb-1 inline-block text-base text-gray-800">ส่วนลูกค้า</h2>
                  <div className="space-y-2.5 print:space-y-1.5">
                    <div className="flex items-center"><span className="w-32 font-bold text-gray-700">ชื่อ-นามสกุล :</span><input type="text" name="customerName" value={generalInfo.customerName} onChange={handleGeneralChange} className="flex-1 border-b border-gray-300 outline-none focus:border-blue-500 px-1 font-bold text-blue-800 text-[15px] print:text-black bg-transparent h-7 print:h-5" /></div>
                    <div className="flex items-center"><span className="w-32 font-bold text-gray-700">เบอร์ติดต่อ :</span><input type="text" name="customerPhone" value={generalInfo.customerPhone} onChange={handleGeneralChange} className="flex-1 border-b border-gray-300 outline-none focus:border-blue-500 px-1 font-medium bg-transparent h-7 print:h-5 print:font-semibold text-gray-800" /></div>
                    <div className="flex items-center mt-4 print:mt-2"><span className="w-32 font-bold text-gray-700">ผู้ติดต่อแทน :</span><input type="text" name="agentName" value={generalInfo.agentName} onChange={handleGeneralChange} className="flex-1 border-b border-gray-300 outline-none focus:border-blue-500 px-1 font-medium bg-transparent h-7 print:h-5 print:font-semibold text-gray-800" /></div>
                    <div className="flex items-center"><span className="w-32 font-bold text-gray-700">เบอร์ติดต่อ :</span><input type="text" name="agentPhone" value={generalInfo.agentPhone} onChange={handleGeneralChange} className="flex-1 border-b border-gray-300 outline-none focus:border-blue-500 px-1 font-medium bg-transparent h-7 print:h-5 print:font-semibold text-gray-800" /></div>
                  </div>
                </div>
                <div className="mt-auto pt-6 print:pt-4 text-center flex flex-col items-center justify-end h-22 print:h-20">
                  <p className="border-b border-gray-400 w-48 mx-auto mb-1"></p>
                  <p className="text-gray-600 text-xs font-bold">ผู้สั่งซื้อ</p>
                </div>
              </div>
            </div>

            <div className="mb-6 print:mb-0 avoid-break bg-red-50 p-3 print:p-2.5 rounded border border-red-200 relative z-0">
              <h3 className="font-bold text-red-600 print:text-gray-800 mb-2 print:mb-1 text-sm print:text-[14px] underline">หมายเหตุเงื่อนไข :</h3>
              <textarea name="terms" value={generalInfo.terms} onChange={handleGeneralChange} rows={5} className="w-full text-xs bg-transparent outline-none print-hidden text-gray-700 leading-tight resize-none"></textarea>
              <div className="hidden print-block w-full text-[13px] print:text-[11.5px] print:leading-relaxed text-gray-800 whitespace-pre-wrap font-medium">{generalInfo.terms}</div>
            </div>
          </div>
        </div>

        <hr className="my-6 border-gray-300 no-print" />

        <div className="space-y-10 print:space-y-0 w-full flex flex-col items-center print:block">
          {items.map((item, index) => {
            const primaryArea = item.areas[0] || {};
            const sMain1 = primaryArea.styleMain1 || item.styleMain1 || item.styleMain || '';
            const sMain2 = primaryArea.styleMain2 || item.styleMain2 || '';
            const styleImg1 = sMain1 && appDB.styleImages?.[sMain1];
            
            const getFabImg = (fab: any) => {
              if(!fab) return null;
              if(fab.mainType === 'ผ้านอกระบบ (เฉพาะงานนี้)') {
                return (generalInfo.customFabrics || []).find((f: any) => f.subType === fab.subType && f.name === fab.name && f.color === fab.color)?.image;
              }
              return appDB.curtainTypes[fab.mainType]?.[fab.subType]?.[fab.name]?.[fab.color];
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
              if (lowerCol.includes('ดำ') || lowerCol.includes('black') || lowerCol.includes('charcoal') || lowerCol.includes('เทาเข้ม') || lowerCol.includes('dark') || lowerCol.includes('เข้ม')) return '#1F2937';
              return '#E5E7EB';
            };

            let imgMain = null; let txtMain = ''; let colMain = ''; let colorMainValue = '';
            let imgSheer = null; let txtSheer = ''; let colSheer = ''; let colorSheerValue = '';
            
            let tapeImg = null;
            let tapeText = '';
            let tapeColorValue = '';
            let hasTape = false;
            const isBlindsHoriz = (sMain1 || '').includes('มู่ลี่');
            
            if (item.areas.length > 0) {
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
                   f.name?.toUpperCase().includes('TAPE FOR BLINDS') || 
                   f.name?.toUpperCase().includes('TAPE') || 
                   f.name?.includes('เทป') ||
                   f.subType?.toUpperCase().includes('TAPE') ||
                   f.subType?.includes('เทป')
                 );
                 if (tapeFab) {
                   hasTape = true;
                   tapeImg = getFabImg(tapeFab);
                   tapeText = `${tapeFab.name || ''} ${tapeFab.color || ''}`.trim();
                 }
                 
                 let autoTapeColor = '#8B4513';
                 if (tapeFab && tapeFab.color) {
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
                 tapeColorValue = primaryArea.blindsTapeColor || autoTapeColor;
                 
                 // If item.layers is 2 and we are Horizontal Blinds, the second fabric is likely the tape!
                 // If tape has no image, let's use tapeColorValue as colorSheerValue to fill the background!
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
              if (foundKey) {
                marginImg = appDB.marginImages[foundKey];
              }
            }

            const isLastItem = index === items.length - 1;

            return (
              <div key={item.id} className={`print-center-page w-full relative mb-10 print:mb-0 ${isLastItem ? 'print-center-page-last' : ''}`}>
                <div className="print-content-wrapper print-item-frame w-full border-2 border-gray-800 p-1 relative rounded bg-white hover:z-50 transition-all duration-300 shadow-sm hover:shadow-md">
                  <div className="absolute top-0 left-0 bg-gray-800 text-white px-4 py-1.5 text-sm font-bold z-10 rounded-br flex items-center gap-2 no-print">
                    <span>รายการที่ {index + 1}</span>
                    {item.aiImage && (
                      <span onClick={() => setView('ai-preview')} className="no-print cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-0.5 text-[11px] font-bold rounded-full flex items-center gap-1 shadow-sm transition-colors" title="คลิกเพื่อดูรูป AI">
                        <Sparkles size={11} className="text-yellow-300"/> รูป AI พร้อม
                      </span>
                    )}
                  </div>
                  
                  <div className="no-print absolute -top-4 right-0 sm:right-0 flex gap-1.5 z-30">
                    <button onClick={() => setView('ai-preview')} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full p-2 hover:from-purple-700 hover:to-indigo-700 shadow-md transition-transform hover:scale-110 flex items-center justify-center" title="เปิดหน้า AI Preview"><Sparkles size={16} className="text-yellow-300" /></button>
                    {index > 0 && <button onClick={() => moveItemUp(index)} className="bg-gray-700 text-white rounded-full p-2 hover:bg-gray-800 shadow-md transition-transform hover:scale-110" title="เลื่อนขึ้น"><ChevronUp size={16} /></button>}
                    {index < items.length - 1 && <button onClick={() => moveItemDown(index)} className="bg-gray-700 text-white rounded-full p-2 hover:bg-gray-800 shadow-md transition-transform hover:scale-110" title="เลื่อนลง"><ChevronDown size={16} /></button>}
                    <button onClick={() => duplicateItem(index)} className="bg-blue-500 text-white rounded-full p-2 hover:bg-blue-600 shadow-md transition-transform hover:scale-110" title="ทำสำเนา"><Copy size={16} /></button>
                    <button onClick={() => removeItem(item.id)} className="bg-red-500 text-white rounded-full p-2 hover:bg-red-600 shadow-md transition-transform hover:scale-110" title="ลบ"><Trash2 size={16} /></button>
                  </div>

                  <div className="print-inner-grid border border-gray-300 flex flex-col lg:flex-row print:flex-row h-auto lg:h-[750px] mt-8 md:mt-0 bg-white relative overflow-hidden w-full box-border">
                    <div className="print-left-col w-full lg:w-[70%] min-h-[400px] h-[50vh] sm:h-[60vh] lg:h-full border-b lg:border-b-0 print:border-b-0 lg:border-r print:border-r border-gray-300 flex flex-col bg-white relative z-20">
                      
                      <div className="flex-1 w-full border-b border-gray-300 flex flex-col relative bg-gray-100 shrink-0 overflow-hidden">
                        <ImageAreaEditor item={item} appDB={appDB} handleItemChange={handleItemChange} setDialog={setDialog} idPrefix={`print-${index}`} generalInfo={generalInfo} />
                      </div>
                      
                      <div className="print-cards-grid h-[25%] lg:h-[30%] min-h-[100px] w-full p-2 bg-gray-50 flex items-center overflow-x-auto">
                        <div className="w-full h-full min-w-[350px] md:min-w-[400px] grid grid-cols-4 gap-1.5 sm:gap-2 print:gap-4">
                          <InfoCard title="รูปแบบม่าน" imgUrl={styleImg1} text1={`${sMain1 || '-'} ${item.layers === 2 ? `/ ${sMain2 || '-'}` : ''}`} fallbackType="style" />
                          <InfoCard 
                            title={txtMain || 'ชั้นที่ 1'} 
                            imgUrl={imgMain} 
                            text1={colMain || '-'} 
                            bgColor={colorMainValue}
                            fallbackType="fabric"
                          />
                          <InfoCard 
                            title={item.layers === 2 ? (txtSheer || 'ชั้นที่ 2') : 'ชั้นที่ 2'} 
                            imgUrl={item.layers === 2 ? imgSheer : null} 
                            text1={item.layers === 2 ? (colSheer || '-') : '-'} 
                            isDim={item.layers === 1} 
                            bgColor={item.layers === 2 ? colorSheerValue : ''}
                            fallbackType="sheer"
                          />
                          <InfoCard title="ระยะชายม่าน" imgUrl={marginImg} text1={item.marginBottom || '-'} fallbackType="margin" />
                        </div>
                      </div>
                    </div>

                    <div className="print-right-col w-full lg:w-[30%] text-xs flex flex-col bg-white overflow-y-auto print:overflow-hidden min-h-[400px] lg:h-full relative z-10">
                      <div className="bg-gray-800 text-white p-3 print:bg-white print:text-black print:p-3 print:pb-0 flex flex-col shrink-0">
                        <span className="mb-1 text-gray-300 print-hidden font-bold text-xs">ห้อง / ตำแหน่ง :</span>
                        <textarea value={item.roomPos} onChange={(e)=>handleItemChange(item.id, 'roomPos', e.target.value)} className="w-full bg-transparent outline-none border-b border-gray-500 focus:border-white resize-none text-sm font-bold leading-tight print-hidden placeholder-gray-400 text-yellow-300" placeholder="ระบุห้อง เช่น ชั้น 1 / โถงกลม บานที่ 1" rows={2} />
                        <div className="hidden print-block w-full text-[15px] font-bold leading-tight text-black whitespace-pre-wrap border-b border-gray-800 pb-2 mb-1">{item.roomPos || '-'}</div>
                      </div>
                      
                      <div className="p-3 print:p-2 flex flex-col justify-start lg:justify-between gap-4 print:gap-1.5 flex-1 overflow-y-auto print:overflow-hidden">
                        <div className="border border-gray-300 p-2 rounded bg-gray-50 no-print">
                          <div className="flex justify-between items-center mb-2 border-b border-gray-300 pb-1">
                            <span className="font-bold text-gray-800 text-[14px]">รายละเอียดวัสดุ/ผ้า</span>
                            <button onClick={()=>setShowCustomFabricModal(true)} className="no-print bg-indigo-100 hover:bg-indigo-200 text-indigo-700 border border-indigo-200 px-2 py-1 rounded text-[10px] font-bold shadow-sm transition-colors flex items-center h-6"><Plus size={12} className="mr-0.5"/> ผ้านอกระบบ</button>
                          </div>
                          {item.areas.length === 0 && <span className="text-gray-400 italic no-print text-xs">เพิ่มพื้นที่บนรูปหน้างานก่อน</span>}
                          {item.areas.map((area: any, aIdx: number) => (
                            <div className="mb-3 border-l-[3px] border-blue-500 pl-2 pb-2 border-b border-gray-200" key={area.id}>
                              <div className="font-bold text-blue-800 mb-1.5 flex justify-between items-center bg-blue-50 px-1.5 py-1 rounded text-[12px]">
                                <span>บานที่ {aIdx + 1} <span className="font-normal">(ก:{area.width||'-'} ส:{area.height||'-'})</span></span>
                                {area.fabrics.length < (item.layers || 2) && <button onClick={()=>addFabricToArea(item.id, area.id)} className="text-blue-600 hover:text-blue-800 no-print flex items-center bg-white px-2 py-0.5 border border-blue-200 shadow-sm rounded text-[10px] transition-colors"><Plus size={12} className="mr-0.5"/> เพิ่มผ้า</button>}
                              </div>
                              {area.fabrics.map((fab: any) => <FabricSelector key={fab.id} item={item} area={area} fab={fab} appDB={appDB} generalInfo={generalInfo} updateFabric={updateFabric} removeFabric={removeFabric} />)}
                              <div className="flex flex-col gap-1.5 mt-2 bg-indigo-50/50 p-2 rounded border border-indigo-100">
                                <span className="font-bold text-[10px] text-indigo-800 mb-0.5">รูปแบบการทำงาน (กำหนดเฉพาะบานนี้)</span>
                                <div className="flex gap-1.5 items-center">
                                  <span className="text-[10px] font-bold text-gray-500 w-10 shrink-0">ชั้นที่ 1:</span>
                                  <select value={area.styleMain1 || ''} onChange={(e)=>updateAreaField(item.id, area.id, 'styleMain1', e.target.value)} className="w-[45%] border-b border-gray-300 outline-none text-[11px] bg-transparent font-bold text-gray-700 h-7"><option value="">-ตามเริ่มต้น-</option>{(appDB.styles || []).map((s: string)=><option key={s} value={s}>{s}</option>)}</select>
                                  <select value={area.styleAction1 || ''} onChange={(e)=>updateAreaField(item.id, area.id, 'styleAction1', e.target.value)} className="w-[45%] border-b border-gray-300 outline-none text-[11px] bg-transparent font-bold text-gray-700 h-7"><option value="">-ตามเริ่มต้น-</option>{(appDB.actions || []).map((s: string)=><option key={s} value={s}>{s}</option>)}</select>
                                </div>
                                {item.layers === 2 && (
                                  <div className="flex gap-1.5 items-center mt-1">
                                    <span className="text-[10px] font-bold text-gray-500 w-10 shrink-0">ชั้นที่ 2:</span>
                                    <select value={area.styleMain2 || ''} onChange={(e)=>updateAreaField(item.id, area.id, 'styleMain2', e.target.value)} className="w-[45%] border-b border-gray-300 outline-none text-[11px] bg-transparent font-bold text-gray-700 h-7"><option value="">-ตามเริ่มต้น-</option>{(appDB.styles || []).map((s: string)=><option key={s} value={s}>{s}</option>)}</select>
                                    <select value={area.styleAction2 || ''} onChange={(e)=>updateAreaField(item.id, area.id, 'styleAction2', e.target.value)} className="w-[45%] border-b border-gray-300 outline-none text-[11px] bg-transparent font-bold text-gray-700 h-7"><option value="">-ตามเริ่มต้น-</option>{(appDB.actions || []).map((s: string)=><option key={s} value={s}>{s}</option>)}</select>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="hidden print-block w-full mt-2">
                          <span className="font-bold text-gray-800 text-[14px] border-b border-gray-800 pb-1 mb-2 block">รูปแบบและขนาดม่าน</span>
                          {getGroupedAreas(item).map((grp, gIdx) => (
                             <div key={gIdx} className="mb-3 pl-2 border-l-[3px] border-gray-800">
                                <span className="font-bold text-black text-[13px] block mb-1">{formatBaanLabel(grp.labelNums, item.areas.length)} : <span className="font-normal">ก:{grp.w} ส:{grp.h}</span></span>
                                <div className="text-[12px] leading-snug">
                                   <span className="text-gray-800 block"><span className="font-bold">ชั้นที่ 1:</span> {grp.s1} {grp.a1 !== '-' ? `/ ${grp.a1}` : ''}</span>
                                   {item.layers === 2 && <span className="text-gray-800 block mt-0.5"><span className="font-bold">ชั้นที่ 2:</span> {grp.s2} {grp.a2 !== '-' ? `/ ${grp.a2}` : ''}</span>}
                                </div>
                             </div>
                          ))}
                        </div>

                        <div className="flex flex-col gap-3 py-1 flex-1 justify-start">
                          <div className="flex flex-col print-hidden">
                            <span className="font-bold text-gray-800 text-[14px] border-b border-gray-300 pb-1 mb-1">รูปแบบพิมพ์สรุป (ค่าเริ่มต้นทั้งหมด)</span>
                            <div className="flex items-center gap-4 mb-2 bg-gray-100 p-1.5 rounded">
                              <span className="text-[11px] font-bold text-gray-600">จำนวนชั้นม่าน:</span>
                              <label className="flex items-center gap-1 text-[11px] cursor-pointer font-bold"><input type="radio" checked={item.layers === 1} onChange={()=>handleLayerChange(item.id, 1)}/> 1 ชั้น</label>
                              <label className="flex items-center gap-1 text-[11px] cursor-pointer font-bold"><input type="radio" checked={item.layers !== 1} onChange={()=>handleLayerChange(item.id, 2)}/> 2 ชั้น</label>
                            </div>
                            <div className="flex gap-1.5 items-center mt-0.5">
                              {item.layers !== 1 && <span className="text-[10px] font-bold text-gray-500 w-10 shrink-0">ชั้นที่ 1:</span>}
                              <select value={item.styleMain1 || item.styleMain || ''} onChange={(e)=>handleItemChange(item.id, 'styleMain1', e.target.value)} className="w-[45%] border-b border-gray-400 outline-none bg-transparent text-blue-800 font-bold text-xs h-7"><option value="">-รูปแบบ-</option>{(appDB.styles || []).map((s: string)=><option key={s} value={s}>{s}</option>)}</select>
                              <span className="text-gray-400 font-bold">/</span>
                              <select value={item.styleAction1 || item.styleAction || ''} onChange={(e)=>handleItemChange(item.id, 'styleAction1', e.target.value)} className="w-[45%] border-b border-gray-400 outline-none bg-transparent text-blue-800 font-bold text-xs h-7"><option value="">-เปิดปิด-</option>{(appDB.actions || []).map((s: string)=><option key={s} value={s}>{s}</option>)}</select>
                            </div>
                            {item.layers !== 1 && (
                              <div className="flex gap-1.5 items-center mt-1.5">
                                <span className="text-[10px] font-bold text-gray-500 w-10 shrink-0">ชั้นที่ 2:</span>
                                <select value={item.styleMain2 || ''} onChange={(e)=>handleItemChange(item.id, 'styleMain2', e.target.value)} className="w-[45%] border-b border-gray-400 outline-none bg-transparent text-blue-800 font-bold text-xs h-7"><option value="">-รูปแบบ-</option>{(appDB.styles || []).map((s: string)=><option key={s} value={s}>{s}</option>)}</select>
                                <span className="text-gray-400 font-bold">/</span>
                                <select value={item.styleAction2 || ''} onChange={(e)=>handleItemChange(item.id, 'styleAction2', e.target.value)} className="w-[45%] border-b border-gray-400 outline-none bg-transparent text-blue-800 font-bold text-xs h-7"><option value="">-เปิดปิด-</option>{(appDB.actions || []).map((s: string)=><option key={s} value={s}>{s}</option>)}</select>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col mt-1">
                            <span className="font-bold text-gray-800 text-[14px] border-b border-gray-300 pb-1 mb-1">รางม่าน</span>
                            {/* On-screen chips */}
                            <div className="no-print">
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {item.tracks?.map(tStr => <span key={tStr} className="bg-gray-100 px-2 py-0.5 rounded border border-gray-300 text-[12px] flex items-center shadow-sm font-bold text-gray-800">{tStr} <X size={10} className="ml-1 cursor-pointer text-red-500" onClick={()=>handleMultiSelect(item.id, 'tracks', tStr)}/></span>)}
                              </div>
                              <select className="w-full border-b border-gray-300 outline-none mt-1 text-[11px] text-gray-500 font-medium bg-transparent h-7" onChange={(e) => {if(e.target.value) handleMultiSelect(item.id, 'tracks', e.target.value); e.target.value='';}}><option value="">+ เลือกชนิดรางม่าน</option>{(appDB.tracks || []).map((s: string)=><option key={s} value={s}>{s}</option>)}</select>
                              <div className="flex w-full gap-1 mt-1">
                                 <input type="text" id={`customTrack-${item.id}`} placeholder="หรือพิมพ์ระบุเอง..." className="flex-1 border border-gray-200 rounded px-2 py-1 outline-none text-[11px] bg-white shadow-sm focus:border-blue-400 h-7" onKeyDown={(e: any) => { if(e.key === 'Enter' && e.target.value.trim()) { handleMultiSelect(item.id, 'tracks', e.target.value.trim()); e.target.value=''; } }} />
                                 <button onClick={() => { const inp = document.getElementById(`customTrack-${item.id}`) as HTMLInputElement; if(inp && inp.value.trim()) { handleMultiSelect(item.id, 'tracks', inp.value.trim()); inp.value=''; } }} className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 px-2 py-1 rounded text-[11px] font-bold shadow-sm transition-colors h-7 w-7 flex items-center justify-center">+</button>
                              </div>
                            </div>
                            {/* In print: plain text without border or background, separated by comma */}
                            <div className="hidden print-block text-[13px] font-bold text-gray-800 mt-0.5 whitespace-pre-wrap">
                              {item.tracks && item.tracks.length > 0 ? item.tracks.join(', ') : '-'}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mt-1 text-xs">
                             <div className="flex flex-col"><span className="font-bold text-gray-800 text-[14px] border-b border-gray-300 pb-1 mb-1">ขาจับราง</span><select value={item.bracket} onChange={(e)=>handleItemChange(item.id, 'bracket', e.target.value)} className="border-b border-gray-300 outline-none print-hidden bg-transparent mt-0.5 h-7"><option value="">-ระบุ-</option>{(appDB.brackets || []).map((s: string)=><option key={s} value={s}>{s}</option>)}</select><div className="hidden print-block text-[13px] font-bold mt-1 whitespace-pre-wrap text-gray-800">{item.bracket || '-'}</div></div>
                             <div className="flex flex-col"><span className="font-bold text-gray-800 text-[14px] border-b border-gray-300 pb-1 mb-1">การแขวน</span><select value={item.hangStyle} onChange={(e)=>handleItemChange(item.id, 'hangStyle', e.target.value)} className="border-b border-gray-300 outline-none print-hidden bg-transparent mt-0.5 h-7"><option value="">-ระบุ-</option>{(appDB.hangStyles || []).map((s: string)=><option key={s} value={s}>{s}</option>)}</select><div className="hidden print-block text-[13px] font-bold mt-1 whitespace-pre-wrap text-gray-800">{item.hangStyle || '-'}</div></div>
                          </div>

                          <div className="flex flex-col mt-1">
                            <span className="font-bold text-gray-800 text-[14px] border-b border-gray-300 pb-1 mb-1">อุปกรณ์เสริม</span>
                            {/* On-screen chips */}
                            <div className="no-print">
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {item.accessories?.map(tStr => <span key={tStr} className="bg-gray-100 px-2 py-0.5 rounded border border-gray-300 text-[12px] flex items-center shadow-sm font-bold text-gray-800">{tStr} <X size={10} className="ml-1 cursor-pointer text-red-500" onClick={()=>handleMultiSelect(item.id, 'accessories', tStr)}/></span>)}
                              </div>
                              <select className="w-full border-b border-gray-300 outline-none mt-1 text-[11px] text-gray-500 font-medium bg-transparent h-7" onChange={(e) => {if(e.target.value) handleMultiSelect(item.id, 'accessories', e.target.value); e.target.value='';}}><option value="">+ เลือกอุปกรณ์เสริม</option>{(appDB.accessories || []).map((s: string)=><option key={s} value={s}>{s}</option>)}</select>
                              <div className="flex w-full gap-1 mt-1">
                                 <input type="text" id={`customAcc-${item.id}`} placeholder="หรือพิมพ์ระบุเอง..." className="flex-1 border border-gray-200 rounded px-2 py-1 outline-none text-[11px] bg-white shadow-sm focus:border-blue-400 h-7" onKeyDown={(e: any) => { if(e.key === 'Enter' && e.target.value.trim()) { handleMultiSelect(item.id, 'accessories', e.target.value.trim()); e.target.value=''; } }} />
                                 <button onClick={() => { const inp = document.getElementById(`customAcc-${item.id}`) as HTMLInputElement; if(inp && inp.value.trim()) { handleMultiSelect(item.id, 'accessories', inp.value.trim()); inp.value=''; } }} className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 px-2 py-1 rounded text-[11px] font-bold shadow-sm transition-colors h-7 w-7 flex items-center justify-center">+</button>
                              </div>
                            </div>
                            {/* In print: plain text without border or background, separated by comma */}
                            <div className="hidden print-block text-[13px] font-bold text-gray-800 mt-0.5 whitespace-pre-wrap">
                              {item.accessories && item.accessories.length > 0 ? item.accessories.join(', ') : '-'}
                            </div>
                          </div>
                        </div>

                        <div className="border border-gray-300 p-2 rounded bg-gray-50">
                          <span className="font-bold text-gray-800 block mb-1.5 border-b border-gray-300 pb-1 text-[14px]">ระยะการเผื่อม่าน</span>
                          <div className="grid grid-cols-1 gap-y-2 text-[12px]">
                            <div className="flex gap-3">
                              <MarginSelector label="ด้านซ้าย" field="marginLeft" customField="customMarginLeft" item={item} options={appDB.margins?.horizontal || []} onChange={handleItemChange} />
                              <MarginSelector label="ด้านขวา" field="marginRight" customField="customMarginRight" item={item} options={appDB.margins?.horizontal || []} onChange={handleItemChange} />
                            </div>
                            <div className="flex gap-3 items-start mt-1">
                              <MarginSelector label="ด้านบน" field="marginTop" customField="customMarginTop" item={item} options={appDB.margins?.top || []} onChange={handleItemChange} />
                              <MarginSelector label="ด้านล่าง" field="marginBottom" customField="customMarginBottom" item={item} options={appDB.margins?.bottom || []} onChange={handleItemChange} />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col pt-2 border-t border-gray-300 shrink-0 mt-auto">
                          <span className="font-bold text-red-600 print:text-gray-800 text-[14px] mb-1">หมายเหตุ</span>
                          <textarea value={item.note || ''} onChange={(e)=>handleItemChange(item.id, 'note', e.target.value)} rows={2} className="w-full border border-red-200 rounded p-1.5 text-red-600 focus:outline-none focus:border-red-400 print-hidden resize-none bg-red-50 text-[12px] leading-tight" placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)"></textarea>
                          <div className="hidden print-block w-full text-[13px] leading-relaxed whitespace-pre-wrap font-bold text-red-600">{item.note || '-'}</div>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-8 right-8 flex flex-col gap-4 no-print z-[9999] items-end">
        {view === 'editor' && (
           <div className="flex flex-col items-center bg-gray-800 rounded-full p-1.5 shadow-xl border-2 border-white mb-1 w-[56px] opacity-95">
             <button onClick={undo} disabled={historyIndexRef.current <= 0} className={`py-2.5 px-0 rounded-full transition-all flex items-center justify-center w-full h-[38px] ${historyIndexRef.current <= 0 ? 'text-gray-500 cursor-not-allowed' : 'text-white hover:bg-gray-700'}`} title="เลิกทำ (Undo)"><Undo size={20} /></button>
             <div className="w-8 h-px bg-gray-600 my-0.5"></div>
             <button onClick={redo} disabled={historyIndexRef.current >= historyRef.current.length - 1} className={`py-2.5 px-0 rounded-full transition-all flex items-center justify-center w-full h-[38px] ${historyIndexRef.current >= historyRef.current.length - 1 ? 'text-gray-500 cursor-not-allowed' : 'text-white hover:bg-gray-700'}`} title="ทำซ้ำ (Redo)"><Redo size={20} /></button>
           </div>
        )}
        <button onClick={async () => { if (!saving) await saveData(); setView('ai-preview'); }} className="group relative bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-full p-4 shadow-xl flex items-center justify-center transition-transform hover:scale-110 border-2 border-white w-14 h-14" title="AI Preview ภาพผ้าม่านเสมือนจริง"><Sparkles size={24} className="text-yellow-300 animate-pulse" /><span className="absolute right-[110%] bg-purple-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity mr-2">AI Preview</span></button>
        <button onClick={() => saveData()} disabled={saving} className={`group relative ${saving ? 'bg-gray-500' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-full p-4 shadow-xl flex items-center justify-center transition-transform hover:scale-110 border-2 border-white w-14 h-14`} title="บันทึกงาน"><Save size={24} /><span className="absolute right-[110%] bg-indigo-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity mr-2">บันทึกงาน</span>{saveStatus && <span className="absolute right-[110%] mr-2 bg-green-600 text-white px-3 py-1.5 rounded text-sm font-bold whitespace-nowrap shadow-lg">{saveStatus}</span>}</button>
        <button onClick={addItem} className="group relative bg-green-600 hover:bg-green-700 text-white rounded-full p-4 shadow-xl flex items-center justify-center transition-transform hover:scale-110 border-2 border-white w-14 h-14" title="เพิ่มหน้าต่างบานใหม่"><Plus size={24} /><span className="absolute right-[110%] bg-green-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity mr-2">เพิ่มหน้าต่าง</span></button>
        <button onClick={handleSharePDF} className="group relative bg-orange-500 hover:bg-orange-600 text-white rounded-full p-4 shadow-xl flex items-center justify-center transition-transform hover:scale-110 border-2 border-white w-14 h-14" title="แชร์เป็น PDF (แนวนอน)"><Share2 size={24} /><span className="absolute right-[110%] bg-orange-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity mr-2">แชร์ PDF</span></button>
        <button onClick={printDocument} className="group relative bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-xl flex items-center justify-center transition-transform hover:scale-110 border-2 border-white w-14 h-14" title="พิมพ์เอกสาร"><Printer size={24} /><span className="absolute right-[110%] bg-blue-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity mr-2">พิมพ์</span></button>
      </div>

      {showIOSPrintModal && (
        <div className="fixed inset-0 bg-black/70 z-[99999999] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl p-6 text-center border border-gray-100 flex flex-col items-center">
            <div className="bg-blue-50 p-4 rounded-full text-blue-600 mb-4 animate-bounce">
              <Printer size={32} />
            </div>
            <h3 className="font-bold text-gray-800 text-lg mb-3">คำแนะนำการพิมพ์ / บันทึก PDF บน iPad & iPhone</h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-6 text-left">
              เนื่องจากระบบความปลอดภัยของ iOS บน iPad/iPhone จะบล็อกหน้าต่างการสั่งพิมพ์เมื่อใช้งานผ่าน iFrame ของแอปจำลองนี้<br/><br/>
              <span className="font-bold text-gray-800">วิธีการแก้ไขเพื่อให้พิมพ์และแชร์ได้ปกติ:</span><br/>
              1. กดปุ่ม <span className="font-bold text-blue-600">"เปิดในแท็บใหม่"</span> ด้านล่าง<br/>
              2. ระบบจะเปิดใบงานนี้บนเบราว์เซอร์หลักโดยตรง<br/>
              3. กดปุ่มพิมพ์หรือแชร์ PDF จากในแท็บใหม่ได้ทันทีเลยครับ!
            </p>
            <div className="flex flex-col gap-2 w-full">
              <button 
                onClick={handleOpenInNewTabForPrint} 
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow transition-colors flex items-center justify-center gap-2"
              >
                🌐 เปิดในแท็บใหม่เพื่อพิมพ์/แชร์
              </button>
              <button 
                onClick={() => {
                  setShowIOSPrintModal(false);
                  try { window.print(); } catch (e) {}
                }} 
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-xs transition-colors"
              >
                ลองพิมพ์ในแท็บนี้ต่อไป
              </button>
              <button 
                onClick={() => setShowIOSPrintModal(false)} 
                className="w-full py-2 text-gray-400 hover:text-gray-500 font-bold text-xs transition-colors mt-1"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
