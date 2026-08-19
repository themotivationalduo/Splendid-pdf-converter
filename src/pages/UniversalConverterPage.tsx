import { useState, useEffect } from 'react';
import { Dropzone } from '../components/Dropzone';
import { ConversionList } from '../components/ConversionList';
import { processConversion } from '../lib/universal-converter';
import { ConvertedFile } from '../types';
import { LucideIcon, ShieldCheck, X, File as FileIcon, Cloud } from 'lucide-react';
import { auth, loginAnonymously } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

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
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [targetFormat, setTargetFormat] = useState(defaultTarget);
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Automatically authenticate anonymously in the background
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
          const converted = await processConversion(file, targetFormat, (fileProgress) => {
            const baseProgress = (i / total) * 100;
            const currentFileProgress = (fileProgress / 100) * (100 / total);
            setConversionProgress(Math.round(baseProgress + currentFileProgress));
          });
          
          const isHeavy = ['pdf', 'docx', 'doc', 'png', 'jpg', 'jpeg'].includes(targetFormat);
          if (isHeavy && user && ref && uploadBytes && getDownloadURL && doc && setDoc && storage && db) {
            const jobId = converted.id;
            const storageRef = ref(storage, `users/${user.uid}/conversions/${jobId}.${targetFormat}`);
            
            // Upload to Cloud Storage
            await uploadBytes(storageRef, converted.blob);
            const downloadUrl = await getDownloadURL(storageRef);
            
            // Track in Firestore
            await setDoc(doc(db, 'conversionJobs', jobId), {
              ownerId: user.uid,
              originalName: file.name,
              targetFormat: targetFormat,
              status: 'completed',
              storagePath: downloadUrl,
              createdAt: Date.now(),
              updatedAt: Date.now()
            });
            
            // Note: We keep the blob URL for the immediate local download, 
            // but we tracked it in Firebase for heavy processing backup.
          }
          
          newFiles.push(converted);
        } catch (err: any) {
          alert(`Failed to convert ${file.name}: ${err.message || 'Format not fully supported locally.'}`);
        }
      }
      setFiles(prev => [...newFiles, ...prev]);
      setPendingFiles([]); // Clear queue on success
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
    </div>
  );
}
