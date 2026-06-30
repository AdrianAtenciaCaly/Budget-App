/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#15231f',
        paper: '#F6F3EC',
        moss: {
          50: '#eef3ef',
          100: '#d6e3d9',
          300: '#90b39b',
          500: '#3f6b52',
          600: '#2f5440',
          700: '#234032',
          900: '#152419',
        },
        amber: {
          400: '#d99a3d',
          500: '#c2812a',
        },
        clay: '#b85c3e',
        wine: '#7a3b3b',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
