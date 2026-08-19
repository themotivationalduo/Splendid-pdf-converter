import { Download, Clock } from 'lucide-react';
import { ConvertedFile } from '../types';

interface ConversionListProps {
  files: ConvertedFile[];
  isConverting: boolean;
}

export function ConversionList({ files, isConverting }: ConversionListProps) {
  if (files.length === 0 && !isConverting) return null;

  return (
    <div className="glass-panel rounded-3xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-white text-lg">Active Queue</h3>
        <span className="text-xs font-semibold text-white/50 uppercase tracking-widest">{files.length} Completed</span>
      </div>
      
      <div className="space-y-3">
        {isConverting && (
          <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/10 animate-pulse">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center">
              <Clock className="text-indigo-400" size={18} />
            </div>
            <div className="flex-1">
              <div className="h-4 w-32 bg-white/20 rounded mb-2"></div>
              <div className="h-2 w-full bg-white/10 rounded-full"></div>
            </div>
          </div>
        )}

        {files.map((file) => {
          const ext = file.convertedName.split('.').pop()?.toUpperCase() || 'FILE';
          return (
            <div key={file.id} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/10 group hover:bg-white/10 transition-colors">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-300 font-bold text-xs shrink-0">
                {ext.substring(0, 4)}
              </div>
              <div className="flex-1 min-w-0 flex items-center justify-between">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="font-medium text-white text-sm truncate">{file.convertedName}</div>
                  <div className="text-xs text-white/50 truncate">
                    from {file.originalName} • {(file.size / 1024).toFixed(1)} KB
                  </div>
                </div>
                <a
                  href={file.url}
                  download={file.convertedName}
                  className="glass-button px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                >
                  <Download size={14} />
                  Download
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
