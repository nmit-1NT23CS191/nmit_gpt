/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        campus: {
          navy: "#0B2447",
          blue: "#19376D",
          accent: "#576CBC",
          light: "#A5D7E8",
        },
      },
    },
  },
  plugins: [],
};
