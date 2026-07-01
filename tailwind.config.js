/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink:     'rgb(var(--color-ink)     / <alpha-value>)',
        paper:   'rgb(var(--color-paper)   / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        moss: {
          50:  'rgb(var(--color-moss-50)  / <alpha-value>)',
          100: 'rgb(var(--color-moss-100) / <alpha-value>)',
          300: 'rgb(var(--color-moss-300) / <alpha-value>)',
          500: 'rgb(var(--color-moss-500) / <alpha-value>)',
          600: 'rgb(var(--color-moss-600) / <alpha-value>)',
          700: 'rgb(var(--color-moss-700) / <alpha-value>)',
          900: 'rgb(var(--color-moss-900) / <alpha-value>)',
        },
        amber: {
          400: 'rgb(var(--color-amber-400) / <alpha-value>)',
          500: 'rgb(var(--color-amber-500) / <alpha-value>)',
        },
        clay: 'rgb(var(--color-clay) / <alpha-value>)',
        wine: 'rgb(var(--color-wine) / <alpha-value>)',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body:    ['"Inter"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}