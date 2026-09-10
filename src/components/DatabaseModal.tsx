import React, { useState, useEffect } from 'react';
import { Database, X, ChevronLeft, ChevronRight, Trash2, Upload, Download } from 'lucide-react';
import { processImageFile, uploadImageToCloudinary } from '../utils';
import { ACCEPTED_IMAGE_FORMATS } from '../types';

interface DatabaseModalProps {
  appDB: any;
  setAppDB: any;
  showDBSettings: boolean;
  setShowDBSettings: (show: boolean) => void;
  saveAppDB: (db: any) => Promise<boolean>;
  setDialog: (dialog: any) => void;
  setBgUploadQueue: (queue: any) => void;
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({ 
  appDB, 
  setAppDB, 
  showDBSettings, 
  setShowDBSettings, 
  saveAppDB, 
  setDialog, 
  setBgUploadQueue 
}) => {
  const [activeTab, setActiveTab] = useState('fabrics');
  const [cat, setCat] = useState('ผ้าม่าน');
  const [type, setType] = useState('');
  const [localText, setLocalText] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [searchFabric, setSearchFabric] = useState('');

  useEffect(() => {
    setLocalText({
      styles: (appDB.styles || []).join('\n'),
      actions: (appDB.actions || []).join('\n'),
      tracks: (appDB.tracks || []).join('\n'),
      brackets: (appDB.brackets || []).join('\n'),
      accessories: (appDB.accessories || []).join('\n'),
      hangStyles: (appDB.hangStyles || []).join('\n'),
      margins_bottom: (appDB.margins?.bottom || []).join('\n'),
      margins_top: (appDB.margins?.top || []).join('\n'),
      margins_horizontal: (appDB.margins?.horizontal || []).join('\n')
    });
  }, [appDB, showDBSettings]);

  const handleLocalText = (key: string, value: string) => {
    setLocalText(prev => ({ ...prev, [key]: value }));
    const arr = value.split('\n'); 
    if (key.startsWith('margins_')) {
      const subKey = key.split('_')[1];
      setAppDB((prev: any) => ({ ...prev, margins: { ...(prev.margins || {}), [subKey]: arr } }));
    } else {
      setAppDB((prev: any) => ({ ...prev, [key]: arr }));
    }
  };

  const handleSaveAndClose = async () => {
    const cleanedDB = JSON.parse(JSON.stringify(appDB));
    ['styles', 'actions', 'tracks', 'brackets', 'accessories', 'hangStyles'].forEach(k => {
       if (cleanedDB[k]) cleanedDB[k] = cleanedDB[k].map((s: string)=>s.trim()).filter(Boolean);
    });
    if (cleanedDB.margins) {
       ['bottom', 'top', 'horizontal'].forEach(k => {
          if (cleanedDB.margins[k]) cleanedDB.margins[k] = cleanedDB.margins[k].map((s: string)=>s.trim()).filter(Boolean);
       });
    }
    const success = await saveAppDB(cleanedDB); 
    if (success) {
      setAppDB(cleanedDB);
      setShowDBSettings(false);
    }
  };

  const handleRecoverLocal = async () => {
    const localBackup = localStorage.getItem('backupAppDB');
    if (localBackup) {
      try {
        const parsed = JSON.parse(localBackup);
        if (Object.keys(parsed.curtainTypes?.['ผ้าม่าน'] || {}).length > 0) {
          setAppDB(parsed);
          await saveAppDB(parsed);
          setDialog({ type: 'alert', message: 'กู้คืนข้อมูลจากความจำเครื่องนี้สำเร็จแล้ว! ข้อมูลออนไลน์กลับมาแล้วครับ' });
        } else {
          setDialog({ type: 'alert', message: 'ข้อมูลสำรองในเครื่องนี้ว่างเปล่า ไม่สามารถกู้คืนได้' });
        }
      } catch (e) {
        setDialog({ type: 'alert', message: 'ไฟล์สำรองในเครื่องเสียหาย' });
      }
    } else {
      setDialog({ type: 'alert', message: 'ขออภัย ไม่พบข้อมูลสำรองในเครื่องนี้ กรุณาลองกดปุ่มนี้ในคอมพิวเตอร์เครื่องที่คุณเคยอัปเดตข้อมูลล่าสุด' });
    }
  };

  const handleExportDB = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appDB));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "curtain_db_backup_" + new Date().toISOString().split('T')[0] + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportDB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedDB = JSON.parse(event.target?.result as string);
        if (importedDB && importedDB.curtainTypes) {
          setAppDB(importedDB);
          await saveAppDB(importedDB);
          setDialog({ type: 'alert', message: 'นำเข้าข้อมูลและบันทึกขึ้นระบบออนไลน์สำเร็จ!' });
        } else {
          setDialog({ type: 'alert', message: 'ไฟล์ไม่ถูกต้อง หรือโครงสร้างข้อมูลไม่ตรงกัน' });
        }
      } catch (err) {
        setDialog({ type: 'alert', message: 'เกิดข้อผิดพลาดในการอ่านไฟล์ JSON' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImageUpload = (callback: (url: string) => void) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const compressed = await processImageFile(file, 600, 0.7, setDialog);
      if (compressed) {
        try {
            const url = await uploadImageToCloudinary(compressed);
            if (url) callback(url);
            else setDialog({ type: 'alert', message: 'อัปโหลดล้มเหลว กรุณาลองใหม่' });
        } catch (err) {
            setDialog({ type: 'alert', message: 'ระบบขัดข้อง กรุณาลองใหม่' });
        }
      }
      setIsUploading(false);
    }
  };

  const handleBulkUploadQueue = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f: any) => f.type?.startsWith('image/') || f.name?.toLowerCase().match(/\.(heic|heif)$/i));
    if (files.length === 0) return;
    if (!type) {
      setDialog({ type: 'alert', message: "กรุณาเลือกประเภทม่านก่อนทำการอัปโหลดแบบกลุ่ม" });
      return;
    }

    const newTasks = files.map((file: any) => {
      const pathParts = file.webkitRelativePath ? file.webkitRelativePath.split('/') : [file.name];
      let folderName = "";
      let fileNameWithoutExt = file.name ? file.name.replace(/\.[^/.]+$/, "").toUpperCase() : "";

      if (pathParts.length > 1) {
          folderName = pathParts[pathParts.length - 2].toUpperCase();
      } else {
          folderName = "ไม่ระบุรุ่น";
      }
      return { file, folderName, fileNameWithoutExt, type, cat };
    });

    setBgUploadQueue(newTasks); 
    e.target.value = ''; 
    setDialog({ type: 'alert', message: `นำรูปภาพจำนวน ${files.length} รายการเข้าสู่คิวอัปโหลดแล้ว!\n\nระบบจะทยอยอัปโหลดผ่าน Cloudinary อยู่เบื้องหลัง\n(สังเกตกล่องสถานะมุมซ้ายล่าง)\nคุณสามารถปิดแผงตั้งค่านี้และทำงานอื่นต่อไปได้เลยครับ` });
  };

  const addFabricType = (newType: string) => {
    if (!newType) return;
    const newDB = JSON.parse(JSON.stringify(appDB));
    if (!newDB.curtainTypes[cat]) newDB.curtainTypes[cat] = {};
    newDB.curtainTypes[cat][newType] = {};
    setAppDB(newDB);
  };

  const moveFabricType = (dir: number, t: string) => {
    const obj = appDB.curtainTypes[cat];
    const keys = Object.keys(obj);
    const idx = keys.indexOf(t);
    if (dir === -1 && idx > 0) [keys[idx-1], keys[idx]] = [keys[idx], keys[idx-1]];
    else if (dir === 1 && idx < keys.length - 1) [keys[idx], keys[idx+1]] = [keys[idx+1], keys[idx]];
    else return;
    const newObj: Record<string, any> = {};
    keys.forEach(k => newObj[k] = obj[k]);
    setAppDB((prev: any) => ({ ...prev, curtainTypes: { ...prev.curtainTypes, [cat]: newObj } }));
  };

  const deleteFabricType = (t: string) => {
    setDialog({
      type: 'confirm',
      message: `ต้องการลบหมวดหมู่ "${t}" ใช่หรือไม่? ข้อมูลผ้าด้านในจะถูกลบทั้งหมด`,
      onConfirm: () => {
        const newDB = JSON.parse(JSON.stringify(appDB));
        delete newDB.curtainTypes[cat][t];
        setAppDB(newDB);
        if (type === t) { setType(''); setSearchFabric(''); }
      }
    });
  };

  const addFabricItem = async () => {
    const nameInput = document.getElementById('addFabName') as HTMLInputElement;
    const n = nameInput?.value;
    const colorInput = document.getElementById('addFabColor') as HTMLInputElement;
    const c = colorInput?.value;
    const fileInput = document.getElementById('addFabImg') as HTMLInputElement;
    const f = fileInput?.files?.[0];

    if (n && c && f) {
      setIsUploading(true);
      const compressedImg = await processImageFile(f, 400, 0.7, setDialog);
      if (compressedImg) {
        try {
            const url = await uploadImageToCloudinary(compressedImg);
            if (url) {
              const newDB = JSON.parse(JSON.stringify(appDB));
              if (!newDB.curtainTypes[cat][type]) newDB.curtainTypes[cat][type] = {};
              if (!newDB.curtainTypes[cat][type][n]) newDB.curtainTypes[cat][type][n] = {};
              newDB.curtainTypes[cat][type][n][c] = url;
              setAppDB(newDB);
              nameInput.value = ''; 
              colorInput.value = ''; 
              fileInput.value = '';
            } else {
              setDialog({ type: 'alert', message: "อัปโหลดรูปล้มเหลว" });
            }
        } catch (err) {
            setDialog({ type: 'alert', message: "เกิดข้อผิดพลาดในการอัปโหลด ลองใหม่อีกครั้ง" });
        }
      }
      setIsUploading(false);
    } else { 
      setDialog({ type: 'alert', message: "กรุณาใส่ข้อมูลและเลือกรูปภาพให้ครบ" }); 
    }
  };

  const deleteFabricItem = (typeName: string, itemName: string, itemColor: string) => {
    const newDB = JSON.parse(JSON.stringify(appDB));
    delete newDB.curtainTypes[cat][typeName][itemName][itemColor];
    if (Object.keys(newDB.curtainTypes[cat][typeName][itemName]).length === 0) delete newDB.curtainTypes[cat][typeName][itemName];
    setAppDB(newDB);
  };

  let fabricList: { itemName: string; itemColor: string; imgUrl: string }[] = [];
  if (type && appDB.curtainTypes[cat] && appDB.curtainTypes[cat][type]) {
    Object.entries(appDB.curtainTypes[cat][type]).forEach(([itemName, colors]) => {
      Object.entries(colors as Record<string, string>).forEach(([itemColor, imgUrl]) => {
        fabricList.push({ itemName, itemColor, imgUrl });
      });
    });
    fabricList.sort((a, b) => a.itemName.localeCompare(b.itemName) || a.itemColor.localeCompare(b.itemColor));
    if (searchFabric.trim()) {
      const term = searchFabric.toLowerCase();
      fabricList = fabricList.filter(f => f.itemName.toLowerCase().includes(term) || f.itemColor.toLowerCase().includes(term));
    }
  }

  if (!showDBSettings) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100000] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b bg-gray-50 bg-indigo-50">
          <h2 className="text-xl font-bold flex items-center text-blue-800"><Database className="mr-2"/> ฐานข้อมูลออนไลน์ (Admin Only)</h2>
          <button onClick={() => setShowDBSettings(false)} className="text-gray-500 hover:text-red-500 transition-colors"><X size={24}/></button>
        </div>
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          <div className="w-full md:w-1/4 border-b md:border-b-0 md:border-r bg-gray-100 p-2 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-y-auto whitespace-nowrap">
            {[{id: 'fabrics', label: 'เนื้อผ้าและม่าน'}, {id: 'styles', label: 'รูปแบบม่าน'}, {id: 'masks', label: 'มาสก์หน้างาน'}, {id: 'margins', label: 'ระยะชายม่าน'}, {id: 'tracks', label: 'รางม่าน & ขาจับ'}, {id: 'accessories', label: 'อุปกรณ์เสริม'}].map(t => (
              <button key={t.id} onClick={()=>setActiveTab(t.id)} className={`text-left px-3 py-2 rounded text-sm shrink-0 ${activeTab===t.id ? 'bg-blue-600 text-white font-bold shadow' : 'hover:bg-gray-200 text-gray-700'}`}>{t.label}</button>
            ))}
          </div>
          <div className="w-full md:w-3/4 p-4 overflow-y-auto bg-white">
            {activeTab === 'fabrics' && (
              <div className="flex flex-col gap-4">
                <h3 className="font-bold text-lg text-blue-700 border-b pb-2">จัดการเนื้อผ้าและม่าน</h3>
                <div>
                  <label className="block text-sm font-bold mb-2">1. หมวดหมู่หลัก</label>
                  <div className="flex gap-2 flex-wrap">
                    {Object.keys(appDB.curtainTypes || {}).map(c => (
                      <button key={c} onClick={()=>{setCat(c); setType(''); setSearchFabric('');}} className={`px-4 py-1.5 border rounded-full text-sm transition-colors ${cat===c ? 'bg-blue-600 text-white border-blue-600 shadow' : 'bg-white hover:bg-gray-50'}`}>{c}</button>
                    ))}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 border rounded-lg">
                  <label className="block text-sm font-bold mb-3">2. ประเภทม่าน ({cat})</label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {Object.keys((appDB.curtainTypes && appDB.curtainTypes[cat]) || {}).map((t, idx, arr) => (
                      <div key={t} className={`flex items-center border rounded transition-colors ${type===t ? 'bg-indigo-600 text-white border-indigo-600 shadow' : 'bg-white hover:bg-gray-100'}`}>
                        <button onClick={()=>{setType(t); setSearchFabric('');}} className="px-4 py-1.5 text-sm font-bold">{t}</button>
                        <div className="flex flex-col border-l border-white/20">
                          <button onClick={()=>moveFabricType(-1, t)} disabled={idx===0} className="px-1 py-0.5 hover:bg-black/20 disabled:opacity-30"><ChevronLeft size={10} className="rotate-90"/></button>
                          <button onClick={()=>moveFabricType(1, t)} disabled={idx===arr.length-1} className="px-1 py-0.5 hover:bg-black/20 disabled:opacity-30"><ChevronRight size={10} className="rotate-90"/></button>
                        </div>
                        <button onClick={()=>deleteFabricType(t)} className="px-2 py-1.5 border-l border-white/20 hover:bg-red-500 hover:text-white text-red-500 h-full"><Trash2 size={12}/></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input type="text" id="newType" placeholder="เพิ่มประเภทม่านใหม่..." className="border px-3 py-1.5 rounded text-sm w-full md:w-64 focus:outline-blue-500 bg-white"/>
                    <button onClick={()=>{
                      const inp = document.getElementById('newType') as HTMLInputElement;
                      if(inp && inp.value) { addFabricType(inp.value); inp.value=''; }
                    }} className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded text-sm font-bold">เพิ่ม</button>
                  </div>
                </div>

                {type && (
                  <div className="bg-indigo-50 p-4 border border-indigo-100 rounded-lg flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row justify-between md:items-center border-b border-indigo-200 pb-2 gap-2">
                      <label className="block text-sm font-bold">3. รายการผ้า ({type})</label>
                      <input 
                        type="text" 
                        placeholder="🔍 พิมพ์ค้นหารุ่น หรือสี..." 
                        value={searchFabric}
                        onChange={e => setSearchFabric(e.target.value)}
                        className="border px-3 py-1 rounded-full text-xs w-full md:w-64 focus:outline-indigo-500 bg-white shadow-inner"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {fabricList.map(({ itemName, itemColor, imgUrl }) => (
                        <div key={`${itemName}-${itemColor}`} className="bg-white border p-2 rounded flex gap-2 relative group shadow-sm">
                          <button onClick={()=>deleteFabricItem(type, itemName, itemColor)} className="absolute top-1 right-1 bg-red-100 text-red-600 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                          <img src={imgUrl} alt="" className="w-12 h-12 object-cover rounded border" referrerPolicy="no-referrer" />
                          <div className="flex flex-col justify-center flex-1 overflow-hidden">
                            <span className="text-xs font-bold truncate">{itemName}</span>
                            <span className="text-[10px] text-gray-500 truncate">{itemColor}</span>
                          </div>
                        </div>
                      ))}
                      {fabricList.length === 0 && (
                        <div className="col-span-full text-center text-gray-400 text-sm py-4">ไม่พบรายการผ้าที่ค้นหา</div>
                      )}
                    </div>

                    <div className="bg-white p-3 border rounded shadow-sm flex flex-col gap-2 mt-2">
                       <span className="text-sm font-bold text-indigo-700">เพิ่มรายการผ้าใหม่ (ทีละรายการ)</span>
                       <div className="flex flex-col md:flex-row gap-2 md:items-center">
                          <input type="text" id="addFabName" placeholder="ชื่อรุ่น (เช่น LONERO)" className="border px-2 py-1.5 rounded text-sm w-full md:w-1/3 focus:outline-indigo-500 bg-white"/>
                          <input type="text" id="addFabColor" placeholder="ชื่อสี (เช่น GREY)" className="border px-2 py-1.5 rounded text-sm w-full md:w-1/3 focus:outline-indigo-500 bg-white" onInput={(e) => {
                            const target = e.target as HTMLInputElement;
                            target.value = target.value.toUpperCase();
                          }}/>
                          <label className={`bg-gray-100 border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-sm flex-1 flex justify-center items-center ${isUploading ? 'opacity-50' : 'cursor-pointer hover:bg-gray-200'}`}>
                            {isUploading ? 'กำลังอัปโหลด...' : <><Upload size={14} className="mr-1"/> เลือกรูปภาพ</>}
                            <input type="file" accept={ACCEPTED_IMAGE_FORMATS} className="hidden" id="addFabImg" disabled={isUploading} onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const colInput = document.getElementById('addFabColor') as HTMLInputElement;
                                if (colInput && !colInput.value.trim()) {
                                  colInput.value = file.name.replace(/\.[^/.]+$/, "").toUpperCase();
                                }
                              }
                            }}/>
                          </label>
                       </div>
                       <button onClick={addFabricItem} disabled={isUploading} className={`bg-indigo-600 text-white py-1.5 rounded text-sm font-bold mt-1 ${isUploading ? 'opacity-50' : 'hover:bg-indigo-700'}`}>บันทึกรายการผ้า</button>
                    </div>

                    <div className="bg-indigo-50 p-3 border border-indigo-200 rounded shadow-sm flex flex-col gap-2 mt-2">
                       <span className="text-sm font-bold text-indigo-800">เพิ่มรายการแบบกลุ่ม (เข้าคิวทำงานเบื้องหลัง)</span>
                       <p className="text-[11px] text-gray-600 leading-tight">
                         <b>💡 เคล็ดลับ:</b> ให้นำโฟลเดอร์รุ่นผ้าทั้งหมด ไปใส่ไว้ใน <b>"โฟลเดอร์หลัก 1 อัน"</b> แล้วกดเลือกโฟลเดอร์หลักนั้น<br/>
                         ระบบจะจัดคิวอัปโหลดทีละรูป เพื่อป้องกันปัญหาโดนตัดการเชื่อมต่อจากเซิร์ฟเวอร์
                       </p>
                       <label className={`bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded text-sm flex justify-center items-center font-bold shadow-sm transition-colors cursor-pointer hover:bg-indigo-100 border-indigo-300 text-indigo-700`}>
                         <Upload size={14} className="mr-1"/> เลือกโฟลเดอร์หลัก (รวมหลายรุ่น)
                         <input type="file" {...{ webkitdirectory: "true", directory: "true" } as any} multiple accept={ACCEPTED_IMAGE_FORMATS} className="hidden" onChange={handleBulkUploadQueue}/>
                       </label>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'styles' && (
              <div className="flex flex-col gap-4">
                 <h3 className="font-bold text-lg text-blue-700 border-b pb-2">จัดการรูปแบบผ้าม่าน และรูปตัวอย่าง</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="flex flex-col">
                     <label className="font-bold text-sm mb-2">1. รายชื่อรูปแบบม่าน (บรรทัดละ 1 รายการ)</label>
                     <textarea rows={12} className="w-full border p-3 text-sm rounded bg-white focus:outline-blue-500 leading-relaxed" value={localText.styles || ''} onChange={e => handleLocalText('styles', e.target.value)}></textarea>
                   </div>
                   <div className="flex flex-col">
                     <label className="font-bold text-sm mb-2">2. อัปโหลดรูปตัวอย่างรูปแบบม่าน</label>
                     <div className="flex flex-col gap-2 overflow-y-auto pr-2 max-h-[350px]">
                       {(appDB.styles || []).map((styleName: string) => (
                         <div key={styleName} className="flex items-center justify-between border p-2 rounded bg-gray-50 text-xs">
                           <span className="font-bold flex-1 truncate mr-2">{styleName}</span>
                           {appDB.styleImages?.[styleName] ? <img src={appDB.styleImages[styleName]} className="w-10 h-10 object-cover bg-white border mr-2 rounded" referrerPolicy="no-referrer" /> : <div className="w-10 h-10 bg-gray-200 border border-dashed flex items-center justify-center mr-2 rounded text-[8px] text-gray-500">ไม่มีรูป</div>}
                           <label className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded text-xs cursor-pointer transition-colors">อัปโหลด
                            <input type="file" accept={ACCEPTED_IMAGE_FORMATS} className="hidden" onChange={handleImageUpload((url) => { setAppDB((prev: any) => ({ ...prev, styleImages: { ...(prev.styleImages || {}), [styleName]: url } })); })}/>
                           </label>
                         </div>
                       ))}
                     </div>
                   </div>
                 </div>
              </div>
            )}

            {activeTab === 'masks' && (
              <div className="flex flex-col gap-4">
                 <h3 className="font-bold text-lg text-blue-700 border-b pb-2">จัดการ Mask ผ้าม่านทับหน้างาน</h3>
                 <p className="text-xs text-gray-600 mb-2">* เคล็ดลับ: เพื่อให้ Mask ชิดขอบสมบูรณ์แบบ กรุณาตัดรูป (Crop) ให้ชิดเนื้อผ้าม่านที่สุด ไม่มีขอบใส (Transparent) เหลืออยู่</p>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="flex flex-col gap-3 border p-4 rounded-lg bg-gray-50">
                     <label className="font-bold text-sm text-gray-800">1. อัปโหลด Mask (PNG โปร่งใส แนะนำ)</label>
                     <div className="flex flex-col gap-3">
                        <select id="maskStyle" className="border p-2 rounded text-sm outline-none focus:border-blue-500 bg-white h-9">
                          <option value="">- เลือกรุปแบบม่าน -</option>
                          {(appDB.styles || []).map((s: string)=><option key={s} value={s}>{s}</option>)}
                        </select>
                        <select id="maskAction" className="border p-2 rounded text-sm outline-none focus:border-blue-500 bg-white h-9">
                          <option value="ALL">- ทุกการเปิด/ปิด (สำหรับม่านม้วน, พับ, มู่ลี่) -</option>
                          {(appDB.actions || []).map((s: string)=><option key={s} value={s}>{s}</option>)}
                        </select>
                        <label className={`bg-blue-600 text-white px-4 py-2.5 rounded text-sm font-bold text-center shadow-sm transition-colors mt-2 ${isUploading ? 'opacity-50' : 'hover:bg-blue-700 cursor-pointer'}`}>
                          <Upload size={16} className="inline mr-2"/> {isUploading ? 'กำลังอัปโหลด...' : 'อัปโหลดรูป Mask'}
                          <input type="file" accept={ACCEPTED_IMAGE_FORMATS} className="hidden" disabled={isUploading} onChange={handleImageUpload((url) => {
                            const stInput = document.getElementById('maskStyle') as HTMLSelectElement;
                            const st = stInput?.value;
                            const acInput = document.getElementById('maskAction') as HTMLSelectElement;
                            const ac = acInput?.value || 'ALL';
                            if (st && ac) {
                              const newDB = JSON.parse(JSON.stringify(appDB));
                              if (!newDB.masks) newDB.masks = {};
                              if (!newDB.masks[st]) newDB.masks[st] = {};
                              newDB.masks[st][ac] = url;
                              setAppDB(newDB);
                            } else {
                              setDialog({ type: 'alert', message: "กรุณาเลือกรูปแบบและลักษณะการเปิดปิดก่อนอัปโหลด" });
                            }
                          })}/>
                        </label>
                     </div>
                   </div>
                   <div className="flex flex-col gap-2 overflow-y-auto max-h-[350px]">
                      <label className="font-bold text-sm text-gray-800">2. Mask ที่มีในระบบ</label>
                      {Object.entries(appDB.masks || {}).flatMap(([st, actions]: any) => 
                        Object.entries(actions).map(([ac, img]: any) => (
                          <div key={`${st}-${ac}`} className="flex items-center justify-between border border-gray-200 p-2 rounded bg-white shadow-sm text-xs">
                            <div className="flex flex-col flex-1">
                              <span className="font-bold text-blue-800">{st}</span>
                              <span className="text-gray-500">{ac === 'ALL' ? 'ทุกการเปิดปิด' : ac}</span>
                            </div>
                            <div className="w-16 h-16 bg-gray-100 border rounded mr-3 flex items-center justify-center overflow-hidden shrink-0">
                              <img src={img} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                            </div>
                            <button onClick={()=>{
                              const newDB = JSON.parse(JSON.stringify(appDB));
                              delete newDB.masks[st][ac];
                              if (Object.keys(newDB.masks[st]).length === 0) delete newDB.masks[st];
                              setAppDB(newDB);
                            }} className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors" title="ลบ Mask"><Trash2 size={16}/></button>
                          </div>
                        ))
                      )}
                      {Object.keys(appDB.masks || {}).length === 0 && <div className="text-sm text-gray-400 italic p-4 text-center border border-dashed rounded">ยังไม่มีข้อมูล Mask</div>}
                   </div>
                 </div>
              </div>
            )}

            {activeTab === 'margins' && (
              <div className="flex flex-col gap-4">
                 <h3 className="font-bold text-lg text-blue-700 border-b pb-2">จัดการระยะชายม่าน และรูปตัวอย่าง</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="flex flex-col gap-4">
                     <div><label className="font-bold text-sm mb-1 block">ระยะด้านล่าง (บรรทัดละ 1 รายการ)</label><textarea rows={6} className="w-full border p-2 text-sm rounded bg-white focus:outline-blue-500" value={localText.margins_bottom || ''} onChange={e => handleLocalText('margins_bottom', e.target.value)}></textarea></div>
                     <div><label className="font-bold text-sm mb-1 block">ระยะด้านบน / ซ้าย / ขวา (ใช้ร่วมกัน)</label><textarea rows={4} className="w-full border p-2 text-sm rounded bg-white focus:outline-blue-500" value={localText.margins_horizontal || ''} onChange={e => handleLocalText('margins_horizontal', e.target.value)}></textarea></div>
                   </div>
                   <div className="flex flex-col"><label className="font-bold text-sm mb-2">อัปโหลดรูปตัวอย่างระยะด้านล่าง</label>
                     <div className="flex flex-col gap-2 overflow-y-auto pr-2 max-h-[350px]">
                       {(appDB.margins?.bottom || []).map((marginName: string) => (
                         <div key={marginName} className="flex items-center justify-between border p-2 rounded bg-gray-50 text-xs">
                           <span className="font-bold flex-1 truncate mr-2">{marginName}</span>
                           {appDB.marginImages?.[marginName] ? <img src={appDB.marginImages[marginName]} className="w-10 h-10 object-cover bg-white border mr-2 rounded" referrerPolicy="no-referrer" /> : <div className="w-10 h-10 bg-gray-200 border border-dashed flex items-center justify-center mr-2 rounded text-[8px] text-gray-500">ไม่มีรูป</div>}
                           <label className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded text-xs cursor-pointer transition-colors">อัปโหลด
                            <input type="file" accept={ACCEPTED_IMAGE_FORMATS} className="hidden" onChange={handleImageUpload((url) => { setAppDB((prev: any) => ({ ...prev, marginImages: { ...(prev.marginImages || {}), [marginName]: url } })); })}/>
                           </label>
                         </div>
                       ))}
                     </div>
                   </div>
                 </div>
              </div>
            )}
            {['tracks', 'accessories'].includes(activeTab) && (
              <div className="flex flex-col gap-4">
                 <h3 className="font-bold text-lg text-blue-700 border-b pb-2">แก้ไขตัวเลือกอื่นๆ (พิมพ์ 1 รายการต่อบรรทัด)</h3>
                 {activeTab === 'tracks' && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div><label className="font-bold text-sm block mb-1">ชนิดรางม่าน</label><textarea rows={10} className="w-full border p-2 text-sm rounded bg-white" value={localText.tracks || ''} onChange={e => handleLocalText('tracks', e.target.value)}></textarea></div>
                     <div><label className="font-bold text-sm block mb-1">ชนิดขาจับ</label><textarea rows={10} className="w-full border p-2 text-sm rounded bg-white" value={localText.brackets || ''} onChange={e => handleLocalText('brackets', e.target.value)}></textarea></div>
                   </div>
                 )}
                 {activeTab === 'accessories' && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div><label className="font-bold text-sm block mb-1">อุปกรณ์เสริม</label><textarea rows={10} className="w-full border p-2 text-sm rounded bg-white" value={localText.accessories || ''} onChange={e => handleLocalText('accessories', e.target.value)}></textarea></div>
                     <div><label className="font-bold text-sm block mb-1">การแขวนม่าน</label><textarea rows={10} className="w-full border p-2 text-sm rounded bg-white" value={localText.hangStyles || ''} onChange={e => handleLocalText('hangStyles', e.target.value)}></textarea></div>
                   </div>
                 )}
              </div>
            )}
          </div>
        </div>
        <div className="p-4 border-t bg-gray-50 flex flex-wrap justify-between items-center gap-2">
           <div className="flex gap-2">
               <button onClick={handleRecoverLocal} className="text-orange-600 hover:bg-orange-50 px-3 py-2 rounded font-bold text-xs">⚠️ กู้คืนข้อมูล (Local)</button>
               <button onClick={handleExportDB} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 px-3 py-2 rounded font-bold text-xs flex items-center"><Download size={14} className="mr-1"/> Export สำรอง</button>
               <label className="bg-sky-50 text-sky-600 hover:bg-sky-100 border border-sky-200 px-3 py-2 rounded font-bold text-xs flex items-center cursor-pointer transition-colors">
                  <Upload size={14} className="mr-1"/> Import ข้อมูล
                  <input type="file" accept=".json" className="hidden" onChange={handleImportDB} />
               </label>
           </div>
           <div className="flex gap-2 mt-2 md:mt-0 w-full md:w-auto justify-end">
               <button onClick={() => setShowDBSettings(false)} className="px-6 py-2 rounded font-bold text-gray-600 hover:bg-gray-200 text-sm transition-colors">ปิด</button>
               <button onClick={handleSaveAndClose} className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 shadow text-sm transition-all">บันทึกฐานข้อมูลออนไลน์</button>
           </div>
        </div>
      </div>
    </div>
  );
};
