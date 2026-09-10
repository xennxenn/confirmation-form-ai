import React from 'react';

export interface DialogState {
  type: 'confirm' | 'alert';
  message: string;
  onConfirm?: () => void;
}

interface AlertDialogProps {
  dialog: DialogState | null;
  onClose: () => void;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({ dialog, onClose }) => {
  if (!dialog) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-[9999999] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
        <p className="text-gray-800 mb-6 font-bold text-sm whitespace-pre-wrap">{dialog.message}</p>
        <div className="flex gap-4 w-full justify-center">
          {dialog.type === 'confirm' && (
            <button 
              onClick={onClose} 
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded font-bold text-gray-700 text-sm transition-colors"
            >
              ยกเลิก
            </button>
          )}
          <button 
            onClick={() => { 
              if (dialog.onConfirm) dialog.onConfirm(); 
              onClose(); 
            }} 
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-sm shadow transition-colors"
          >
            {dialog.type === 'confirm' ? 'ตกลง' : 'รับทราบ'}
          </button>
        </div>
      </div>
    </div>
  );
};
