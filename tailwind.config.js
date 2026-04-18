/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  safelist: [
    'md:w-64', 'md:flex-row', 'xl:grid-cols-4',
    'bg-[#13131f]', 'border-[rgba(255,255,255,0.07)]', 'text-[#9d9db5]', 'hover:border-[#f5a623]', 'hover:text-[#e8e8ef]',
    'bg-[#f5a623]/10', 'border-[#f5a623]', 'text-[#f5a623]'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
