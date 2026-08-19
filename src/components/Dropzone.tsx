import { UploadCloud } from 'lucide-react';
import React, { useState, useRef } from 'react';

interface DropzoneProps {
  onFilesDrop: (files: File[]) => void;
  accept: string;
  multiple?: boolean;
  label?: string;
}

export function Dropzone({ onFilesDrop, accept, multiple = true, label = 'Drag & drop files here' }: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files) as File[];
      onFilesDrop(multiple ? files : [files[0]]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      onFilesDrop(multiple ? files : [files[0]]);
    }
    // Reset so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`glass-panel rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer border-2 border-dashed transition-all duration-300 ${
        isDragging ? 'border-indigo-400 bg-indigo-500/10 scale-[1.02]' : 'border-white/20 hover:border-white/40'
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleChange}
        accept={accept}
        multiple={multiple}
        className="hidden"
      />
      <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-colors ${isDragging ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/10 text-white'}`}>
        <UploadCloud size={28} className={isDragging ? 'animate-bounce' : ''} />
      </div>
      <h2 className="text-lg font-bold text-white mb-1">{label}</h2>
      <p className="text-white/60 text-center text-xs max-w-sm mb-5">
        Supports {accept.split(',').join(', ')}. Max 500MB per file.
      </p>
      <button className="glass-button px-5 py-2 text-sm rounded-lg font-semibold transition-all">
        Select from Computer
      </button>
    </div>
  );
}
