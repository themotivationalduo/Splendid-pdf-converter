import { useState } from 'react';
import { Dropzone } from '../components/Dropzone';
import { FileText, Type } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export function TextExtractor() {
  const [extractedText, setExtractedText] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);

  const handleFilesDrop = async (droppedFiles: File[]) => {
    setIsExtracting(true);
    setExtractedText('');
    
    try {
      const file = droppedFiles[0];
      if (file.type !== 'application/pdf') {
        alert('Please upload a PDF file.');
        setIsExtracting(false);
        return;
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += `--- Page ${i} ---\n${pageText}\n\n`;
      }
      
      setExtractedText(fullText || 'No text found in this document.');
    } catch (error) {
      console.error('Extraction failed:', error);
      alert('Failed to extract text. The PDF might be scanned or encrypted.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDownloadText = () => {
    const blob = new Blob([extractedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extracted_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7 flex flex-col gap-6">
        <Dropzone 
          onFilesDrop={handleFilesDrop} 
          accept="application/pdf"
          multiple={false}
          label="Drop a PDF file to extract text"
        />

        {isExtracting && (
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center text-white/50 animate-pulse font-medium">
            Extracting text from document...
          </div>
        )}

        {extractedText && (
          <div className="glass-panel rounded-3xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h3 className="font-bold text-white">Extracted Text</h3>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              <pre className="text-white/80 whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {extractedText}
              </pre>
            </div>
          </div>
        )}
      </div>

      <aside className="lg:col-span-5 flex flex-col gap-6">
        <div className="glass-panel rounded-3xl p-6 shadow-xl flex flex-col flex-1">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-white">
            <Type className="w-5 h-5 text-indigo-400" />
            Actions
          </h3>
          <div className="space-y-4 flex-1">
            <p className="text-sm text-white/70">
              Text extraction is performed client-side and is subject to the PDF's internal encoding. Scanned images require OCR and are not currently supported.
            </p>
          </div>
          <button
            onClick={handleDownloadText}
            disabled={!extractedText}
            className={`w-full py-4 mt-auto font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
              extractedText 
                ? 'glass-button' 
                : 'bg-white/5 text-white/30 cursor-not-allowed'
            }`}
          >
            <FileText size={18} />
            Save as TXT
          </button>
        </div>
      </aside>
    </div>
  );
}
