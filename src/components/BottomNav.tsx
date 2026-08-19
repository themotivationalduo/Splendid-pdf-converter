import { useEffect, useState } from 'react';
import { FileText, Database, Image as ImageIcon, Terminal } from 'lucide-react';
import { PageType } from '../types';

interface BottomNavProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}

export function BottomNav({ currentPage, onPageChange }: BottomNavProps) {
  const [isVisible, setIsVisible] = useState(true);
  let scrollTimeout: number | null = null;

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(false);
      if (scrollTimeout) window.clearTimeout(scrollTimeout);
      scrollTimeout = window.setTimeout(() => setIsVisible(true), 300);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) window.clearTimeout(scrollTimeout);
    };
  }, []);

  return (
    <div 
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'
      }`}
    >
      <div className="glass-panel p-2 rounded-full flex items-center space-x-1 sm:space-x-2">
        <button
          onClick={() => onPageChange('documents')}
          className={`flex items-center space-x-2 px-4 sm:px-6 py-3 rounded-full transition-all duration-300 ${
            currentPage === 'documents' ? 'bg-white/20 text-white shadow-md' : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <FileText size={20} />
          <span className="font-medium hidden sm:inline">Documents</span>
        </button>
        
        <button
          onClick={() => onPageChange('data')}
          className={`flex items-center space-x-2 px-4 sm:px-6 py-3 rounded-full transition-all duration-300 ${
            currentPage === 'data' ? 'bg-white/20 text-white shadow-md' : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <Database size={20} />
          <span className="font-medium hidden sm:inline">Data</span>
        </button>

        <button
          onClick={() => onPageChange('images')}
          className={`flex items-center space-x-2 px-4 sm:px-6 py-3 rounded-full transition-all duration-300 ${
            currentPage === 'images' ? 'bg-white/20 text-white shadow-md' : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <ImageIcon size={20} />
          <span className="font-medium hidden sm:inline">Images</span>
        </button>
        
        <button
          onClick={() => onPageChange('system')}
          className={`flex items-center space-x-2 px-4 sm:px-6 py-3 rounded-full transition-all duration-300 ${
            currentPage === 'system' ? 'bg-white/20 text-white shadow-md' : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <Terminal size={20} />
          <span className="font-medium hidden sm:inline">System</span>
        </button>
      </div>
    </div>
  );
}
