import React, { useState } from 'react';
import { Users, X, Trash2 } from 'lucide-react';
import { setDoc, doc } from 'firebase/firestore';
import { db, appId } from '../firebase';
import { processImageFile, removeWhiteBackground, uploadImageToCloudinary } from '../utils';

interface UserManagementModalProps {
  show: boolean;
  onClose: () => void;
  setDialog: (dialog: any) => void;
  allAccounts: any[];
  setAllAccounts: (accounts: any[]) => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ show, onClose, setDialog, allAccounts, setAllAccounts }) => {
  const [newN, setNewN] = useState('');
  const [newU, setNewU] = useState('');
  const [newP, setNewP] = useState('');
  const [newR, setNewR] = useState('user');
  const [newSig, setNewSig] = useState('');
  const [isUploadingSig, setIsUploadingSig] = useState(false);

  const saveAcc = async (newAccounts: any[]) => {
    try {
      localStorage.setItem('backupAccounts', JSON.stringify(newAccounts));
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'accounts'), { users: newAccounts });
    } catch (err) {
      console.warn("Could not sync accounts to Firestore, saved locally:", err);
    }
    setAllAccounts(newAccounts);
  };

  const handleAdd = () => {
    if (!newN || !newU || !newP) return setDialog({ type: 'alert', message: 'กรุณากรอก ชื่อ, Username และ Password ให้ครบถ้วน' });
    if (allAccounts.find(a => a.username === newU)) return setDialog({ type: 'alert', message: 'Username นี้มีอยู่แล้ว' });
    const newAcc = [...allAccounts, { id: Date.now().toString(), username: newU, password: newP, role: newR, name: newN, signatureUrl: newSig }];
    saveAcc(newAcc);
    setNewN(''); setNewU(''); setNewP(''); setNewSig('');
  };

  const handleDel = (id: string) => {
    const acc = allAccounts.find(a => a.id === id);
    if (acc && acc.username === 'Admin') return setDialog({ type: 'alert', message: 'ลบบัญชี Admin หลักไม่ได้' });
    saveAcc(allAccounts.filter(a => a.id !== id));
  };

  const handleSigUpload = async (e: React.ChangeEvent<HTMLInputElement>, accountId: string | null = null) => {
    const file = e.target.files?.[0];
    if (file) {
       setIsUploadingSig(true);
       const cmp = await processImageFile(file, 600, 0.8, setDialog);
       if (cmp) {
          try {
              const transparent = await removeWhiteBackground(cmp);
              const url = await uploadImageToCloudinary(transparent);
              if (url) {
                 if (accountId) {
                     const updatedAccounts = allAccounts.map(acc => 
                         acc.id === accountId ? { ...acc, signatureUrl: url } : acc
                     );
                     saveAcc(updatedAccounts);
                     setDialog({ type: 'alert', message: 'อัปเดตลายเซ็นสำเร็จ' });
                 } else {
                     setNewSig(url);
                 }
              }
              else setDialog({ type: 'alert', message: 'อัปโหลดลายเซ็นต์ไม่สำเร็จ' });
          } catch (err) {
              setDialog({ type: 'alert', message: 'ระบบโควต้าอัปโหลดรูปภาพเต็มชั่วคราว (Rate Limit) กรุณารอสักพักแล้วลองใหม่' });
          }
       }
       setIsUploadingSig(false);
    }
  };

  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-[100000] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <h2 className="text-lg font-bold flex items-center"><Users className="mr-2"/> จัดการพนักงาน</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500 transition-colors"><X size={20}/></button>
        </div>
        <div className="p-4 flex flex-col gap-4 overflow-y-auto max-h-[80vh]">
          <div className="flex flex-col md:flex-row gap-2 md:items-end bg-blue-50 p-3 rounded border border-blue-100">
            <div className="flex-1"><label className="text-xs font-bold block">ชื่อ-นามสกุล</label><input type="text" value={newN} onChange={e=>setNewN(e.target.value)} className="w-full border p-1.5 rounded text-sm bg-white"/></div>
            <div className="flex-1 md:flex-[0.6]"><label className="text-xs font-bold block">Username</label><input type="text" value={newU} onChange={e=>setNewU(e.target.value)} className="w-full border p-1.5 rounded text-sm bg-white"/></div>
            <div className="flex-1 md:flex-[0.6]"><label className="text-xs font-bold block">Password</label><input type="text" value={newP} onChange={e=>setNewP(e.target.value)} className="w-full border p-1.5 rounded text-sm bg-white"/></div>
            <div>
              <label className="text-xs font-bold block">สิทธิ์</label>
              <select value={newR} onChange={e=>setNewR(e.target.value)} className="w-full border p-1.5 rounded text-sm bg-white h-9">
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex-1 md:flex-[0.8]">
              <label className="text-xs font-bold block text-indigo-700">ลายเซ็นต์ (กระดาษขาว)</label>
              <label className={`w-full border border-indigo-300 p-1.5 rounded text-xs flex justify-center items-center font-bold transition-colors h-9 ${isUploadingSig ? 'opacity-50 cursor-wait bg-gray-200' : 'bg-white hover:bg-indigo-50 text-indigo-700 cursor-pointer'}`}>
                {isUploadingSig ? 'กำลังอัปโหลด...' : (newSig ? '✔️ มีรูปแล้ว (คลิกเปลี่ยน)' : '+ เลือกรูป')}
                <input type="file" accept="image/*" className="hidden" disabled={isUploadingSig} onChange={(e) => handleSigUpload(e)} />
              </label>
            </div>
            <button onClick={handleAdd} className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded text-sm font-bold shadow w-full md:w-auto mt-2 md:mt-0 transition-all h-9 shrink-0">เพิ่ม</button>
          </div>
          <div className="border rounded overflow-hidden max-h-[300px] overflow-x-auto overflow-y-auto">
            <table className="w-full text-sm text-left min-w-[700px]">
              <thead className="bg-gray-800 text-white sticky top-0 z-10 text-xs">
                <tr>
                  <th className="p-2 w-28 text-center">ลายเซ็นต์</th>
                  <th className="p-2">ชื่อพนักงาน</th>
                  <th className="p-2">Username</th>
                  <th className="p-2">Password</th>
                  <th className="p-2">Role</th>
                  <th className="p-2 text-center">ลบ</th>
                </tr>
              </thead>
              <tbody>
                {allAccounts.map(acc => (
                  <tr key={acc.id} className="border-b hover:bg-gray-50 text-xs">
                    <td className="p-2 flex flex-col items-center justify-center gap-1">
                      {acc.signatureUrl ? (
                         <img src={acc.signatureUrl} className="h-8 object-contain mix-blend-multiply" alt="sig" referrerPolicy="no-referrer" />
                      ) : (
                         <span className="text-gray-300 text-xs">-</span>
                      )}
                      <label className="text-[10px] text-blue-600 hover:text-blue-800 cursor-pointer font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 w-full text-center">
                        เปลี่ยนลายเซ็น
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleSigUpload(e, acc.id)} />
                      </label>
                    </td>
                    <td className="p-2 font-bold text-gray-800">{acc.name || '-'}</td>
                    <td className="p-2 text-gray-600">{acc.username}</td>
                    <td className="p-2 text-gray-500">{acc.password}</td>
                    <td className="p-2">{acc.role === 'admin' ? <span className="text-blue-600 font-bold">Admin</span> : 'User'}</td>
                    <td className="p-2 text-center">
                      <button onClick={()=>handleDel(acc.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors">
                        <Trash2 size={16}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
