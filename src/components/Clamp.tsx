'use client';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/**
 * 長い説明を最初は数行だけ見せ、「続きを読む」で開く。
 * 行数に収まるときはボタンを出さない。JS が無いときは全文を出す（clamp は JS が動いてから付ける）。
 */
export function Clamp({ children, lines = 3, className }: { children: ReactNode; lines?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [over, setOver] = useState(false);
  useEffect(() => setReady(true), []);
  // 閉じているときだけ、行数からはみ出しているかを測る（開いているときは測らない）
  useEffect(() => {
    const el = ref.current;
    if (!el || !ready || open) return;
    const check = () => setOver(el.scrollHeight > el.clientHeight + 2);
    requestAnimationFrame(check);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [ready, open]);
  const clamped = ready && !open;
  return (
    <div className={className}>
      <div ref={ref} className={clamped ? 'clamp' : undefined} style={clamped ? ({ WebkitLineClamp: lines } as CSSProperties) : undefined}>
        {children}
      </div>
      {ready && (over || open) && (
        <button type="button" className="clamp-btn" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? '閉じる' : '続きを読む'}
        </button>
      )}
    </div>
  );
}
