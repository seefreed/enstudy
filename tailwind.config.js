/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"]
      },
      colors: {
        ink: "var(--ink)",
        panel: "var(--panel)",
        soft: "var(--soft)",
        line: "var(--line)",
        accent: "var(--accent)",
        muted: "var(--muted)",
        base: "var(--base)"
      },
      boxShadow: {
        halo: "0 30px 70px var(--shadow)"
      }
    }
  },
  plugins: []
};
