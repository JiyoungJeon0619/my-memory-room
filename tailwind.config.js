/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Gowun Batang', 'Noto Serif KR', 'serif'],
      },
      colors: {
        cream:  '#FAF6EF',
        parchment: '#F2E8D5',
        ink:    '#28200F',
        'ink-mid':  '#5A4A30',
        'ink-soft': '#9A8870',
        'ink-faint':'#C8B898',
        rose:   '#C4826A',
        'rose-pale': '#F0D4C8',
        'rose-soft': '#E8C0AC',
        sage:   '#7A9878',
        'sage-pale': '#C8DCC8',
        gold:   '#C8A060',
        'gold-pale': '#F0DEB8',
      },
    },
  },
  plugins: [],
}
