import { useState, useEffect } from 'react';
import { BottomNav } from './components/BottomNav';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { UniversalConverterPage } from './pages/UniversalConverterPage';
import { PageType } from './types';
import { FileText, Database, Image as ImageIcon, Terminal, ShieldCheck } from 'lucide-react';
import { auth, loginAnonymously } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

const PATH_TO_PAGE: Record<string, PageType> = {
  '/home': 'documents',
  '/pdf_converter': 'documents',
  '/documents': 'documents',
  '/data_converter': 'data',
  '/data': 'data',
  '/image_converter': 'images',
  '/images': 'images',
  '/system_converter': 'system',
  '/system': 'system',
};

const PAGE_TO_PATH: Record<PageType, string> = {
  'documents': '/pdf_converter',
  'data': '/data_converter',
  'images': '/image_converter',
  'system': '/system_converter',
};

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('documents');
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // URL Path Synchronizer & Router Setup
    const handleUrlChange = () => {
      const path = window.location.pathname.toLowerCase();
      if (path === '/' || path === '') {
        setCurrentPage('documents');
        window.history.replaceState(null, '', '/pdf_converter');
      } else if (PATH_TO_PAGE[path]) {
        setCurrentPage(PATH_TO_PAGE[path]);
      } else {
        // Unknown route fallback to /pdf_converter
        setCurrentPage('documents');
        window.history.replaceState(null, '', '/pdf_converter');
      }
    };

    // Perform initial path sync
    handleUrlChange();

    // Listen to window navigation (popstate)
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  const navigateToPage = (page: PageType) => {
    setCurrentPage(page);
    const path = PAGE_TO_PATH[page];
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
  };

  useEffect(() => {
    // Automatically authenticate anonymously in the background on load for every device
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setAuthError(null);
      } else {
        try {
          await loginAnonymously();
        } catch (error: any) {
          console.error("Auth init error:", error);
          if (error.code === 'auth/admin-restricted-operation') {
            setAuthError('Anonymous login is disabled in your Firebase project. Please enable "Anonymous" provider in the Firebase Console (Authentication > Sign-in method).');
          } else {
            setAuthError(error.message || 'Failed to initialize anonymous session.');
          }
        }
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950 selection:bg-blue-500/30 font-sans text-white">
      <main className="min-h-screen relative overflow-x-hidden pb-20 pt-5">
        {/* Background decorative elements */}
        <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 z-0" />
        <div className="fixed bottom-1/4 right-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none translate-x-1/3 z-0" />
        
        {/* Global Header */}
        <header className="relative z-10 w-full max-w-6xl mx-auto px-4 md:px-8 mb-5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-indigo-500/20 rounded-lg flex items-center justify-center border border-indigo-500/30">
              <div className="w-3.5 h-3.5 border-2 border-indigo-400 rounded-sm rotate-45"></div>
            </div>
            <span className="text-lg font-bold tracking-tight text-white uppercase">Splendid <span className="text-indigo-400 font-medium">All Files Conver</span></span>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <PwaInstallPrompt />
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-300 text-[9px] font-bold tracking-widest rounded-full border border-blue-500/20 backdrop-blur-md">
              <ShieldCheck size={10} className="text-blue-400" />
              ANONYMOUS CLOUD STORAGE
            </div>
          </div>
        </header>

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
              user={user}
              authError={authError}
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
              user={user}
              authError={authError}
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
              user={user}
              authError={authError}
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
              user={user}
              authError={authError}
            />
          )}
        </div>
      </main>
      
      <BottomNav currentPage={currentPage} onPageChange={navigateToPage} />
    </div>
  );
}

