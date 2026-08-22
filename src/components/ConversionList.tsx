import { useState, useEffect } from 'react';
import { Download, Clock, Eye, X } from 'lucide-react';
import { ConvertedFile } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface ConversionListProps {
  files: ConvertedFile[];
  isConverting: boolean;
  progress?: number;
  onDownloadComplete?: (file: ConvertedFile) => void;
}

export function ConversionList({ files, isConverting, progress = 0, onDownloadComplete }: ConversionListProps) {
  const [previewFile, setPreviewFile] = useState<ConvertedFile | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);

  useEffect(() => {
    if (!previewFile) {
      setPreviewText(null);
      return;
    }
    const ext = previewFile.convertedName.split('.').pop()?.toLowerCase() || '';
    const isText = ['txt', 'json', 'xml', 'html', 'css', 'js', 'ts', 'csv', 'md'].includes(ext) || previewFile.type.startsWith('text/');
    
    if (isText) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewText(e.target?.result as string || '');
      };
      reader.onerror = () => {
        setPreviewText('Unable to read content for preview.');
      };
      reader.readAsText(previewFile.blob);
    } else {
      setPreviewText(null);
    }
  }, [previewFile]);

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

  const canPreview = (file: ConvertedFile) => {
    const ext = file.convertedName.split('.').pop()?.toLowerCase() || '';
    const isImage = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'bmp'].includes(ext) || file.type.startsWith('image/');
    const isText = ['txt', 'json', 'xml', 'html', 'css', 'js', 'ts', 'csv', 'md'].includes(ext) || file.type.startsWith('text/');
    return isImage || isText;
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
          const fileCanPreview = canPreview(file);
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
                <div className="flex items-center gap-1.5">
                  {fileCanPreview && (
                    <button
                      onClick={() => setPreviewFile(file)}
                      className="glass-button bg-white/5 hover:bg-white/15 border-white/10 text-white/90 px-2 py-1 rounded-lg text-[10px] flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    >
                      <Eye size={10} className="text-indigo-400" />
                      Preview
                    </button>
                  )}
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
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Mirror Glass Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="w-full max-w-2xl max-h-[80vh] flex flex-col glass-panel rounded-2xl border border-white/15 bg-white/5 p-6 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div>
                  <h3 className="font-bold text-white text-sm truncate max-w-md">{previewFile.convertedName}</h3>
                  <p className="text-[10px] text-white/50">Previewing converted file output</p>
                </div>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-auto min-h-0 bg-slate-950/40 rounded-xl border border-white/5 p-4 flex items-center justify-center">
                {previewText !== null ? (
                  <pre className="w-full h-full font-mono text-xs text-white/80 whitespace-pre-wrap select-text selection:bg-blue-500/30 text-left align-top self-start">
                    {previewText || <span className="text-white/30 italic">No text content inside this file.</span>}
                  </pre>
                ) : (
                  <img
                    src={previewFile.url}
                    alt={previewFile.convertedName}
                    referrerPolicy="no-referrer"
                    className="max-w-full max-h-[50vh] object-contain rounded shadow-lg border border-white/15"
                  />
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10 mt-4">
                <button
                  onClick={() => setPreviewFile(null)}
                  className="glass-button bg-white/5 hover:bg-white/10 border-white/10 text-white/70 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
                <a
                  href={previewFile.url}
                  download={previewFile.convertedName}
                  onClick={() => {
                    handleDownload(previewFile);
                    setPreviewFile(null);
                  }}
                  className="glass-button bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/30 text-emerald-100 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download size={12} className="text-emerald-400" />
                  Download File
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


