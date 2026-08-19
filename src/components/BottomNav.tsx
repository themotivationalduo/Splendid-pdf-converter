import { useEffect, useState } from 'react';
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
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
      }`}
    >
      <div className="glass-panel p-1.5 rounded-full flex items-center space-x-1 sm:space-x-1.5">
        <button
          onClick={() => onPageChange('documents')}
          className={`flex items-center space-x-1.5 px-3 sm:px-4 py-2 rounded-full transition-all duration-300 ${
            currentPage === 'documents' ? 'bg-white/20 text-white shadow-md' : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <span className="text-sm leading-none">📄</span>
          <span className="text-xs font-medium hidden sm:inline">Documents</span>
        </button>
        
        <button
          onClick={() => onPageChange('data')}
          className={`flex items-center space-x-1.5 px-3 sm:px-4 py-2 rounded-full transition-all duration-300 ${
            currentPage === 'data' ? 'bg-white/20 text-white shadow-md' : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <span className="text-sm leading-none">📊</span>
          <span className="text-xs font-medium hidden sm:inline">Data</span>
        </button>

        <button
          onClick={() => onPageChange('images')}
          className={`flex items-center space-x-1.5 px-3 sm:px-4 py-2 rounded-full transition-all duration-300 ${
            currentPage === 'images' ? 'bg-white/20 text-white shadow-md' : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <span className="text-sm leading-none">🖼️</span>
          <span className="text-xs font-medium hidden sm:inline">Images</span>
        </button>
        
        <button
          onClick={() => onPageChange('system')}
          className={`flex items-center space-x-1.5 px-3 sm:px-4 py-2 rounded-full transition-all duration-300 ${
            currentPage === 'system' ? 'bg-white/20 text-white shadow-md' : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <span className="text-sm leading-none">💻</span>
          <span className="text-xs font-medium hidden sm:inline">System</span>
        </button>
      </div>
    </div>
  );
}
