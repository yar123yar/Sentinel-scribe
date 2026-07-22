import type { Metadata, Viewport } from 'next';
import { Inter, Geist } from 'next/font/google';
import './globals.css';
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#F8FAFC',
};

export const metadata: Metadata = {
  title: 'ClinicalAI Command Center',
  description: 'AI-Augmented Clinical Triage & Documentation System — Powered by Gemini 2.5 Flash, Google ADK, Qdrant',
  keywords: ['clinical AI', 'medical triage', 'SOAP notes', 'healthcare AI', 'EMR', 'EHR'],
};

import GlobalMobileCopilot from '@/components/GlobalMobileCopilot';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <head>
        <meta name="theme-color" content="#F8FAFC" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme_preference') || 'system';
                  if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-[#F8FAFC] text-[#1E293B] antialiased">
        {children}
        <GlobalMobileCopilot />
      </body>
    </html>
  );
}
