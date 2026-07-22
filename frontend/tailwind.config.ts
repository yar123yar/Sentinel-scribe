import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary:   '#0F4C81',
        action:    '#2A7DE1',
        success:   '#0E9F6E',
        warning:   '#F59E0B',
        emergency: '#DC2626',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '12px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(15, 76, 129, 0.06)',
        DEFAULT: '0 4px 12px rgba(15, 76, 129, 0.08)',
        md: '0 4px 12px rgba(15, 76, 129, 0.08)',
        lg: '0 8px 24px rgba(15, 76, 129, 0.10)',
        xl: '0 20px 40px rgba(15, 76, 129, 0.12)',
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease forwards',
        'spin-slow': 'spin 3s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
