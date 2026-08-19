import { useState } from 'react';
import { Dropzone } from '../components/Dropzone';
import { ConversionList } from '../components/ConversionList';
import { convertImage } from '../lib/converter';
import { ConvertedFile } from '../types';

export function ImageConverter() {
  const [files, setFiles] = useState<ConvertedFile[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [targetFormat, setTargetFormat] = useState<'image/png' | 'image/jpeg' | 'image/webp'>('image/webp');
  const [quality, setQuality] = useState(0.85);

  const handleFilesDrop = async (droppedFiles: File[]) => {
    setIsConverting(true);
    
    try {
      const newFiles: ConvertedFile[] = [];
      for (const file of droppedFiles) {
        if (!file.type.startsWith('image/')) continue;
        const converted = await convertImage(file, targetFormat, quality);
        newFiles.push(converted);
      }
      
      setFiles(prev => [...newFiles, ...prev]);
    } catch (error) {
      console.error('Conversion failed:', error);
      alert('Failed to convert some images. Check console for details.');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7 flex flex-col gap-6">
        <Dropzone 
          onFilesDrop={handleFilesDrop} 
          accept="image/png, image/jpeg, image/webp, image/svg+xml"
          multiple={true}
          label="Drop files to convert"
        />
        <ConversionList files={files} isConverting={isConverting} />
      </div>

      <aside className="lg:col-span-5 flex flex-col gap-6">
        <div className="glass-panel rounded-3xl p-6 shadow-xl flex-1 flex flex-col">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-white">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            Output Configuration
          </h3>
          <div className="space-y-6 flex-1">
            <div>
              <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-3">Convert To</label>
              <div className="grid grid-cols-3 gap-2">
                {(['image/png', 'image/jpeg', 'image/webp'] as const).map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => setTargetFormat(fmt)}
                    className={`py-2 px-1 rounded-xl text-sm font-bold border transition-colors ${
                      targetFormat === fmt 
                        ? 'bg-indigo-500/30 border-indigo-400 text-white' 
                        : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/70'
                    }`}
                  >
                    {fmt.split('/')[1].toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            
            {targetFormat !== 'image/png' && (
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs font-bold text-white/50 uppercase tracking-widest">Quality (Lossy)</label>
                  <span className="text-xs font-mono text-indigo-300">{Math.round(quality * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.1" max="1" step="0.1" 
                  value={quality} 
                  onChange={e => setQuality(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                />
              </div>
            )}
            
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-white/20 bg-white/10 text-indigo-500 focus:ring-offset-slate-900" />
                <span className="text-sm text-white/70">Keep original metadata (EXIF)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-white/20 bg-white/10 text-indigo-500 focus:ring-offset-slate-900" />
                <span className="text-sm text-white/70">Auto-resize to Web optimized</span>
              </label>
            </div>
          </div>
          <button className="glass-button mt-auto w-full py-4 font-bold rounded-xl transition-all">
            Save Settings
          </button>
        </div>
      </aside>
    </div>
  );
}
