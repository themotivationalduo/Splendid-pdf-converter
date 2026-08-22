import { Download, Clock } from 'lucide-react';
import { ConvertedFile } from '../types';
import { motion } from 'motion/react';

interface ConversionListProps {
  files: ConvertedFile[];
  isConverting: boolean;
  progress?: number;
  onDownloadComplete?: (file: ConvertedFile) => void;
}

export function ConversionList({ files, isConverting, progress = 0, onDownloadComplete }: ConversionListProps) {
  if (files.length === 0 && !isConverting) return null;

  const handleDownload = (file: ConvertedFile) => {
    // Let the native download start
    setTimeout(() => {
      // Release the memory blob
      URL.revokeObjectURL(file.url);
      // Remove it from the list and trigger cleanup
      if (onDownloadComplete) onDownloadComplete(file);
    }, 1000);
  };

  return (
    <div className="glass-panel rounded-2xl p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-white text-base">Active Queue</h3>
        <span className="text-[10px] font-semibold text-white/50 uppercase tracking-widest">{files.length} Completed</span>
      </div>
      
      <div className="space-y-2">
        {isConverting && (
          <div className="flex flex-col gap-2 p-3 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/70 flex items-center gap-1.5">
                <Clock className="text-indigo-400 animate-pulse" size={12} />
                Processing...
              </span>
              <span className="text-indigo-300 font-mono font-medium">{progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300 relative overflow-hidden"
                style={{ width: `${Math.max(5, progress)}%` }}
              >
                <div className="absolute inset-0 bg-white/20 w-full animate-[pulse_1.5s_ease-in-out_infinite]" />
              </div>
            </div>
          </div>
        )}

        {files.map((file) => {
          const ext = file.convertedName.split('.').pop()?.toUpperCase() || 'FILE';
          return (
            <motion.div 
              key={file.id} 
              initial={{ scale: 0.94, opacity: 0, y: 10, borderColor: "rgba(52, 211, 153, 0.4)" }}
              animate={{ 
                scale: 1, 
                opacity: 1, 
                y: 0,
                borderColor: ["rgba(52, 211, 153, 0.4)", "rgba(52, 211, 153, 0.8)", "rgba(255, 255, 255, 0.1)"]
              }}
              transition={{ 
                borderColor: { duration: 2.5, ease: "easeInOut", times: [0, 0.2, 1] },
                default: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
              }}
              className="flex items-center gap-3 p-2 bg-emerald-500/5 rounded-xl border group hover:bg-emerald-500/10 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.05)]"
            >
              <div className="w-7 h-7 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-300 font-bold text-[10px] shrink-0 border border-emerald-500/30">
                {ext.substring(0, 4)}
              </div>
              <div className="flex-1 min-w-0 flex items-center justify-between">
                <div className="flex-1 min-w-0 pr-3">
                  <div className="font-medium text-white text-xs truncate">{file.convertedName}</div>
                  <div className="text-[10px] text-emerald-200/50 truncate">
                    from {file.originalName} • {(file.size / 1024).toFixed(1)} KB
                  </div>
                </div>
                <a
                  href={file.url}
                  download={file.convertedName}
                  onClick={() => handleDownload(file)}
                  className="glass-button bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/30 text-emerald-100 px-2.5 py-1 rounded-lg text-[10px] flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                >
                  <Download size={10} className="text-emerald-400" />
                  Download
                </a>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

