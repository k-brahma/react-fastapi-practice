/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // src 以下のファイルを対象に
    "./components/**/*.{js,ts,jsx,tsx}", // components も対象に
    "./pages/**/*.{js,ts,jsx,tsx}", // pages も対象に (もしあれば)
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} 