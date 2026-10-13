/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'rgb(244 247 244 / <alpha-value>)',
        foreground: 'rgb(25 43 36 / <alpha-value>)',
        card: 'rgb(255 255 255 / <alpha-value>)',
        primary: { DEFAULT: 'rgb(30 112 78 / <alpha-value>)', foreground: 'rgb(255 255 255 / <alpha-value>)' },
        muted: { foreground: 'rgb(100 116 108 / <alpha-value>)' },
        border: 'rgb(214 224 217 / <alpha-value>)',
        input: 'rgb(214 224 217 / <alpha-value>)',
        ring: 'rgb(30 112 78 / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
