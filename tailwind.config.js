/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './constants.ts',
    './components/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        slate: {
          150: '#eaeef4',
          250: '#d7dfe9',
          350: '#b0bfcf',
          705: '#314155',
          850: '#152033',
        },
        gray: {
          150: '#eceef1',
          450: '#808896',
        },
        blue: {
          850: '#172e6e',
        },
        red: {
          650: '#cf2027',
        },
        emerald: {
          55: '#e8faf2',
          250: '#8ce9c0',
        },
        amber: {
          250: '#fcd97d',
        },
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.22s ease-out',
        'scale-in': 'scaleIn 0.18s ease-out',
      },
    },
  },
  plugins: [],
};
