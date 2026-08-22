import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Check if already in standalone PWA mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIos(isIosDevice);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide(true);
    }
  };

  // If already installed or dismissed, return null (or render a subtle installed badge if standalone)
  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-300 text-[9px] font-bold tracking-widest rounded-full border border-emerald-500/20 backdrop-blur-md">
        <CheckCircle2 size={10} className="text-emerald-400" />
        APP INSTALLED
      </div>
    );
  }

  // If neither deferred prompt is available nor iOS, we can still show a responsive Install button
  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 text-indigo-200 hover:text-white text-[10px] font-bold tracking-wider uppercase rounded-full border border-indigo-400/30 backdrop-blur-md transition-all shadow-[0_0_12px_rgba(99,102,241,0.15)] hover:shadow-[0_0_16px_rgba(99,102,241,0.3)] cursor-pointer"
          title="Install as Progressive Web App on your device"
        >
          <Download size={11} className="text-indigo-400" />
          <span>Install App</span>
        </button>
      </div>

      {/* Floating Mirror Glass Install Banner */}
      <AnimatePresence>
        {deferredPrompt && !isDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="w-full mb-4 glass-panel bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.37)] flex items-center justify-between gap-3 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.25)]">
                <Smartphone size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  Install GlassConverter PWA
                  <span className="px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 text-[8px] rounded uppercase font-semibold border border-indigo-500/30">
                    Offline Ready
                  </span>
                </h4>
                <p className="text-[10px] text-white/60">
                  Add to your home screen for quick offline access and standalone window mode.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleInstallClick}
                className="glass-button bg-indigo-500/30 hover:bg-indigo-500/45 border-indigo-400/40 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(99,102,241,0.3)]"
              >
                <Sparkles size={12} className="text-indigo-300" />
                Install
              </button>
              <button
                onClick={() => setIsDismissed(true)}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Installation Instructions Modal */}
      <AnimatePresence>
        {showIosGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-sm glass-panel rounded-2xl border border-indigo-500/30 bg-slate-900/90 p-5 shadow-2xl text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Smartphone size={16} className="text-indigo-400" />
                  Install on iOS
                </h3>
                <button
                  onClick={() => setShowIosGuide(false)}
                  className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-2.5 text-xs text-white/80 leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center text-[10px] shrink-0 border border-indigo-500/30">
                    1
                  </div>
                  <p>
                    Tap the <strong>Share</strong> button in Safari's toolbar at the bottom of the screen.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center text-[10px] shrink-0 border border-indigo-500/30">
                    2
                  </div>
                  <p>
                    Scroll down and tap <strong>"Add to Home Screen"</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center text-[10px] shrink-0 border border-indigo-500/30">
                    3
                  </div>
                  <p>
                    Tap <strong>Add</strong> in the top right corner to install the standalone app.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
                <button
                  onClick={() => setShowIosGuide(false)}
                  className="glass-button bg-indigo-500/20 hover:bg-indigo-500/30 border-indigo-500/30 text-indigo-100 px-4 py-1.5 rounded-xl text-xs font-semibold"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
