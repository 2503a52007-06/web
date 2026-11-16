import { BookOpen } from 'lucide-react';
import { useState } from 'react';

interface BookCoverImageProps {
  src: string;
  title: string;
  department: string;
  className?: string;
}

export function BookCoverImage({
  src,
  title,
  department,
  className = '',
}: BookCoverImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-100 border border-slate-200 text-slate-600 p-3 text-center ${className}`}
        aria-label={`Cover placeholder for ${title}`}
      >
        <BookOpen className="w-6 h-6 text-slate-400 mb-2 shrink-0" />
        <span className="text-xs font-medium text-slate-700 line-clamp-2">{title}</span>
        <span className="text-[11px] text-slate-500 mt-1">{department}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`Cover illustration for ${title}`}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover bg-slate-100 border border-slate-200 ${className}`}
    />
  );
}
