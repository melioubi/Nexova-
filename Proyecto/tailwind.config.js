/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./*.html', './js/**/*.js'],
  theme: {
    extend: {
      colors: {
        nexova: {
          50: '#eef7f7',
          100: '#d5ecec',
          200: '#aed9da',
          300: '#7fbfbf',
          400: '#4fa0a1',
          500: '#358486',
          600: '#2a6a6c',
          700: '#245658',
          800: '#1f4547',
          900: '#1a393b',
          950: '#0d2223',
        },
        accent: {
          400: '#f59e0b',
          500: '#d97706',
          600: '#b45309',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
