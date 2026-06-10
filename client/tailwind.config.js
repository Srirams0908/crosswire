/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c0d0ff',
          300: '#91aeff',
          400: '#5a7ef8',
          500: '#2d55e8',
          600: '#1a3ab8',
          700: '#132c96',
          800: '#0e2070',
          900: '#0a1850',
          950: '#060e30'
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706'
        }
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"Sora"', '"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace']
      }
    }
  },
  plugins: []
};
