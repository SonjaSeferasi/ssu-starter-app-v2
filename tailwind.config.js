/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--color-background, 244 247 244) / <alpha-value>)',
        foreground: 'rgb(var(--color-foreground, 25 43 36) / <alpha-value>)',
        card: 'rgb(var(--color-card, 255 255 255) / <alpha-value>)',
        primary: { DEFAULT: 'rgb(30 112 78 / <alpha-value>)', foreground: 'rgb(255 255 255 / <alpha-value>)' },
        muted: { foreground: 'rgb(var(--color-muted, 100 116 108) / <alpha-value>)' },
        border: 'rgb(var(--color-border, 214 224 217) / <alpha-value>)',
        input: 'rgb(var(--color-border, 214 224 217) / <alpha-value>)',
        ring: 'rgb(30 112 78 / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
