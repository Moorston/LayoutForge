import React, { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface UploadZoneProps {
  onUpload: (file: File) => void;
}

export function UploadZone({ onUpload }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onUpload(file);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <div
        className={cn(
          "relative border-2 border-dashed rounded-3xl p-16 transition-all duration-500 flex flex-col items-center justify-center cursor-pointer group",
          dragActive ? "border-slate-900 bg-white scale-[1.01] shadow-2xl" : "border-slate-200 bg-white/50 hover:bg-white hover:border-slate-300"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleChange}
        />
        
        <div className="bg-slate-900 w-16 h-16 rounded-2xl shadow-xl mb-8 flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
          <Upload className="w-6 h-6 text-white" />
        </div>
        
        <h3 className="text-2xl font-extrabold tracking-tighter text-slate-900 mb-3">
          Drop your screenshot here
        </h3>
        <p className="text-slate-500 text-center max-w-sm mb-10 leading-relaxed font-medium">
          Upload any webpage screenshot or image to replicate its layout and content instantly.
        </p>
        
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <ImageIcon className="w-3.5 h-3.5" />
            JPG, PNG, WebP
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <Upload className="w-3.5 h-3.5" />
            Max 10MB
          </div>
        </div>
      </div>
    </div>
  );
}
