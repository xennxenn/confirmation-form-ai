import React from 'react';
import { AutoFitText } from './AutoFitText';
import { optImg } from '../utils';

interface InfoCardProps {
  title: string;
  imgUrl: string | null | undefined;
  text1: string;
  imgUrl2?: string | null | undefined;
  color2?: string | null | undefined;
  text2?: string;
  isDim?: boolean;
  bgColor?: string;
  fallbackType?: 'style' | 'fabric' | 'sheer' | 'margin';
}

export const InfoCard: React.FC<InfoCardProps> = React.memo(({ 
  title, 
  imgUrl, 
  text1, 
  imgUrl2, 
  color2, 
  text2, 
  isDim = false,
  bgColor,
  fallbackType
}) => {
  const hasSplit = imgUrl2 !== undefined || color2 !== undefined || text2 !== undefined;

  const renderFallback = () => {
    if (bgColor) {
      return <div className="absolute inset-0 w-full h-full" style={{ backgroundColor: bgColor }} />;
    }
    
    switch (fallbackType) {
      case 'style':
        return (
          <svg className="w-10 h-10 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 3h18v18H3z" rx="2" />
            <path d="M9 3v18M15 3v18" strokeDasharray="2 2" />
          </svg>
        );
      case 'fabric':
        return (
          <svg className="w-10 h-10 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <path d="M2 10h20M2 14h20" strokeDasharray="3 3" />
          </svg>
        );
      case 'sheer':
        return (
          <svg className="w-10 h-10 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 4h16v16H4z" opacity="0.3" fill="currentColor" />
            <path d="M4 4h16v16H4z" />
            <path d="M8 4v16M12 4v16M16 4v16" strokeWidth="1" strokeDasharray="1 1" />
          </svg>
        );
      case 'margin':
        return (
          <svg className="w-10 h-10 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="4" y1="20" x2="20" y2="20" strokeWidth="2" strokeLinecap="round" />
            <path d="M6 4h12v11H6z" fill="currentColor" fillOpacity="0.08" strokeDasharray="2 2" />
            <line x1="12" y1="11" x2="12" y2="19" strokeWidth="1.5" strokeLinecap="round" />
            <polyline points="9,16 12,19 15,16" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      default:
        return <span className="text-[10px] text-gray-400">-</span>;
    }
  };

  return (
    <div className={`flex flex-col items-center bg-white border border-gray-200 p-1.5 sm:p-2 rounded shadow-sm h-full justify-between overflow-hidden ${isDim ? 'opacity-40 print:opacity-50' : ''}`}>
      <span className="text-[11px] sm:text-[13px] font-bold text-gray-800 w-full text-center mb-1 sm:mb-2 shrink-0">{title}</span>
      <div className="flex-1 w-full border border-gray-100 flex items-center justify-center rounded overflow-hidden bg-gray-50 p-0 relative mb-1 sm:mb-2">
        {hasSplit ? (
          <div className="flex w-full h-full">
            {/* Left Box (Blinds Fabric) */}
            <div className="w-1/2 h-full border-r border-gray-200 relative flex items-center justify-center overflow-hidden bg-gray-50">
              {imgUrl ? (
                <img src={optImg(imgUrl, 400)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-[10px] text-gray-400 font-bold">มู่ลี่</span>
              )}
            </div>
            {/* Right Box (Tape Fabric or Color) */}
            <div className="w-1/2 h-full relative flex items-center justify-center overflow-hidden" style={{ backgroundColor: color2 || '#F3F4F6' }}>
              {imgUrl2 ? (
                <img src={optImg(imgUrl2, 400)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : color2 ? (
                <div className="absolute inset-0 flex items-center justify-center text-[9px] text-white font-bold bg-opacity-30 bg-black">
                  {text2 || 'เทป'}
                </div>
              ) : (
                <span className="text-[10px] text-gray-400 font-bold">เทป</span>
              )}
            </div>
          </div>
        ) : imgUrl ? (
          <img src={optImg(imgUrl, 400)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          renderFallback()
        )}
      </div>
      <div className="w-full flex flex-col items-center text-center">
        <AutoFitText text={text1 || '-'} className="text-blue-800 print:text-black font-semibold text-xs" />
        {hasSplit && text2 && (
          <span className="text-[9px] text-gray-500 font-semibold truncate max-w-full mt-0.5 leading-none">
            {text2}
          </span>
        )}
      </div>
    </div>
  );
});

InfoCard.displayName = 'InfoCard';
