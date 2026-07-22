'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CopilotPanel from '@/components/workspace/CopilotPanel';
import { usePathname } from 'next/navigation';

export default function GlobalMobileCopilot() {
  const [showMobileCopilot, setShowMobileCopilot] = useState(false);
  const pathname = usePathname();

  // Optionally hide on the workspace page if it has its own copilot tab, but 
  // global usually means everywhere. We will render it everywhere.

  return (
    <>
      {/* Mobile Copilot FAB */}
      <div className="xl:hidden fixed bottom-24 right-4 z-40">
        <Button
          onClick={() => setShowMobileCopilot(true)}
          className="h-14 w-14 rounded-full shadow-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
        >
          <Sparkles size={24} />
        </Button>
      </div>

      {/* Mobile Copilot Modal */}
      <AnimatePresence>
        {showMobileCopilot && (
          <>
            <motion.div
              className="xl:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 dark:bg-slate-900/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileCopilot(false)}
            />
            <motion.div
              className="xl:hidden fixed inset-0 z-[60] flex flex-col bg-slate-50 dark:bg-slate-950 sm:inset-4 sm:rounded-[24px] sm:border sm:border-slate-200/50 dark:sm:border-slate-800/50 overflow-hidden shadow-2xl"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <CopilotPanel context="dashboard" patientId={null} consultationId={null} triageResult={null} onClose={() => setShowMobileCopilot(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
