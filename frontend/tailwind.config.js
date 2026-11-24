/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        abyss: '#060709',
        dossier: '#101318',
        panel: '#161b22',
        paper: '#dfd7c5',
        muted: '#948e80',
        ambercrt: '#d4943a',
        crimson: '#a82929',
        phosphor: '#4d9e6f',
      },
      fontFamily: {
        display: ['Cinzel', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
