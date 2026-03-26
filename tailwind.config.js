/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        amazon: {
          orange: '#ff9900',
          dark: '#131921',
          navy: '#232f3e',
          light: '#febd69',
        },
      },
    },
  },
  plugins: [],
}
