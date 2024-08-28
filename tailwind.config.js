/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      textShadow: {
        custom:
          "0 0 10px #db1102, 0 0 20px #f2581f, 0 0 50px #f2581f, 0 0 50px rgba(255, 50, 50, 0.25)",
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        ".text-shadow-custom": {
          textShadow:
            "0 0 10px #db1102, 0 0 20px #f2581f, 0 0 50px #f2581f, 0 0 50px rgba(255, 50, 50, 0.25)",
        },
      });
    },
  ],
};
