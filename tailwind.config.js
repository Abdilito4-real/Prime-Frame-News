/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Georgia', 'Times New Roman', 'serif'],
        sans: ['Inter', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 18px 38px rgba(15, 23, 42, 0.12)',
      },
      colors: {
        ink: '#0f172a',
        paper: '#f8fafc',
        accent: '#c41b1d',
      },
    },
  },
  plugins: [],
}