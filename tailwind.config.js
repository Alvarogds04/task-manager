/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // usa la clase .dark para el tema oscuro
  content: ['./public/index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.06)',
        softHover: '0 2px 8px rgba(0,0,0,.08), 0 10px 24px rgba(0,0,0,.10)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(.2,.8,.2,1)',
      },
    },
  },
  plugins: [],
};
