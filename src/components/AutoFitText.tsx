import React, { useEffect, useRef } from 'react';

interface AutoFitTextProps {
  text: string;
  className?: string;
}

export const AutoFitText: React.FC<AutoFitTextProps> = React.memo(({ text, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const resizeText = () => {
      if (!containerRef.current || !textRef.current) return;
      const cw = containerRef.current.clientWidth;
      const textEl = textRef.current;
      textEl.style.fontSize = '13px';
      const tw = textEl.scrollWidth;
      if (tw > cw && cw > 0) {
        textEl.style.fontSize = `${Math.max(Math.floor(13 * ((cw - 12) / tw)), 7)}px`;
      }
    };
    resizeText();
    const timeoutId = setTimeout(resizeText, 300);
    let observer: ResizeObserver | undefined;
    if (window.ResizeObserver && containerRef.current) {
      observer = new ResizeObserver(resizeText);
      observer.observe(containerRef.current);
    }
    window.addEventListener('beforeprint', resizeText);
    return () => {
      clearTimeout(timeoutId);
      if (observer) observer.disconnect();
      window.removeEventListener('beforeprint', resizeText);
    };
  }, [text]);

  if (!text) return null;
  return (
    <div ref={containerRef} className="w-full overflow-hidden print:overflow-visible px-1 flex items-center justify-center min-h-[20px]">
      <span ref={textRef} className={`font-bold whitespace-nowrap ${className || ''}`} style={{ display: 'inline-block' }}>{text}</span>
    </div>
  );
});

AutoFitText.displayName = 'AutoFitText';
