import React from 'react';

interface MarginSelectorProps {
  label: string;
  field: string;
  customField: string;
  item: any;
  options: string[];
  onChange: (id: string, field: string, value: any) => void;
}

export const MarginSelector: React.FC<MarginSelectorProps> = React.memo(({ label, field, customField, item, options, onChange }) => (
  <div className="flex flex-col w-1/2">
    <span className="text-gray-600 font-bold">{label}:</span>
    <select 
      value={item[field]} 
      onChange={(e) => onChange(item.id, field, e.target.value)} 
      className="border-b border-gray-300 outline-none print-hidden bg-transparent font-medium text-blue-700 h-7"
    >
      <option value="">-เลือก-</option>
      {options.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
    {item[field] === 'ระบุเอง...' && (
      <input 
        type="text" 
        value={item[customField]} 
        onChange={(e) => onChange(item.id, customField, e.target.value)} 
        placeholder="พิมพ์ระบุ..." 
        className="border-b border-dashed border-gray-400 bg-transparent outline-none mt-1 print-hidden text-blue-700 font-bold text-xs"
      />
    )}
    <div className="hidden print-block font-bold text-gray-800 whitespace-pre-wrap mt-0.5">
      {item[field] === 'ระบุเอง...' ? item[customField] : (item[field] || '-')}
    </div>
  </div>
));

MarginSelector.displayName = 'MarginSelector';
