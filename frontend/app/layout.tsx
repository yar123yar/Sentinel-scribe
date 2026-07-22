import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta name="theme-color" content="#F8FAFC" />
      </head>
      <body className="bg-[#F8FAFC] text-[#1E293B] antialiased">
        {children}
      </body>
    </html>
  );
}
