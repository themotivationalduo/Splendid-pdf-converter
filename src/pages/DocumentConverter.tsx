import { useState } from 'react';
import { Dropzone } from '../components/Dropzone';
import { ConversionList } from '../components/ConversionList';
import { imagesToPdf } from '../lib/converter';
import { ConvertedFile } from '../types';
import { FileText } from 'lucide-react';

export function DocumentConverter() {
  const [files, setFiles] = useState<ConvertedFile[]>([]);
  const [isConverting, setIsConverting] = useState(false);

  const handleFilesDrop = async (droppedFiles: File[]) => {
    setIsConverting(true);
    
    try {
      // Filter out non-images
      const validFiles = droppedFiles.filter(f => f.type.startsWith('image/'));
      
      if (validFiles.length === 0) {
        alert('Please select at least one image file (PNG, JPG).');
        setIsConverting(false);
        return;
      }

      const converted = await imagesToPdf(validFiles);
      setFiles(prev => [converted, ...prev]);
    } catch (error) {
      console.error('Conversion failed:', error);
      alert('Failed to generate PDF. Check console for details.');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7 flex flex-col gap-6">
        <Dropzone 
          onFilesDrop={handleFilesDrop} 
          accept="image/png, image/jpeg"
          multiple={true}
          label="Drop images to generate PDF"
        />
        <ConversionList files={files} isConverting={isConverting} />
      </div>

      <aside className="lg:col-span-5 flex flex-col gap-6">
        <div className="glass-panel rounded-3xl p-6 shadow-xl flex-1 flex flex-col">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-white">
            <FileText className="w-5 h-5 text-indigo-400" />
            PDF Settings
          </h3>
          <div className="space-y-6 flex-1 text-sm text-white/70">
            <p>Documents are generated locally using Web Workers to prevent UI freezing.</p>
            <p>Ensure your images are ordered correctly before dropping them, as they will be added sequentially.</p>
            <div className="p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-300 text-xs">
              <span className="font-bold block mb-1">PRO TIP</span>
              Drop multiple files at once from your file explorer to maintain sequence.
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
