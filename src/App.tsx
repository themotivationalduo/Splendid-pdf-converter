import { useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { UniversalConverterPage } from './pages/UniversalConverterPage';
import { PageType } from './types';
import { FileText, Database, Image as ImageIcon, Terminal } from 'lucide-react';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('documents');

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950 selection:bg-blue-500/30 font-sans text-white">
      <main className="min-h-screen relative overflow-x-hidden pb-28 pt-8">
        {/* Background decorative elements */}
        <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 z-0" />
        <div className="fixed bottom-1/4 right-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none translate-x-1/3 z-0" />
        
        {/* Content */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 md:px-8">
          {currentPage === 'documents' && (
            <UniversalConverterPage
              title="Document Converter"
              description="Convert between PDF, DOCX, TXT, RTF, ODT, EPUB, and HTML locally."
              icon={FileText}
              iconColor="text-blue-400"
              iconBgColor="bg-blue-500/20"
              supportedFormats={['pdf', 'docx', 'doc', 'txt', 'rtf', 'odt', 'epub', 'html']}
              defaultTarget="pdf"
              acceptHeader=".pdf,.docx,.doc,.txt,.rtf,.odt,.epub,.html"
            />
          )}
          {currentPage === 'data' && (
            <UniversalConverterPage
              title="Data & Spreadsheets"
              description="Instantly transpile CSV, JSON, XML, and Excel workbooks."
              icon={Database}
              iconColor="text-emerald-400"
              iconBgColor="bg-emerald-500/20"
              supportedFormats={['xlsx', 'xls', 'csv', 'json', 'xml', 'ods']}
              defaultTarget="csv"
              acceptHeader=".xlsx,.xls,.csv,.json,.xml,.ods"
            />
          )}
          {currentPage === 'images' && (
            <UniversalConverterPage
              title="Image Converter"
              description="Lossless and lossy conversion between modern web graphics."
              icon={ImageIcon}
              iconColor="text-fuchsia-400"
              iconBgColor="bg-fuchsia-500/20"
              supportedFormats={['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'svg']}
              defaultTarget="webp"
              acceptHeader="image/*"
            />
          )}
          {currentPage === 'system' && (
            <UniversalConverterPage
              title="Code & System"
              description="Manage system files, presentations, and executables."
              icon={Terminal}
              iconColor="text-amber-400"
              iconBgColor="bg-amber-500/20"
              supportedFormats={['exe', 'apk', 'dmg', 'iso', 'pptx', 'key', 'css', 'js']}
              defaultTarget="js"
              acceptHeader=".exe,.apk,.dmg,.iso,.pptx,.key,.css,.js,.ts,.php,.py"
            />
          )}
        </div>
      </main>
      
      <BottomNav currentPage={currentPage} onPageChange={setCurrentPage} />
    </div>
  );
}

