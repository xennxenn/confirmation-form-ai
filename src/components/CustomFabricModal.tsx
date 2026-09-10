import React, { useState } from 'react';
import { X, Upload, ImagePlus } from 'lucide-react';
import { processImageFile, uploadImageToCloudinary } from '../utils';
import { ACCEPTED_IMAGE_FORMATS } from '../types';

interface CustomFabricModalProps {
  show: boolean;
  onClose: () => void;
  onAdd: (fab: any) => void;
  setDialog: (dialog: any) => void;
}

export const CustomFabricModal: React.FC<CustomFabricModalProps> = ({ show, onClose, onAdd, setDialog }) => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fileInput = document.getElementById('customFabImg') as HTMLInputElement;
    const f = fileInput?.files?.[0];
    const subTypeInput = document.getElementById('customFabSubType') as HTMLInputElement;
    const subType = subTypeInput?.value;
    const nameInput = document.getElementById('customFabName') as HTMLInputElement;
    const name = nameInput?.value;
    const colorInput = document.getElementById('customFabColor') as HTMLInputElement;
    const color = colorInput?.value;

    if (!subType || !name || !color || !f) {
      return setDialog({ type: 'alert', message: 'กรุณากรอกข้อมูลและเลือกรูปภาพให้ครบถ้วน' });
    }
    
    setLoading(true);
    const compressed = await processImageFile(f, 400, 0.7, setDialog);
    if (compressed) {
      try {
        const imgUrl = await uploadImageToCloudinary(compressed);
        if (imgUrl) {
          onAdd({ id: Date.now().toString(), mainType: 'ผ้านอกระบบ (เฉพาะงานนี้)', subType, name, color, image: imgUrl });
          onClose();
        } else {
          setDialog({ type: 'alert', message: 'อัปโหลดรูปภาพไม่สำเร็จ กรุณาลองใหม่' });
        }
      } catch (err) {
        setDialog({ type: 'alert', message: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ' });
      }
    }
    setLoading(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[1000000] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b bg-indigo-50">
          <h2 className="text-lg font-bold flex items-center text-indigo-800"><ImagePlus className="mr-2"/> เพิ่มผ้านอกระบบ (เฉพาะงานนี้)</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500 transition-colors"><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3">
          <div>
            <label className="text-xs font-bold block mb-1">ประเภทม่าน (เช่น ผ้าม่านทึบ, ม่านโปร่ง, มู่ลี่)</label>
            <input id="customFabSubType" type="text" className="w-full border p-2 rounded text-sm focus:outline-indigo-500" placeholder="ผ้าม่านทึบ พิเศษ"/>
          </div>
          <div>
            <label className="text-xs font-bold block mb-1">รุ่น / ชื่อผ้า</label>
            <input id="customFabName" type="text" className="w-full border p-2 rounded text-sm focus:outline-indigo-500" placeholder="เช่น รุ่น A"/>
          </div>
          <div>
            <label className="text-xs font-bold block mb-1">สี</label>
            <input id="customFabColor" type="text" className="w-full border p-2 rounded text-sm focus:outline-indigo-500" placeholder="เช่น สีเทาเข้ม" onInput={(e) => {
              const target = e.target as HTMLInputElement;
              target.value = target.value.toUpperCase();
            }}/>
          </div>
          <div>
            <label className="text-xs font-bold block mb-1">รูปตัวอย่างเนื้อผ้า</label>
            <label className={`bg-gray-100 border border-gray-300 text-gray-700 px-3 py-2 rounded text-sm flex justify-center items-center font-bold transition-all ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 cursor-pointer'}`}>
              <Upload size={16} className="mr-2"/> {loading ? 'กำลังอัปโหลด...' : 'เลือกรูปภาพ'}
              <input type="file" accept={ACCEPTED_IMAGE_FORMATS} className="hidden" id="customFabImg" disabled={loading} onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const clrInput = document.getElementById('customFabColor') as HTMLInputElement;
                  if (clrInput && !clrInput.value.trim()) {
                    clrInput.value = file.name.replace(/\.[^/.]+$/, "").toUpperCase();
                  }
                }
              }}/>
            </label>
          </div>
          <button type="submit" disabled={loading} className={`bg-indigo-600 text-white font-bold py-2 rounded mt-2 shadow transition-all ${loading ? 'opacity-50' : 'hover:bg-indigo-700'}`}>{loading ? 'โปรดรอ...' : 'บันทึกผ้าเข้าใบงาน'}</button>
        </form>
      </div>
    </div>
  );
};
