import { useState } from 'react';
import { Dropzone } from '../components/Dropzone';
import { ConversionList } from '../components/ConversionList';
import { processConversion } from '../lib/universal-converter';
import { ConvertedFile } from '../types';
import { LucideIcon } from 'lucide-react';

interface UniversalConverterPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  supportedFormats: string[];
  defaultTarget: string;
  acceptHeader: string;
}

export function UniversalConverterPage({
  title,
  description,
  icon: Icon,
  iconColor,
  iconBgColor,
  supportedFormats,
  defaultTarget,
  acceptHeader,
}: UniversalConverterPageProps) {
  const [files, setFiles] = useState<ConvertedFile[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [targetFormat, setTargetFormat] = useState(defaultTarget);

  const handleFilesDrop = async (droppedFiles: File[]) => {
    setIsConverting(true);
    
    try {
      const newFiles: ConvertedFile[] = [];
      for (const file of droppedFiles) {
        try {
          const converted = await processConversion(file, targetFormat);
          newFiles.push(converted);
        } catch (err: any) {
          alert(`Failed to convert ${file.name}: ${err.message || 'Format not fully supported locally.'}`);
        }
      }
      setFiles(prev => [...newFiles, ...prev]);
    } catch (error) {
      console.error('Batch failed:', error);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
      <div className="lg:col-span-7 flex flex-col gap-6">
        <div className="glass-panel rounded-3xl p-8 flex flex-col sm:flex-row items-center gap-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className={`w-16 h-16 rounded-full ${iconBgColor} flex items-center justify-center shrink-0 z-10`}>
            <Icon size={32} className={iconColor} />
          </div>
          <div className="text-center sm:text-left z-10">
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">{title}</h1>
            <p className="text-white/60 text-sm max-w-md">{description}</p>
          </div>
        </div>

        <Dropzone 
          onFilesDrop={handleFilesDrop} 
          accept={acceptHeader}
          multiple={true}
          label={`Drop files to convert to ${targetFormat.toUpperCase()}`}
        />
        <ConversionList files={files} isConverting={isConverting} />
      </div>

      <aside className="lg:col-span-5 flex flex-col gap-6">
        <div className="glass-panel rounded-3xl p-6 shadow-xl flex-1 flex flex-col">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-white">
            <Icon className={`w-5 h-5 ${iconColor}`} />
            Target Format
          </h3>
          <div className="space-y-6 flex-1">
            <div>
              <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-3">Convert To</label>
              <div className="grid grid-cols-3 gap-2">
                {supportedFormats.map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => setTargetFormat(fmt)}
                    className={`py-3 px-1 rounded-xl text-sm font-bold border transition-all ${
                      targetFormat === fmt 
                        ? 'bg-indigo-500/30 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] scale-105' 
                        : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/70 hover:scale-105'
                    }`}
                  >
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-200 text-xs">
              <span className="font-bold block mb-1">LOCAL PROCESSING</span>
              Conversions are securely processed using local resources. Highly complex or proprietary binaries might fallback to text extraction or raw conversion depending on browser capability.
            </div>
          </div>
          <button className="glass-button mt-auto w-full py-4 font-bold rounded-xl transition-all">
            Apply Configuration
          </button>
        </div>
      </aside>
    </div>
  );
}
