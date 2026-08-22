import { useState, useEffect } from 'react';
import { Dropzone } from '../components/Dropzone';
import { ConversionList } from '../components/ConversionList';
import { processConversion } from '../lib/universal-converter';
import { ConvertedFile } from '../types';
import { LucideIcon, ShieldCheck, X, File as FileIcon, Cloud } from 'lucide-react';
import { User } from 'firebase/auth';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';

interface UniversalConverterPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  supportedFormats: string[];
  defaultTarget: string;
  acceptHeader: string;
  user: User | null;
  authError: string | null;
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
  user,
  authError,
}: UniversalConverterPageProps) {
  const [files, setFiles] = useState<ConvertedFile[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [targetFormat, setTargetFormat] = useState(defaultTarget);
  const [hasProductionToken, setHasProductionToken] = useState(false);
  const [isDraggingWindow, setIsDraggingWindow] = useState(false);
  const [conversionsCount, setConversionsCount] = useState(0);
  const [dailyLimit] = useState(5); // 5 free premium conversions per day limit

  useEffect(() => {
    if (!user) return;
    
    let unsubscribe: () => void;
    
    const initLimits = async () => {
      try {
        const { doc, onSnapshot, setDoc, serverTimestamp } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        
        const docRef = doc(db, 'userLimits', user.uid);
        const todayStr = new Date().toISOString().split('T')[0];
        
        unsubscribe = onSnapshot(docRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data.lastReset !== todayStr) {
              // Reset for the new day
              setDoc(docRef, {
                userId: user.uid,
                conversionsCount: 0,
                lastReset: todayStr,
                updatedAt: serverTimestamp()
              }, { merge: true }).catch(err => console.warn("Failed to reset limit:", err));
              setConversionsCount(0);
            } else {
              setConversionsCount(data.conversionsCount || 0);
            }
          } else {
            // Initialize for the first time
            setDoc(docRef, {
              userId: user.uid,
              conversionsCount: 0,
              lastReset: todayStr,
              updatedAt: serverTimestamp()
            }).catch(err => console.warn("Failed to create limit:", err));
            setConversionsCount(0);
          }
        }, (error) => {
          console.error("Error reading limits:", error);
        });
      } catch (err) {
        console.error("Failed to initialize limits Module:", err);
      }
    };
    
    initLimits();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    let counter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        counter++;
        setIsDraggingWindow(true);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        counter--;
        if (counter <= 0) {
          counter = 0;
          setIsDraggingWindow(false);
        }
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      counter = 0;
      setIsDraggingWindow(false);

      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const droppedFiles = Array.from(e.dataTransfer.files) as File[];
        setPendingFiles(prev => [...prev, ...droppedFiles]);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  useEffect(() => {
    // Check if ConvertAPI configuration is active on server or client
    const checkTokenStatus = async () => {
      // 1. Check if client-side VITE_ token is available
      const clientSecret = (
        (import.meta as any).env?.VITE_CONVERT_API_PRODUCTION_SECRET ||
        (import.meta as any).env?.VITE_CONVERT_API_SECRET ||
        (import.meta as any).env?.VITE_CONVERTAPI_SECRET ||
        (import.meta as any).env?.VITE_CONVERT_API_TOKEN ||
        (import.meta as any).env?.VITE_CONVERTAPI_TOKEN ||
        (import.meta as any).env?.VITE_CONVERT_API_KEY ||
        ""
      )?.trim();

      if (clientSecret) {
        setHasProductionToken(true);
      }

      // 2. Fetch serverless /api/config status
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const data = await res.json();
          if (data && (data.hasProductionToken || data.configured)) {
            setHasProductionToken(true);
          } else if (!clientSecret) {
            setHasProductionToken(false);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch /api/config:", err);
      }
    };

    checkTokenStatus();
  }, []);

  const handleFilesDrop = (droppedFiles: File[]) => {
    setPendingFiles(prev => [...prev, ...droppedFiles]);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleConvert = async () => {
    if (pendingFiles.length === 0) return;
    
    setIsConverting(true);
    setConversionProgress(0);
    
    try {
      const newFiles: ConvertedFile[] = [];
      const total = pendingFiles.length;

      // Import Firebase dynamically only if user is logged in
      let ref, uploadBytes, getDownloadURL, doc, setDoc, storage, db;
      if (user) {
        const storageModule = await import('firebase/storage');
        ref = storageModule.ref;
        uploadBytes = storageModule.uploadBytes;
        getDownloadURL = storageModule.getDownloadURL;
        
        const firestoreModule = await import('firebase/firestore');
        doc = firestoreModule.doc;
        setDoc = firestoreModule.setDoc;
        
        const firebaseModule = await import('../lib/firebase');
        storage = firebaseModule.storage;
        db = firebaseModule.db;
      }

      for (let i = 0; i < total; i++) {
        const file = pendingFiles[i];
        try {
          const isPremiumCapable = hasProductionToken;
          const currentQuotaCount = conversionsCount + i;
          const usePremium = isPremiumCapable && (currentQuotaCount < dailyLimit);
          const activeMode = usePremium ? 'production' : 'local';

          const converted = await processConversion(file, targetFormat, (fileProgress) => {
            const baseProgress = (i / total) * 100;
            const currentFileProgress = (fileProgress / 100) * (100 / total);
            setConversionProgress(Math.round(baseProgress + currentFileProgress));
          }, activeMode);
          
          // Non-blocking quota increment & background cloud sync
          if (usePremium && user && doc && setDoc && db) {
            import('firebase/firestore').then(({ increment, serverTimestamp }) => {
              setDoc(doc(db, 'userLimits', user.uid), {
                conversionsCount: increment(1),
                updatedAt: serverTimestamp()
              }, { merge: true }).catch(err => console.warn("Quota counter update notice:", err));
            }).catch(console.warn);
          }
          
          const isHeavy = ['pdf', 'docx', 'doc', 'png', 'jpg', 'jpeg'].includes(targetFormat);
          if (isHeavy && user && ref && uploadBytes && getDownloadURL && doc && setDoc && storage && db) {
            const jobId = converted.id;
            const storageRef = ref(storage, `users/${user.uid}/conversions/${jobId}.${targetFormat}`);
            
            // Asynchronously sync to Cloud Storage in background without blocking the UI flow
            uploadBytes(storageRef, converted.blob)
              .then(async () => {
                const downloadUrl = await getDownloadURL(storageRef);
                const { serverTimestamp } = await import('firebase/firestore');
                await setDoc(doc(db, 'conversionJobs', jobId), {
                  ownerId: user.uid,
                  originalName: file.name,
                  targetFormat: targetFormat,
                  status: 'completed',
                  storagePath: downloadUrl,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp()
                });
              })
              .catch(err => console.warn("Background backup notice (non-fatal):", err));
          }
          
          newFiles.push(converted);
        } catch (err: any) {
          console.error(`Conversion error for ${file.name}:`, err);
          alert(`Failed to convert ${file.name}: ${err.message || 'Format not fully supported locally.'}`);
        }
      }
      setFiles(prev => [...newFiles, ...prev]);
      setPendingFiles([]); // Clear queue on success

      if (newFiles.length > 0) {
        confetti({
          particleCount: 80,
          spread: 65,
          origin: { y: 0.7 },
          colors: ['#34d399', '#3b82f6', '#ec4899', '#f59e0b', '#10b981'],
          disableForReducedMotion: true
        });
      }
    } catch (error) {
      console.error('Batch failed:', error);
    } finally {
      setIsConverting(false);
      setConversionProgress(0);
    }
  };

  const handleDownloadComplete = async (downloadedFile: ConvertedFile) => {
    // Remove from UI
    setFiles(prev => prev.filter(f => f.id !== downloadedFile.id));
    
    if (!user) return;
    
    // Automatically delete from Firebase Storage and Firestore
    const isHeavy = ['pdf', 'docx', 'doc', 'png', 'jpg', 'jpeg'].includes(downloadedFile.convertedName.split('.').pop() || '');
    if (isHeavy) {
      try {
        const { ref, deleteObject } = await import('firebase/storage');
        const { doc, deleteDoc } = await import('firebase/firestore');
        const { storage, db } = await import('../lib/firebase');
        
        const ext = downloadedFile.convertedName.split('.').pop();
        const storageRef = ref(storage, `users/${user.uid}/conversions/${downloadedFile.id}.${ext}`);
        
        await deleteObject(storageRef).catch(console.warn);
        await deleteDoc(doc(db, 'conversionJobs', downloadedFile.id)).catch(console.warn);
      } catch (err) {
        console.error("Cleanup failed", err);
      }
    }
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 animate-in fade-in duration-500">
      <div className="lg:col-span-7 flex flex-col gap-4">
        <div className="glass-panel rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className={`w-11 h-11 rounded-full ${iconBgColor} flex items-center justify-center shrink-0 z-10`}>
            <Icon size={22} className={iconColor} />
          </div>
          <div className="text-center sm:text-left z-10">
            <h1 className="text-xl font-bold text-white mb-1 tracking-tight">{title}</h1>
            <p className="text-white/60 text-xs max-w-md">{description}</p>
          </div>
        </div>

        <Dropzone 
          onFilesDrop={handleFilesDrop} 
          accept={acceptHeader}
          multiple={true}
          label={`Drop files to convert to ${targetFormat.toUpperCase()}`}
        />
        
        {/* Pending Files Staging Area */}
        {pendingFiles.length > 0 && (
          <div className="glass-panel rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="font-bold text-white text-base mb-3 flex items-center justify-between">
              <span>Ready to Convert</span>
              <span className="text-[10px] text-white/50 uppercase tracking-widest">{pendingFiles.length} Selected</span>
            </h3>
            <div className="space-y-2">
              {pendingFiles.map((file, idx) => {
                const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
                const sizeStr = file.size > 1024 * 1024 
                  ? `${(file.size / 1024 / 1024).toFixed(2)} MB` 
                  : `${(file.size / 1024).toFixed(1)} KB`;
                return (
                  <div key={`${file.name}-${idx}`} className="flex items-center gap-3 p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 group">
                    <div className="w-9 h-9 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-300 font-bold text-[10px] shrink-0 border border-indigo-500/30 shadow-inner">
                      {ext.substring(0, 4)}
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="font-medium text-white text-xs truncate">{file.name}</div>
                      <div className="text-[10px] text-indigo-200/70">{sizeStr}</div>
                    </div>
                    <button 
                      onClick={() => removePendingFile(idx)}
                      className="p-1.5 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                      title="Remove file"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <ConversionList files={files} isConverting={isConverting} progress={conversionProgress} onDownloadComplete={handleDownloadComplete} />
      </div>

      <aside className="lg:col-span-5 flex flex-col gap-4">
        <div className="glass-panel rounded-2xl p-4 shadow-xl flex-1 flex flex-col">
          <h3 className="text-base font-bold mb-4 flex items-center gap-2 text-white">
            <Icon size={14} className={iconColor} />
            Target Format
          </h3>
          <div className="space-y-4 flex-1">
            <div>
              <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">Convert To</label>
              <div className="grid grid-cols-3 gap-1.5">
                {supportedFormats.map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => setTargetFormat(fmt)}
                    className={`py-2 px-1 rounded-lg text-xs font-bold border transition-all ${
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
            
            {authError ? (
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-200 text-[10px] leading-relaxed mt-2">
                <span className="font-bold flex items-center gap-1.5 mb-1.5">
                  <X size={12} className="text-amber-400" />
                  CLOUD BACKUP DISABLED
                </span>
                {authError} The app will still function, but heavy files will be processed entirely in your local browser memory without cloud backup.
              </div>
            ) : (
              <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-200 text-[10px] leading-relaxed mt-2">
                <span className="font-bold flex items-center gap-1.5 mb-1.5">
                  <Cloud size={12} className="text-blue-400" />
                  CLOUD STORAGE ACTIVE
                </span>
                Heavy files are securely backed up during conversion. No login required (anonymous connection). Files are automatically deleted from the cloud the moment you click download.
              </div>
            )}

            {/* Active Mode Notice Block */}
            {hasProductionToken && conversionsCount < dailyLimit ? (
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-200 text-[10px] leading-relaxed mt-2 flex flex-col gap-1 shadow-inner animate-in fade-in duration-300">
                <span className="font-bold flex items-center gap-1.5 text-emerald-300 uppercase tracking-wider text-[9px]">
                  <ShieldCheck size={12} className="text-emerald-400" />
                  Premium API Mode Active
                </span>
                <p className="text-white/70 text-[9px] leading-relaxed">
                  High-fidelity conversion is running via server-side API. Your files are beautifully rendered in the cloud.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-200 text-[10px] leading-relaxed mt-2 flex flex-col gap-1 shadow-inner animate-in fade-in duration-300">
                <span className="font-bold flex items-center gap-1.5 text-indigo-300 uppercase tracking-wider text-[9px]">
                  <ShieldCheck size={12} className="text-indigo-400" />
                  Local Browser Mode Active
                </span>
                <p className="text-white/60 text-[9px] leading-relaxed">
                  Your files are processed safely in your local browser memory. 100% offline, zero data leaves your device.
                </p>
              </div>
            )}

            {/* Daily Usage Quota Meter */}
            { hasProductionToken && (
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-white/70 text-[10px] leading-relaxed mt-2 flex flex-col gap-2 shadow-inner">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5 text-white/80">
                    <Cloud size={12} className="text-indigo-400" />
                    DAILY PREMIUM LIMIT
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                    conversionsCount >= dailyLimit 
                      ? 'bg-rose-500/20 text-rose-300' 
                      : 'bg-indigo-500/20 text-indigo-300'
                  }`}>
                    {conversionsCount} / {dailyLimit} conversions used
                  </span>
                </div>
                
                {/* Modern clean progress bar */}
                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden border border-white/5">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      conversionsCount >= dailyLimit 
                        ? 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' 
                        : conversionsCount >= dailyLimit - 2 
                        ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                    }`}
                    style={{ width: `${Math.min(100, (conversionsCount / dailyLimit) * 100)}%` }}
                  ></div>
                </div>

                {conversionsCount >= dailyLimit ? (
                  <p className="text-rose-200/90 text-[9px] leading-relaxed mt-0.5 bg-rose-500/5 p-1.5 rounded border border-rose-500/10">
                    <strong>⚠️ Limit Reached:</strong> Premium daily conversions used. Conversions will continue automatically via our robust local engine.
                  </p>
                ) : (
                  <p className="text-white/40 text-[9px] leading-normal">
                    Free premium server-side high-fidelity conversions left today: {dailyLimit - conversionsCount}. Limit resets daily.
                  </p>
                )}
              </div>
            )}
          </div>
          <button 
            onClick={handleConvert}
            disabled={pendingFiles.length === 0 || isConverting}
            className={`glass-button mt-auto w-full py-2.5 text-sm font-bold rounded-xl transition-all ${
              pendingFiles.length === 0 || isConverting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] shadow-[0_0_15px_rgba(99,102,241,0.4)]'
            }`}
          >
            {isConverting ? 'Processing...' : pendingFiles.length > 0 ? `Convert ${pendingFiles.length} File${pendingFiles.length > 1 ? 's' : ''}` : 'Select Files First'}
          </button>
        </div>
      </aside>

      <AnimatePresence>
        {isDraggingWindow && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="w-full max-w-2xl h-96 glass-panel rounded-3xl border-2 border-dashed border-indigo-400/80 bg-indigo-500/10 flex flex-col items-center justify-center text-center p-8 pointer-events-none shadow-[0_0_50px_rgba(99,102,241,0.25)]"
            >
              <div className="w-20 h-20 rounded-full bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center mb-6 text-indigo-300 animate-bounce">
                <Cloud size={40} className="stroke-[1.5]" />
              </div>
              <h2 className="text-2xl font-extrabold text-white mb-2 tracking-tight">
                Drop Files to Upload
              </h2>
              <p className="text-indigo-200/70 text-sm max-w-md leading-relaxed">
                Release your files anywhere on this page to stage them for {title}.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
