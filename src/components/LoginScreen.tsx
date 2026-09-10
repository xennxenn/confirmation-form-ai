import React, { useState, useEffect } from 'react';
import { getDoc, doc } from 'firebase/firestore';
import { db, appId } from '../firebase';
import { DEFAULT_ACCOUNTS } from '../types';

interface LoginScreenProps {
  onLogin: (user: any) => void;
  isAuthReady: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, isAuthReady }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [authTimeout, setAuthTimeout] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAuthTimeout(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  const canSubmit = isAuthReady || authTimeout;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let accounts = DEFAULT_ACCOUNTS;
      const cached = localStorage.getItem('backupAccounts');
      if (cached) {
        try { accounts = JSON.parse(cached); } catch {}
      }

      try {
        const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'accounts'));
        if (snap.exists() && snap.data().users) {
          accounts = snap.data().users;
          localStorage.setItem('backupAccounts', JSON.stringify(accounts));
        }
      } catch (fetchErr) {
        console.warn("Using cached accounts due to connection state:", fetchErr);
      }
      
      const user = accounts.find(u => u.username === username && u.password === password);
      if (user) {
        localStorage.setItem('curtainAppUser', JSON.stringify(user));
        onLogin(user);
      } else {
        setError('Username หรือ Password ไม่ถูกต้อง');
      }
    } catch (err) {
      console.error("Login Fetch Error", err);
      const user = DEFAULT_ACCOUNTS.find(u => u.username === username && u.password === password);
      if (user) {
        localStorage.setItem('curtainAppUser', JSON.stringify(user));
        onLogin(user);
      } else {
        setError('Username หรือ Password ไม่ถูกต้อง');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 font-sans">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-sm border-t-4 border-blue-600">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Confirmation Form</h1>
          <p className="text-gray-500 text-sm mt-1">ลงชื่อเข้าใช้ระบบสรุปงานผ้าม่าน</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              className="w-full border p-2 rounded focus:outline-blue-500 text-sm" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="w-full border p-2 rounded focus:outline-blue-500 text-sm" 
              required 
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center font-bold">{error}</p>}
          <button 
            type="submit" 
            disabled={!canSubmit} 
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded mt-2 shadow transition-colors ${!canSubmit ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {!canSubmit ? 'กำลังเชื่อมต่อเซิร์ฟเวอร์...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </div>
  );
};
